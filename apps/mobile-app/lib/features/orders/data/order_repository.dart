import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/errors.dart';
import '../../cart/domain/cart.dart';
import '../domain/order.dart';

/// Orders of the signed-in customer. Row Level Security returns only their
/// own orders; placing and cancelling go through server functions that
/// validate everything (prices come from the database, never from the phone).
class OrderRepository {
  OrderRepository(this._client);
  final SupabaseClient _client;

  static const _select =
      'id, kitchen_id, status, delivery_address, contact_phone, note, subtotal_lkr, delivery_fee_lkr, total_lkr, '
      'hygiene_grade_at_order, hygiene_status_at_order, placed_at, accepted_at, preparing_at, on_the_way_at, '
      'delivered_at, cancelled_at, cancelled_by, order_items(name, unit_price_lkr, quantity, line_total_lkr)';

  Future<List<CustomerOrder>> myOrders() async {
    final rows = await _client
        .from('orders')
        .select(_select)
        .order('placed_at', ascending: false)
        .limit(50);
    return [for (final r in rows) CustomerOrder.fromJson(r)];
  }

  Future<CustomerOrder?> order(String id) async {
    final row = await _client
        .from('orders')
        .select(_select)
        .eq('id', id)
        .maybeSingle();
    return row == null ? null : CustomerOrder.fromJson(row);
  }

  /// Returns the new order's id.
  Future<String> place({
    required Cart cart,
    required String deliveryAddress,
    required String contactPhone,
    String? note,
  }) async {
    try {
      final id = await _client.rpc<String>(
        'place_order',
        params: {
          'p_kitchen': cart.kitchenId,
          'p_items': cart.toOrderItems(),
          'p_delivery_address': deliveryAddress,
          'p_contact_phone': contactPhone,
          'p_note': (note == null || note.trim().isEmpty) ? null : note.trim(),
        },
      );
      return id;
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  Future<void> cancel(String orderId) async {
    try {
      await _client.rpc<String>('cancel_order', params: {'p_order': orderId});
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  /// The customer's own feedback on an order, or null if none yet.
  Future<OrderFeedback?> feedback(String orderId) async {
    final row = await _client
        .from('order_feedback')
        .select('rating, problem, comment')
        .eq('order_id', orderId)
        .maybeSingle();
    return row == null ? null : OrderFeedback.fromJson(row);
  }

  /// Once per delivered order; seen privately by the kitchen.
  Future<void> submitFeedback(
    String orderId, {
    int? rating,
    String? problem,
    String? comment,
  }) async {
    try {
      await _client.rpc<void>(
        'submit_order_feedback',
        params: {
          'p_order': orderId,
          'p_rating': rating,
          'p_problem': problem,
          'p_comment': (comment == null || comment.trim().isEmpty)
              ? null
              : comment.trim(),
        },
      );
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  /// Emits the new status whenever one of the customer's orders changes
  /// (Supabase Realtime; Row Level Security limits it to their own orders).
  Stream<({String orderId, OrderStatus status})> statusChanges(
    String customerId,
  ) {
    late final RealtimeChannel channel;
    final controller = StreamController<({String orderId, OrderStatus status})>(
      onCancel: () => _client.removeChannel(channel),
    );
    channel = _client
        .channel('orders-$customerId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'customer_id',
            value: customerId,
          ),
          callback: (payload) {
            final row = payload.newRecord;
            final status = row['status'];
            if (row['id'] is String && status is String) {
              controller.add((
                orderId: row['id'] as String,
                status: OrderStatus.parse(status),
              ));
            }
          },
        )
        .subscribe();
    return controller.stream;
  }
}
