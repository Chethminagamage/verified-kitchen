import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:verified_kitchen_app/core/supabase/supabase_providers.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/presentation/auth_flow_providers.dart';
import 'package:verified_kitchen_app/features/notifications/data/notifications_repository.dart';
import 'package:verified_kitchen_app/features/notifications/data/push_service.dart';
import 'package:verified_kitchen_app/features/notifications/domain/notification.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/notification_providers.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/pages/notification_settings_page.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/pages/notifications_page.dart';

Map<String, dynamic> row(String id, {String kind = 'grade_changed', String? orderId, String? readAt}) => {
  'id': id,
  'kind': kind,
  'title': 'Hygiene grade dropped: Pizza Place',
  'body': 'Pizza Place went from grade B to C over the past week.',
  'kitchen_id': 'k1',
  'order_id': orderId,
  'created_at': '2026-11-28T06:00:00Z',
  'read_at': readAt,
};

/// Stands in for Supabase: an in-memory inbox, settings and registered phones.
class FakeRepository implements NotificationsRepository {
  FakeRepository(this.items);
  List<AppNotification> items;
  NotificationSettings saved = const NotificationSettings();
  final tokens = <String>{};
  final arrivalsController = StreamController<AppNotification>.broadcast();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<AppNotification>> latest({int limit = 50}) async => items;
  @override
  Stream<AppNotification> arrivals(String userId) => arrivalsController.stream;
  @override
  Future<void> markRead(String id) async {}
  @override
  Future<void> markAllRead() async {
    items = [
      for (final n in items) AppNotification.fromJson({...row(n.id), 'read_at': '2026-11-28T07:00:00Z'}),
    ];
  }

  @override
  Future<NotificationSettings> settings() async => saved;
  @override
  Future<void> saveSettings(NotificationSettings s) async => saved = s;
  @override
  Future<void> registerPushToken(String token, {required String platform}) async => tokens.add(token);
  @override
  Future<void> unregisterPushToken(String token) async => tokens.remove(token);
}

class FakePush implements PushService {
  int permissionRequests = 0;
  final tapController = StreamController<PushTap>.broadcast();

  @override
  String get platform => 'android';
  @override
  Future<bool> start() async => true;
  @override
  Future<String?> token() async => 'phone-token-0001';
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Future<bool> requestPermission() async {
    permissionRequests++;
    return true;
  }

  @override
  Future<bool> isAllowed() async => true;
  PushTap? initial;
  @override
  Future<PushTap?> initialTap() async => initial;
  @override
  Stream<PushTap> get taps => tapController.stream;
}

final customer = User(id: 'u1', appMetadata: const {}, userMetadata: const {}, aud: 'authenticated', createdAt: '');

