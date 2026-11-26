import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../kitchens/domain/kitchen.dart';
import '../domain/cart.dart';

enum AddResult { added, otherKitchen }

/// The customer's cart (one kitchen at a time). Kept for the app session.
class CartNotifier extends Notifier<Cart> {
  @override
  Cart build() => Cart.empty;

  /// Adds one item, unless the cart holds another kitchen's items (the UI
  /// then asks whether to start a new cart, as delivery apps do).
  AddResult add(Kitchen kitchen, MenuItem item) {
    if (!state.belongsTo(kitchen.id)) return AddResult.otherKitchen;
    state = state.add(kitchen, item);
    return AddResult.added;
  }

  void startNewCart(Kitchen kitchen, MenuItem item) =>
      state = Cart.empty.add(kitchen, item);

  void setQuantity(String menuItemId, int quantity) =>
      state = state.setQuantity(menuItemId, quantity);

  void clear() => state = Cart.empty;
}

final cartProvider = NotifierProvider<CartNotifier, Cart>(CartNotifier.new);
