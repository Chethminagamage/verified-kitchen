import '../../kitchens/domain/kitchen.dart';

/// Same limit as the database (order_items.quantity between 1 and 20).
const int maxQuantity = 20;

/// A saved cart older than this is discarded: menus and prices move on.
const Duration cartLifetime = Duration(hours: 24);

class CartLine {
  const CartLine({required this.item, required this.quantity});

  final MenuItem item;
  final int quantity;

  double get total => item.priceLkr * quantity;

  CartLine withQuantity(int q) => CartLine(item: item, quantity: q);
}

/// A cart belongs to one kitchen (one order = one kitchen, as in delivery apps).
/// Prices here are for display only: the server recalculates every price.
class Cart {
  const Cart({
    required this.kitchenId,
    required this.kitchenName,
    required this.deliveryFeeLkr,
    required this.lines,
    this.updatedAt,
  });

  static const Cart empty = Cart(kitchenId: null, kitchenName: null, deliveryFeeLkr: 0, lines: []);

  final String? kitchenId;
  final String? kitchenName;
  final double deliveryFeeLkr;
  final List<CartLine> lines;

  /// Last change, so an old saved cart can be discarded ([cartLifetime]).
  final DateTime? updatedAt;

  bool get isEmpty => lines.isEmpty;
  int get itemCount => lines.fold(0, (n, l) => n + l.quantity);
  double get subtotal => lines.fold(0, (s, l) => s + l.total);
  double get total => isEmpty ? 0 : subtotal + deliveryFeeLkr;

  int quantityOf(String menuItemId) => lines.where((l) => l.item.id == menuItemId).fold(0, (n, l) => n + l.quantity);

  bool belongsTo(String kitchenId) => this.kitchenId == null || this.kitchenId == kitchenId;

  /// Add [quantity] of [item] from [kitchen] (capped at [maxQuantity]).
  /// The caller must have checked [belongsTo].
  Cart add(Kitchen kitchen, MenuItem item, {int quantity = 1, DateTime? now}) {
    assert(belongsTo(kitchen.id), 'cart belongs to another kitchen');
    final index = lines.indexWhere((l) => l.item.id == item.id);
    final next = [...lines];
    if (index < 0) {
      next.add(CartLine(item: item, quantity: quantity.clamp(1, maxQuantity)));
    } else {
      next[index] = lines[index].withQuantity((lines[index].quantity + quantity).clamp(1, maxQuantity));
    }
    return Cart(
      kitchenId: kitchen.id,
      kitchenName: kitchen.name,
      deliveryFeeLkr: kitchen.deliveryFeeLkr,
      lines: next,
      updatedAt: now ?? DateTime.now(),
    );
  }

  /// A new cart for [kitchen] holding exactly [items] (used by "Reorder").
  static Cart of(Kitchen kitchen, List<(MenuItem, int)> items, {DateTime? now}) {
    var cart = Cart.empty;
    for (final (item, quantity) in items) {
      cart = cart.add(kitchen, item, quantity: quantity, now: now);
    }
    return cart;
  }

  /// Set a quantity; 0 removes the line, and the cart empties with its last line.
  Cart setQuantity(String menuItemId, int quantity, {DateTime? now}) {
    final q = quantity.clamp(0, maxQuantity);
    final next = [
      for (final l in lines)
        if (l.item.id != menuItemId) l else if (q > 0) l.withQuantity(q),
    ];
    return next.isEmpty
        ? Cart.empty
        : Cart(
            kitchenId: kitchenId,
            kitchenName: kitchenName,
            deliveryFeeLkr: deliveryFeeLkr,
            lines: next,
            updatedAt: now ?? DateTime.now(),
          );
  }

  /// Request body for the place_order database function.
  List<Map<String, Object>> toOrderItems() => [
    for (final l in lines) {'menu_item_id': l.item.id, 'quantity': l.quantity},
  ];

  Map<String, Object?> toJson() => {
    'kitchen_id': kitchenId,
    'kitchen_name': kitchenName,
    'delivery_fee_lkr': deliveryFeeLkr,
    'updated_at': updatedAt?.toUtc().toIso8601String(),
    'lines': [
      for (final l in lines) {'item': l.item.toJson(), 'quantity': l.quantity},
    ],
  };

  /// Restores a saved cart. Anything unreadable or older than [cartLifetime]
  /// gives an empty cart, so a bad save can never break the app.
  static Cart fromSaved(Map<String, dynamic>? json, {required DateTime now}) {
    if (json == null) return Cart.empty;
    try {
      final updatedAt = DateTime.parse(json['updated_at'] as String);
      if (now.difference(updatedAt) > cartLifetime) return Cart.empty;
      final lines = [
        for (final l in json['lines'] as List<dynamic>)
          CartLine(
            item: MenuItem.fromJson((l as Map<String, dynamic>)['item'] as Map<String, dynamic>),
            quantity: (l['quantity'] as num).toInt().clamp(1, maxQuantity),
          ),
      ];
      if (lines.isEmpty) return Cart.empty;
      return Cart(
        kitchenId: json['kitchen_id'] as String,
        kitchenName: json['kitchen_name'] as String?,
        deliveryFeeLkr: (json['delivery_fee_lkr'] as num).toDouble(),
        lines: lines,
        updatedAt: updatedAt,
      );
    } catch (_) {
      return Cart.empty;
    }
  }
}
