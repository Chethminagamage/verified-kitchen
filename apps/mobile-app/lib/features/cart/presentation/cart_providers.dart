import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_providers.dart';
import '../../auth/presentation/auth_flow_providers.dart';
import '../../kitchens/domain/kitchen.dart';
import '../domain/cart.dart';

enum AddResult { added, otherKitchen }

/// The customer's cart (one kitchen at a time).
///
/// Saved on the device for the signed-in account, so it survives closing the
/// app, as in delivery apps. Each account has its own cart, and a cart older
/// than [cartLifetime] is dropped.
class CartNotifier extends Notifier<Cart> {
  static const String keyPrefix = 'cart_v1_';

  String? _key;

  @override
  Cart build() {
    final userId = ref.watch(currentUserProvider.select((u) => u?.id));
    _key = userId == null ? null : '$keyPrefix$userId';
    final raw = _key == null ? null : ref.read(sharedPreferencesProvider).getString(_key!);
    Map<String, dynamic>? saved;
    try {
      saved = raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
    } on FormatException {
      saved = null;
    }
    return Cart.fromSaved(saved, now: DateTime.now());
  }

  void _set(Cart cart) {
    state = cart;
    final key = _key;
    if (key == null) return;
    final prefs = ref.read(sharedPreferencesProvider);
    // Fire and forget: the in-memory cart is already correct; storage catches up.
    if (cart.isEmpty) {
      prefs.remove(key);
    } else {
      prefs.setString(key, jsonEncode(cart.toJson()));
    }
  }

  /// Adds [quantity] of an item, unless the cart holds another kitchen's items
  /// (the UI then asks whether to start a new cart, as delivery apps do).
  AddResult add(Kitchen kitchen, MenuItem item, {int quantity = 1}) {
    if (!state.belongsTo(kitchen.id)) return AddResult.otherKitchen;
    _set(state.add(kitchen, item, quantity: quantity));
    return AddResult.added;
  }

  void startNewCart(Kitchen kitchen, MenuItem item, {int quantity = 1}) =>
      _set(Cart.empty.add(kitchen, item, quantity: quantity));

  /// Replaces the cart with exactly these items (used by "Reorder").
  void replaceWith(Kitchen kitchen, List<(MenuItem, int)> items) => _set(Cart.of(kitchen, items));

  void setQuantity(String menuItemId, int quantity) => _set(state.setQuantity(menuItemId, quantity));

  void clear() => _set(Cart.empty);
}

final cartProvider = NotifierProvider<CartNotifier, Cart>(CartNotifier.new);
