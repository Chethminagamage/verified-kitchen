import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_providers.dart';
import '../data/order_repository.dart';
import '../domain/order.dart';

final orderRepositoryProvider = Provider<OrderRepository>((ref) => OrderRepository(ref.watch(supabaseClientProvider)));

/// Live status changes of the customer's orders (Supabase Realtime).
final orderStatusChangesProvider = StreamProvider<({String orderId, OrderStatus status})>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return const Stream.empty();
  return ref.watch(orderRepositoryProvider).statusChanges(user.id);
});

final myOrdersProvider = FutureProvider<List<CustomerOrder>>((ref) {
  ref.watch(orderStatusChangesProvider); // refresh on every live change
  return ref.watch(orderRepositoryProvider).myOrders();
});

final orderProvider = FutureProvider.family<CustomerOrder?, String>((ref, id) {
  ref.watch(orderStatusChangesProvider);
  return ref.watch(orderRepositoryProvider).order(id);
});

/// Orders still in progress (for the notification bell).
final activeOrderCountProvider = Provider<int>((ref) {
  final orders = ref.watch(myOrdersProvider).value ?? const <CustomerOrder>[];
  return orders.where((o) => o.status.isActive).length;
});

final orderFeedbackProvider = FutureProvider.family<OrderFeedback?, String>(
  (ref, orderId) => ref.watch(orderRepositoryProvider).feedback(orderId),
);
