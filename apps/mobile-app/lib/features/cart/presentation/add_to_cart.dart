import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../kitchens/domain/kitchen.dart';
import 'cart_providers.dart';

/// Asks before replacing a cart that holds another kitchen's items (one order
/// = one kitchen, as in delivery apps). Returns true when the customer agrees.
Future<bool> confirmNewCart(BuildContext context, {required String currentKitchen}) async {
  final replace = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Start a new cart?'),
      content: Text('Your cart has items from $currentKitchen. Starting a new cart removes them.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep cart')),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('New cart'),
        ),
      ],
    ),
  );
  return replace ?? false;
}

/// Adds [quantity] of [item] to the cart, asking first if the cart belongs to
/// another kitchen. Returns true when the item was added.
Future<bool> addToCart(BuildContext context, WidgetRef ref, Kitchen kitchen, MenuItem item, {int quantity = 1}) async {
  final cart = ref.read(cartProvider.notifier);
  if (cart.add(kitchen, item, quantity: quantity) == AddResult.added) return true;
  final current = ref.read(cartProvider).kitchenName ?? 'another kitchen';
  if (!context.mounted || !await confirmNewCart(context, currentKitchen: current)) return false;
  cart.startNewCart(kitchen, item, quantity: quantity);
  return true;
}
