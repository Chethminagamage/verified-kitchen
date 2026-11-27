import 'dart:async';

import 'package:flutter/widgets.dart' show AppLifecycleListener;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/router/routes.dart';
import '../../../core/supabase/supabase_providers.dart';
import '../../auth/presentation/auth_flow_providers.dart';
import '../data/notifications_repository.dart';
import '../data/push_service.dart';
import '../domain/notification.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsRepository(ref.watch(supabaseClientProvider)),
);

/// Firebase on Android; overridden with [NoPushService] in tests.
final pushServiceProvider = Provider<PushService>((ref) => FirebasePushService());

/// New notifications as they arrive (used for the inbox and an in-app banner).
final notificationArrivalsProvider = StreamProvider<AppNotification>((ref) {
  final userId = ref.watch(currentUserProvider.select((u) => u?.id));
  if (userId == null) return const Stream.empty();
  return ref.watch(notificationsRepositoryProvider).arrivals(userId);
});

/// The inbox, newest first, kept current by Realtime.
class InboxNotifier extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    final userId = ref.watch(currentUserProvider.select((u) => u?.id));
    if (userId == null) return const [];
    // Live updates pause while the app is in the background, so catch up on return.
    final lifecycle = AppLifecycleListener(onResume: ref.invalidateSelf);
    ref.onDispose(lifecycle.dispose);
    ref.listen(notificationArrivalsProvider, (_, next) {
      final n = next.value;
      final current = state.value;
      if (n != null && current != null && current.every((c) => c.id != n.id)) state = AsyncData([n, ...current]);
    });
    return ref.watch(notificationsRepositoryProvider).latest();
  }

  Future<void> markRead(String id) async {
    final current = state.value ?? const [];
    final now = DateTime.now();
    state = AsyncData([
      for (final n in current)
        n.id == id && !n.isRead
            ? AppNotification(
                id: n.id,
                kind: n.kind,
                title: n.title,
                body: n.body,
                kitchenId: n.kitchenId,
                orderId: n.orderId,
                createdAt: n.createdAt,
                readAt: now,
              )
            : n,
    ]);
    await ref.read(notificationsRepositoryProvider).markRead(id);
  }

  Future<void> markAllRead() async {
    await ref.read(notificationsRepositoryProvider).markAllRead();
    ref.invalidateSelf();
  }
}

final inboxProvider = AsyncNotifierProvider<InboxNotifier, List<AppNotification>>(InboxNotifier.new);

final unreadCountProvider = Provider<int>(
  (ref) => (ref.watch(inboxProvider).value ?? const []).where((n) => !n.isRead).length,
);

/// The customer's notification choices.
class NotificationSettingsNotifier extends AsyncNotifier<NotificationSettings> {
  @override
  Future<NotificationSettings> build() {
    ref.watch(currentUserProvider.select((u) => u?.id));
    return ref.watch(notificationsRepositoryProvider).settings();
  }

  Future<void> save(NotificationSettings settings) async {
    final previous = state.value;
    state = AsyncData(settings);
    try {
      await ref.read(notificationsRepositoryProvider).saveSettings(settings);
    } catch (e) {
      if (previous != null) state = AsyncData(previous);
      rethrow;
    }
  }
}

final notificationSettingsProvider = AsyncNotifierProvider<NotificationSettingsNotifier, NotificationSettings>(
  NotificationSettingsNotifier.new,
);

/// Links this phone to the signed-in customer for push, and opens the right
/// screen when a notification is tapped. Kept alive by the app shell.
class PushRegistration extends Notifier<void> {
  final _subscriptions = <StreamSubscription<Object?>>[];
  String? _token;

  @override
  void build() {
    final userId = ref.watch(currentUserProvider.select((u) => u?.id));
    ref.onDispose(() {
      for (final s in _subscriptions) {
        s.cancel();
      }
      _subscriptions.clear();
    });
    if (userId != null) unawaited(_start());
  }

  PushService get _push => ref.read(pushServiceProvider);
  NotificationsRepository get _repository => ref.read(notificationsRepositoryProvider);

  Future<void> _start() async {
    if (!await _push.start()) return;
    await _register(await _push.token());
    _subscriptions
      ..add(_push.tokenRefreshes.listen(_register))
      ..add(_push.taps.listen(open));
    // The notification that launched the app is reported again after a restart:
    // open it once only.
    final initial = await _push.initialTap();
    final prefs = ref.read(sharedPreferencesProvider);
    if (initial != null && initial.notificationId != prefs.getString(_lastOpenedKey)) open(initial);
  }

  static const _lastOpenedKey = 'push_last_opened_v1';

  Future<void> _register(String? token) async {
    if (token == null) return;
    _token = token;
    try {
      await _repository.registerPushToken(token, platform: _push.platform);
    } catch (_) {
      // Offline: the token is registered again on the next start.
    }
  }

  /// Asks for notification permission at a moment that explains itself (after
  /// adding a favourite, placing an order, or turning alerts on). Never on launch.
  Future<bool> askPermission() async => await _push.start() && await _push.requestPermission();

  /// Called before signing out, so this phone stops receiving the customer's alerts.
  Future<void> unregister() async {
    final token = _token ?? await _push.token();
    if (token == null) return;
    try {
      await _repository.unregisterPushToken(token);
    } catch (_) {
      // Best effort: the sender also drops tokens that stop working.
    }
  }

  /// Opens what a tapped notification is about and marks it read.
  void open(PushTap tap) {
    ref.invalidate(inboxProvider); // it arrived while the app was in the background
    final id = tap.notificationId;
    if (id != null) unawaited(ref.read(sharedPreferencesProvider).setString(_lastOpenedKey, id));
    if (id != null && id.isNotEmpty) unawaited(ref.read(inboxProvider.notifier).markRead(id).catchError((_) {}));
    openTarget(ref.read(routerProvider), tap.target);
  }
}

final pushRegistrationProvider = NotifierProvider<PushRegistration, void>(PushRegistration.new);

void openTarget(GoRouter router, NotificationTarget target) {
  switch (target) {
    case OrderTarget(:final id):
      router.push(Routes.order(id));
    case KitchenTarget(:final id):
      router.push(Routes.kitchen(id));
    case InboxTarget():
      router.push(Routes.notifications);
  }
}
