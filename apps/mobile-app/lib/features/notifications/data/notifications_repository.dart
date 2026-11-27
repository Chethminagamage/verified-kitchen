import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/errors.dart';
import '../domain/notification.dart';

/// The customer's inbox, notification settings and registered phones.
/// Row Level Security limits every query to the signed-in customer.
class NotificationsRepository {
  NotificationsRepository(this._client);
  final SupabaseClient _client;

  static const _columns = 'id, kind, title, body, kitchen_id, order_id, created_at, read_at';

  Future<List<AppNotification>> latest({int limit = 50}) async {
    final rows = await _client
        .from('customer_notifications')
        .select(_columns)
        .order('created_at', ascending: false) // newest first
        .limit(limit);
    return [for (final r in rows) AppNotification.fromJson(r)];
  }

  /// Emits whenever a new notification arrives for [userId] (Supabase Realtime).
  Stream<AppNotification> arrivals(String userId) {
    late final RealtimeChannel channel;
    final controller = StreamController<AppNotification>(onCancel: () => _client.removeChannel(channel));
    channel = _client
        .channel('notifications-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'customer_notifications',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'user_id', value: userId),
          callback: (payload) {
            try {
              controller.add(AppNotification.fromJson(payload.newRecord));
            } catch (_) {
              // A malformed event is ignored; the next list load is authoritative.
            }
          },
        )
        .subscribe();
    return controller.stream;
  }

  Future<void> markRead(String id) async {
    try {
      await _client
          .from('customer_notifications')
          .update({'read_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', id)
          .isFilter('read_at', null);
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  Future<void> markAllRead() async {
    try {
      await _client.rpc<void>('mark_all_notifications_read');
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  Future<NotificationSettings> settings() async {
    final row = await _client.from('notification_settings').select('hygiene_alerts, weekly_summary').maybeSingle();
    return NotificationSettings.fromJson(row);
  }

  Future<void> saveSettings(NotificationSettings s) async {
    try {
      await _client.from('notification_settings').upsert({
        'hygiene_alerts': s.hygieneAlerts,
        'weekly_summary': s.weeklySummary,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  /// Links this phone to the signed-in customer (moves it from anyone who used it before).
  Future<void> registerPushToken(String token, {required String platform}) =>
      _client.rpc<void>('register_push_token', params: {'p_token': token, 'p_platform': platform});

  Future<void> unregisterPushToken(String token) =>
      _client.rpc<void>('unregister_push_token', params: {'p_token': token});
}
