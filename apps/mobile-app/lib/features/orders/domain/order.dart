import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../kitchens/domain/hygiene.dart';

/// Order lifecycle (database enum public.order_status).
enum OrderStatus {
  placed(
    'Order placed',
    'Waiting for the kitchen to accept',
    Icons.receipt_long_rounded,
  ),
  accepted(
    'Accepted',
    'The kitchen has accepted your order',
    Icons.thumb_up_alt_rounded,
  ),
  preparing(
    'Preparing',
    'Your food is being prepared',
    Icons.soup_kitchen_rounded,
  ),
  onTheWay(
    'On the way',
    'Your order is on its way',
    Icons.delivery_dining_rounded,
  ),
  delivered('Delivered', 'Enjoy your meal', Icons.check_circle_rounded),
  cancelled('Cancelled', 'This order was cancelled', Icons.cancel_rounded);

  const OrderStatus(this.label, this.description, this.icon);

  final String label;
  final String description;
  final IconData icon;

  static OrderStatus parse(String value) => switch (value) {
    'placed' => placed,
    'accepted' => accepted,
    'preparing' => preparing,
    'on_the_way' => onTheWay,
    'delivered' => delivered,
    'cancelled' => cancelled,
    _ => throw FormatException('unknown order status $value'),
  };

  /// Steps shown on the tracking timeline (cancelled is shown separately).
  static const List<OrderStatus> progress = [
    placed,
    accepted,
    preparing,
    onTheWay,
    delivered,
  ];

  bool get isActive => this != delivered && this != cancelled;

  Color get color => switch (this) {
    delivered => AppColors.success,
    cancelled => AppColors.danger,
    _ => AppColors.ink,
  };
}

class OrderLine {
  const OrderLine({
    required this.name,
    required this.unitPriceLkr,
    required this.quantity,
    required this.lineTotalLkr,
  });

  final String name;
  final double unitPriceLkr;
  final int quantity;
  final double lineTotalLkr;

  factory OrderLine.fromJson(Map<String, dynamic> json) => OrderLine(
    name: json['name'] as String,
    unitPriceLkr: (json['unit_price_lkr'] as num).toDouble(),
    quantity: (json['quantity'] as num).toInt(),
    lineTotalLkr: (json['line_total_lkr'] as num).toDouble(),
  );
}

class CustomerOrder {
  const CustomerOrder({
    required this.id,
    required this.kitchenId,
    required this.status,
    required this.deliveryAddress,
    required this.contactPhone,
    required this.note,
    required this.subtotalLkr,
    required this.deliveryFeeLkr,
    required this.totalLkr,
    required this.gradeAtOrder,
    required this.hygieneStatusAtOrder,
    required this.placedAt,
    required this.timestamps,
    required this.cancelledBy,
    required this.lines,
  });

  final String id;
  final String kitchenId;
  final OrderStatus status;
  final String deliveryAddress;
  final String contactPhone;
  final String? note;
  final double subtotalLkr;
  final double deliveryFeeLkr;
  final double totalLkr;
  final HygieneGrade? gradeAtOrder;
  final HygieneStatus hygieneStatusAtOrder;
  final DateTime placedAt;

  /// When each step was reached (placed, accepted, ...).
  final Map<OrderStatus, DateTime> timestamps;
  final String? cancelledBy;
  final List<OrderLine> lines;

  /// The customer may cancel only before the kitchen accepts (same rule as the database).
  bool get canCancel => status == OrderStatus.placed;

  int get itemCount => lines.fold(0, (n, l) => n + l.quantity);

  /// Short reference shown to the customer and the kitchen (#A1B2C3).
  String get reference =>
      '#${id.replaceAll('-', '').substring(0, 6).toUpperCase()}';

  factory CustomerOrder.fromJson(Map<String, dynamic> json) {
    DateTime? ts(String key) => json[key] == null
        ? null
        : DateTime.parse(json[key] as String).toLocal();
    final stamps = <OrderStatus, DateTime>{
      for (final (status, key) in [
        (OrderStatus.placed, 'placed_at'),
        (OrderStatus.accepted, 'accepted_at'),
        (OrderStatus.preparing, 'preparing_at'),
        (OrderStatus.onTheWay, 'on_the_way_at'),
        (OrderStatus.delivered, 'delivered_at'),
        (OrderStatus.cancelled, 'cancelled_at'),
      ])
        if (ts(key) != null) status: ts(key)!,
    };
    final items = (json['order_items'] as List<dynamic>? ?? const [])
        .map((e) => OrderLine.fromJson(e as Map<String, dynamic>))
        .toList();
    return CustomerOrder(
      id: json['id'] as String,
      kitchenId: json['kitchen_id'] as String,
      status: OrderStatus.parse(json['status'] as String),
      deliveryAddress: json['delivery_address'] as String,
      contactPhone: json['contact_phone'] as String,
      note: json['note'] as String?,
      subtotalLkr: (json['subtotal_lkr'] as num).toDouble(),
      deliveryFeeLkr: (json['delivery_fee_lkr'] as num).toDouble(),
      totalLkr: (json['total_lkr'] as num).toDouble(),
      gradeAtOrder: HygieneGrade.parse(
        json['hygiene_grade_at_order'] as String?,
      ),
      hygieneStatusAtOrder: HygieneStatus.parse(
        json['hygiene_status_at_order'] as String?,
      ),
      placedAt: ts('placed_at')!,
      timestamps: stamps,
      cancelledBy: json['cancelled_by'] as String?,
      lines: items,
    );
  }
}

/// Problems a customer can report about a delivered order (database check).
enum OrderProblem {
  late('late', 'Arrived late'),
  cold('cold', 'Food was cold'),
  wrongItems('wrong_items', 'Wrong items'),
  missingItems('missing_items', 'Missing items'),
  hygieneConcern('hygiene_concern', 'Hygiene concern'),
  other('other', 'Something else');

  const OrderProblem(this.value, this.label);

  final String value;
  final String label;

  static OrderProblem? parse(String? value) =>
      values.where((p) => p.value == value).firstOrNull;
}

class OrderFeedback {
  const OrderFeedback({
    required this.rating,
    required this.problem,
    required this.comment,
  });

  final int? rating;
  final OrderProblem? problem;
  final String? comment;

  factory OrderFeedback.fromJson(Map<String, dynamic> json) => OrderFeedback(
    rating: (json['rating'] as num?)?.toInt(),
    problem: OrderProblem.parse(json['problem'] as String?),
    comment: json['comment'] as String?,
  );
}
