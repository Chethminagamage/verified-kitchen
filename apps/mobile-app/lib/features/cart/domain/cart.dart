import '../../kitchens/domain/kitchen.dart';

/// Same limit as the database (order_items.quantity between 1 and 20).
const int maxQuantity = 20;

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
  const Cart({required this.kitchenId, required this.kitchenName, required this.deliveryFeeLkr, required this.lines});

  static const Cart empty = Cart(kitchenId: null, kitchenName: null, deliveryFeeLkr: 0, lines: []);

  final String? kitchenId;
  final String? kitchenName;
  final double deliveryFeeLkr;
  final List<CartLine> lines;

  bool get isEmpty => lines.isEmpty;
  int get itemCount => lines.fold(0, (n, l) => n + l.quantity);
  double get subtotal => lines.fold(0, (s, l) => s + l.total);
  double get total => isEmpty ? 0 : subtotal + deliveryFeeLkr;

  int quantityOf(String menuItemId) => lines.where((l) => l.item.id == menuItemId).fold(0, (n, l) => n + l.quantity);

  bool belongsTo(String kitchenId) => this.kitchenId == null || this.kitchenId == kitchenId;

  /// Add one of [item] from [kitchen]. The caller must have checked [belongsTo].
  Cart add(Kitchen kitchen, MenuItem item) {
    assert(belongsTo(kitchen.id), 'cart belongs to another kitchen');
    final index = lines.indexWhere((l) => l.item.id == item.id);
    final next = [...lines];
    if (index < 0) {
      next.add(CartLine(item: item, quantity: 1));
    } else if (lines[index].quantity < maxQuantity) {
      next[index] = lines[index].withQuantity(lines[index].quantity + 1);
    }
    return Cart(kitchenId: kitchen.id, kitchenName: kitchen.name, deliveryFeeLkr: kitchen.deliveryFeeLkr, lines: next);
  }

  /// Set a quantity; 0 removes the line, and the cart empties with its last line.
  Cart setQuantity(String menuItemId, int quantity) {
    final q = quantity.clamp(0, maxQuantity);
    final next = [
      for (final l in lines)
        if (l.item.id != menuItemId) l else if (q > 0) l.withQuantity(q),
    ];
    return next.isEmpty
        ? Cart.empty
        : Cart(kitchenId: kitchenId, kitchenName: kitchenName, deliveryFeeLkr: deliveryFeeLkr, lines: next);
  }

  /// Request body for the place_order database function.
  List<Map<String, Object>> toOrderItems() => [
    for (final l in lines) {'menu_item_id': l.item.id, 'quantity': l.quantity},
  ];
}
