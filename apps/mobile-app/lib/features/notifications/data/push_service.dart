import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../domain/notification.dart';

/// What the app needs from push delivery, so screens and tests do not depend on Firebase.
abstract class PushService {
  /// Prepares push; false when this device or build cannot receive pushes
  /// (iPhone without a paid Apple push key, or no Firebase config). The in-app
  /// inbox works either way.
  Future<bool> start();

  /// This install's push token (null when unavailable).
  Future<String?> token();

  Stream<String> get tokenRefreshes;

  /// Asks the customer for permission to show notifications (Android 13+). True when allowed.
  Future<bool> requestPermission();

  /// Whether notifications are currently allowed for this app.
  Future<bool> isAllowed();

  /// The notification that launched the app from closed, if any.
  Future<PushTap?> initialTap();

  /// Notifications tapped while the app was in the background.
  Stream<PushTap> get taps;

  String get platform;
}

/// A tapped phone notification: which inbox entry, and where to go.
class PushTap {
  const PushTap({required this.notificationId, required this.target});
  final String? notificationId;
  final NotificationTarget target;

  static PushTap fromData(Map<String, dynamic> data) => PushTap(
    notificationId: data['notification_id'] as String?,
    target: targetOf(orderId: data['order_id'] as String?, kitchenId: data['kitchen_id'] as String?),
  );
}

/// Firebase Cloud Messaging on Android (Firebase is only the delivery channel; data stays in Supabase).
class FirebasePushService implements PushService {
  bool _ready = false;

  @override
  String get platform => Platform.isIOS ? 'ios' : 'android';

  @override
  Future<bool> start() async {
    if (_ready) return true;
    // iPhone push needs a paid Apple Developer account, so this build uses the inbox there.
    if (!Platform.isAndroid) return false;
    try {
      await Firebase.initializeApp();
      _ready = true;
    } catch (_) {
      _ready = false; // no google-services.json in this build
    }
    return _ready;
  }

  // Registration tokens are what the server sends to (FCM HTTP v1 `message.token`).
  // firebase_messaging 17 also offers newer installation-ID (FID) registration; it
  // can replace these once the sender targets FIDs. Tokens remain fully supported.
  @override
  // ignore: deprecated_member_use
  Future<String?> token() async => _ready ? FirebaseMessaging.instance.getToken() : null;

  @override
  Stream<String> get tokenRefreshes =>
      // ignore: deprecated_member_use
      _ready ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  @override
  Future<bool> requestPermission() async {
    if (!_ready) return false;
    final settings = await FirebaseMessaging.instance.requestPermission();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<bool> isAllowed() async {
    if (!_ready) return false;
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<PushTap?> initialTap() async {
    if (!_ready) return null;
    final message = await FirebaseMessaging.instance.getInitialMessage();
    return message == null ? null : PushTap.fromData(message.data);
  }

  @override
  Stream<PushTap> get taps =>
      _ready ? FirebaseMessaging.onMessageOpenedApp.map((m) => PushTap.fromData(m.data)) : const Stream.empty();
}

/// No push on this device (iPhone in this build, tests): the inbox still works.
class NoPushService implements PushService {
  const NoPushService();

  @override
  String get platform => 'android';
  @override
  Future<bool> start() async => false;
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
  @override
  Future<bool> requestPermission() async => false;
  @override
  Future<bool> isAllowed() async => false;
  @override
  Future<PushTap?> initialTap() async => null;
  @override
  Stream<PushTap> get taps => const Stream.empty();
}
