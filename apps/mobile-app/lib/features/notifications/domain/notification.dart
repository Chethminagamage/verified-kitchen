import 'package:flutter/material.dart';

import '../../../core/theme/tone.dart';

/// What a customer notification is about (database enum public.notification_kind).
enum NotificationKind {
  gradeChanged('grade_changed', Icons.verified_outlined),
  orderHygieneChanged('order_hygiene_changed', Icons.receipt_long_outlined),
  verificationChanged('verification_changed', Icons.shield_outlined),
  weeklySummary('weekly_summary', Icons.calendar_month_outlined);

  const NotificationKind(this.value, this.icon);

  final String value;
  final IconData icon;

  static NotificationKind parse(String? value) =>
      values.where((k) => k.value == value).firstOrNull ?? NotificationKind.verificationChanged;
}

/// One entry of the customer's inbox: a hygiene alert or the weekly summary.
/// Built by the database from the public rating only.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.kitchenId,
    required this.orderId,
    required this.createdAt,
    required this.readAt,
  });

  final String id;
  final NotificationKind kind;
  final String title;
  final String body;
  final String? kitchenId;
  final String? orderId;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isRead => readAt != null;

  /// An alert about an order in progress stands out; the rest read as normal news.
  Tone get tone => kind == NotificationKind.orderHygieneChanged ? Tone.warning : Tone.ink;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
    id: json['id'] as String,
    kind: NotificationKind.parse(json['kind'] as String?),
    title: json['title'] as String,
    body: json['body'] as String,
    kitchenId: json['kitchen_id'] as String?,
    orderId: json['order_id'] as String?,
    createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
    readAt: json['read_at'] == null ? null : DateTime.parse(json['read_at'] as String).toLocal(),
  );
}

/// Where tapping a notification (in the inbox or on the phone) takes the customer:
/// their order when it is about an order in progress, else the kitchen, else the inbox.
NotificationTarget targetOf({String? orderId, String? kitchenId}) {
  if (orderId != null && orderId.isNotEmpty) return NotificationTarget.order(orderId);
  if (kitchenId != null && kitchenId.isNotEmpty) return NotificationTarget.kitchen(kitchenId);
  return const NotificationTarget.inbox();
}

sealed class NotificationTarget {
  const NotificationTarget();
  const factory NotificationTarget.order(String id) = OrderTarget;
  const factory NotificationTarget.kitchen(String id) = KitchenTarget;
  const factory NotificationTarget.inbox() = InboxTarget;
}

class OrderTarget extends NotificationTarget {
  const OrderTarget(this.id);
  final String id;
}

class KitchenTarget extends NotificationTarget {
  const KitchenTarget(this.id);
  final String id;
}

class InboxTarget extends NotificationTarget {
  const InboxTarget();
}

/// The customer's choices (defaults: everything on).
class NotificationSettings {
  const NotificationSettings({this.hygieneAlerts = true, this.weeklySummary = true});

  final bool hygieneAlerts;
  final bool weeklySummary;

  NotificationSettings copyWith({bool? hygieneAlerts, bool? weeklySummary}) => NotificationSettings(
    hygieneAlerts: hygieneAlerts ?? this.hygieneAlerts,
    weeklySummary: weeklySummary ?? this.weeklySummary,
  );

  factory NotificationSettings.fromJson(Map<String, dynamic>? json) => NotificationSettings(
    hygieneAlerts: (json?['hygiene_alerts'] as bool?) ?? true,
    weeklySummary: (json?['weekly_summary'] as bool?) ?? true,
  );
}