void main() {
  group('notification data', () {
    test('reads an inbox entry; unknown kinds are handled safely', () {
      final n = AppNotification.fromJson(row('n1'));
      expect(n.kind, NotificationKind.gradeChanged);
      expect(n.isRead, isFalse);
      expect(NotificationKind.parse('something-new'), NotificationKind.verificationChanged);
    });

    test('a tap opens the order when there is one, else the kitchen, else the inbox', () {
      expect(targetOf(orderId: 'o1', kitchenId: 'k1'), isA<OrderTarget>());
      expect(targetOf(kitchenId: 'k1'), isA<KitchenTarget>());
      expect(targetOf(orderId: '', kitchenId: ''), isA<InboxTarget>());
      final tap = PushTap.fromData({'notification_id': 'n1', 'kitchen_id': 'k1', 'order_id': ''});
      expect((tap.target as KitchenTarget).id, 'k1');
      expect(tap.notificationId, 'n1');
    });

    test('settings default to everything on', () {
      final s = NotificationSettings.fromJson(null);
      expect(s.hygieneAlerts, isTrue);
      expect(s.weeklySummary, isTrue);
      expect(NotificationSettings.fromJson({'hygiene_alerts': false}).hygieneAlerts, isFalse);
    });

    test('an alert during an order stands out', () {
      expect(AppNotification.fromJson(row('n1', kind: 'order_hygiene_changed')).tone.name, 'warning');
      expect(AppNotification.fromJson(row('n2')).tone.name, 'ink');
    });
  });

  late SharedPreferences prefs;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  ProviderContainer containerWith(FakeRepository repo, FakePush push) {
    final c = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        currentUserProvider.overrideWithValue(customer),
        notificationsRepositoryProvider.overrideWithValue(repo),
        pushServiceProvider.overrideWithValue(push),
      ],
    );
    addTearDown(c.dispose);
    return c;
  }

  group('push registration', () {
    test('links the phone on sign-in and unlinks it before sign-out', () async {
      final repo = FakeRepository([]);
      final c = containerWith(repo, FakePush());
      c.read(pushRegistrationProvider);
      await pumpEventQueue();
      expect(repo.tokens, {'phone-token-0001'});
      await c.read(pushRegistrationProvider.notifier).unregister();
      expect(repo.tokens, isEmpty);
    });

    test('permission is asked only when the app asks for it, never on its own', () async {
      final push = FakePush();
      final c = containerWith(FakeRepository([]), push);
      c.read(pushRegistrationProvider);
      await pumpEventQueue();
      expect(push.permissionRequests, 0);
      expect(await c.read(pushRegistrationProvider.notifier).askPermission(), isTrue);
      expect(push.permissionRequests, 1);
    });
  });

  test('the notification that launched the app is opened only once, even after a restart', () async {
    final tap = PushTap.fromData({'notification_id': 'n1', 'kitchen_id': 'k1'});
    await prefs.setString('push_last_opened_v1', 'n1');
    final push = FakePush()..initial = tap;
    final c = containerWith(FakeRepository([]), push);
    c.read(pushRegistrationProvider);
    await pumpEventQueue();
    expect(prefs.getString('push_last_opened_v1'), 'n1'); // unchanged: not opened again
  });

  group('inbox', () {
    Future<(FakeRepository, ProviderContainer)> pumpInbox(WidgetTester tester, List<Map<String, dynamic>> rows) async {
      final repo = FakeRepository([for (final r in rows) AppNotification.fromJson(r)]);
      final c = containerWith(repo, FakePush());
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: c,
          child: MaterialApp(theme: AppTheme.light, home: const NotificationsPage()),
        ),
      );
      await tester.pumpAndSettle();
      return (repo, c);
    }

    testWidgets('shows alerts with the unread count, and marks all read', (tester) async {
      final (_, c) = await pumpInbox(tester, [row('n1'), row('n2', readAt: '2026-11-28T07:00:00Z')]);
      expect(find.text('Hygiene grade dropped: Pizza Place'), findsNWidgets(2));
      expect(c.read(unreadCountProvider), 1);
      await tester.tap(find.byTooltip('Mark all read'));
      await tester.pumpAndSettle();
      expect(c.read(unreadCountProvider), 0);
      expect(find.byTooltip('Mark all read'), findsNothing);
    });

    testWidgets('a new alert appears live at the top', (tester) async {
      final (repo, c) = await pumpInbox(tester, [row('n1', readAt: '2026-11-28T07:00:00Z')]);
      repo.arrivalsController.add(
        AppNotification.fromJson({...row('n9'), 'title': 'Green Bowl is now Verified', 'kind': 'verification_changed'}),
      );
      await tester.pumpAndSettle();
      expect(find.text('Green Bowl is now Verified'), findsOneWidget);
      expect(c.read(unreadCountProvider), 1);
    });

    testWidgets('an empty inbox explains what will arrive', (tester) async {
      await pumpInbox(tester, []);
      expect(find.text('No notifications yet'), findsOneWidget);
    });
  });

  testWidgets('settings: turning alerts off is saved; turning them on asks the phone for permission', (tester) async {
    final repo = FakeRepository([]);
    final push = FakePush();
    final c = containerWith(repo, push);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: c,
        child: MaterialApp(theme: AppTheme.light, home: const NotificationSettingsPage()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hygiene alerts'));
    await tester.pumpAndSettle();
    expect(repo.saved.hygieneAlerts, isFalse);
    expect(push.permissionRequests, 0);

    await tester.tap(find.text('Hygiene alerts'));
    await tester.pumpAndSettle();
    expect(repo.saved.hygieneAlerts, isTrue);
    expect(push.permissionRequests, 1);
    expect(find.textContaining('never include staff, camera images'), findsOneWidget);
  });
}
