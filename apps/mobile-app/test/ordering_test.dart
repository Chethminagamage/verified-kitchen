import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:verified_kitchen_app/core/supabase/errors.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/cart/domain/cart.dart';
import 'package:verified_kitchen_app/features/cart/presentation/cart_providers.dart';
import 'package:verified_kitchen_app/features/cart/presentation/pages/cart_page.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/hygiene.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/kitchen_providers.dart';
import 'package:verified_kitchen_app/features/orders/domain/order.dart';
import 'package:verified_kitchen_app/features/profile/domain/address.dart';

import 'domain_test.dart' show row;

MenuItem dish(String id, double price) => MenuItem(
  id: id,
  name: 'Dish $id',
  description: null,
  category: 'Mains',
  priceLkr: price,
  emoji: '🍛',
  isAvailable: true,
);

void main() {
  final kitchenA = Kitchen.fromJson(row('Kitchen A', status: 'verified', grade: 'A'));
  final kitchenB = Kitchen.fromJson(row('Kitchen B'));

  group('cart', () {
    test('adds, counts and totals with the kitchen delivery fee', () {
      final cart = Cart.empty.add(kitchenA, dish('1', 650)).add(kitchenA, dish('1', 650)).add(kitchenA, dish('2', 900));
      expect(cart.itemCount, 3);
      expect(cart.subtotal, 2200);
      expect(cart.total, 2200 + 250);
      expect(cart.quantityOf('1'), 2);
      expect(cart.toOrderItems(), [
        {'menu_item_id': '1', 'quantity': 2},
        {'menu_item_id': '2', 'quantity': 1},
      ]);
    });

    test('one kitchen per cart', () {
      final cart = Cart.empty.add(kitchenA, dish('1', 650));
      expect(cart.belongsTo(kitchenA.id), isTrue);
      expect(cart.belongsTo(kitchenB.id), isFalse);
    });

    test('quantity stays within the database limit; 0 removes; last line empties the cart', () {
      var cart = Cart.empty.add(kitchenA, dish('1', 100));
      for (var i = 0; i < 30; i++) {
        cart = cart.add(kitchenA, dish('1', 100));
      }
      expect(cart.quantityOf('1'), maxQuantity);
      expect(cart.setQuantity('1', 99).quantityOf('1'), maxQuantity);
      final emptied = cart.setQuantity('1', 0);
      expect(emptied.isEmpty, isTrue);
      expect(emptied.kitchenId, isNull);
      expect(emptied.total, 0);
    });

    test('the notifier asks before mixing kitchens, then can start a new cart', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final cart = container.read(cartProvider.notifier);
      expect(cart.add(kitchenA, dish('1', 650)), AddResult.added);
      expect(cart.add(kitchenB, dish('9', 300)), AddResult.otherKitchen);
      expect(container.read(cartProvider).kitchenId, kitchenA.id); // unchanged
      cart.startNewCart(kitchenB, dish('9', 300));
      expect(container.read(cartProvider).kitchenId, kitchenB.id);
      expect(container.read(cartProvider).itemCount, 1);
    });
  });

  group('orders', () {
    Map<String, dynamic> orderRow({String status = 'preparing', String? cancelledBy}) => {
      'id': '3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b',
      'kitchen_id': 'k1',
      'status': status,
      'delivery_address': '12 Peradeniya Road, Kandy',
      'contact_phone': '+94 77 123 4567',
      'note': null,
      'subtotal_lkr': 2200,
      'delivery_fee_lkr': 250,
      'total_lkr': 2450,
      'hygiene_grade_at_order': 'A',
      'hygiene_status_at_order': 'verified',
      'placed_at': '2026-11-15T10:00:00Z',
      'accepted_at': '2026-11-15T10:02:00Z',
      'preparing_at': status == 'placed' ? null : '2026-11-15T10:05:00Z',
      'on_the_way_at': null,
      'delivered_at': null,
      'cancelled_at': null,
      'cancelled_by': cancelledBy,
      'order_items': [
        {'name': 'Kottu', 'unit_price_lkr': 900, 'quantity': 2, 'line_total_lkr': 1800},
        {'name': 'Lime juice', 'unit_price_lkr': 400, 'quantity': 1, 'line_total_lkr': 400},
      ],
    };

    test('parses the order with its timeline, items and the grade shown when ordering', () {
      final o = CustomerOrder.fromJson(orderRow());
      expect(o.status, OrderStatus.preparing);
      expect(o.reference, '#3F2B8C');
      expect(o.itemCount, 3);
      expect(o.timestamps.keys, containsAll([OrderStatus.placed, OrderStatus.accepted, OrderStatus.preparing]));
      expect(o.timestamps.containsKey(OrderStatus.onTheWay), isFalse);
      expect(o.gradeAtOrder, HygieneGrade.a);
      expect(o.canCancel, isFalse); // the kitchen already accepted it
      expect(CustomerOrder.fromJson(orderRow(status: 'placed')).canCancel, isTrue);
    });

    test('status rules', () {
      expect(OrderStatus.parse('on_the_way'), OrderStatus.onTheWay);
      expect(OrderStatus.delivered.isActive, isFalse);
      expect(OrderStatus.placed.isActive, isTrue);
      expect(() => OrderStatus.parse('teleported'), throwsFormatException);
    });
  });

  group('addresses and errors', () {
    test('delivery text includes the rider instructions', () {
      const a = SavedAddress(
        id: '1',
        label: 'Home',
        addressLine: '12 Main St',
        instructions: 'Blue gate',
        isDefault: true,
      );
      expect(a.forDelivery, '12 Main St (Blue gate)');
      const b = SavedAddress(id: '2', label: 'Work', addressLine: '1 Lake Rd', instructions: ' ', isDefault: false);
      expect(b.forDelivery, '1 Lake Rd');
    });

    test('our own server messages reach the customer; raw database errors do not', () {
      expect(
        toUserFacing(const PostgrestException(message: 'this kitchen is closed now', code: '23514')).message,
        'This kitchen is closed now.',
      );
      expect(
        toUserFacing(
          const PostgrestException(
            message: 'new row violates check constraint "orders_total_lkr_check"',
            code: '23514',
          ),
        ).message,
        'Something went wrong. Please try again.',
      );
      expect(toUserFacing(Exception('boom')).message, 'Something went wrong. Please try again.');
    });
  });

  testWidgets('cart page: lines, steppers and totals; removing the last item empties it', (tester) async {
    final container = ProviderContainer(overrides: [kitchenProvider.overrideWith((ref, id) async => kitchenA)]);
    addTearDown(container.dispose);
    container.read(cartProvider.notifier)
      ..add(kitchenA, dish('1', 650))
      ..add(kitchenA, dish('1', 650));
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(theme: AppTheme.light, home: const CartPage()),
      ),
    );
    await tester.pump();
    expect(find.text('Dish 1'), findsOneWidget);
    expect(find.text('LKR 1,550'), findsOneWidget); // 2 × 650 + 250 delivery
    await tester.tap(find.byTooltip('Less'));
    await tester.pump();
    expect(container.read(cartProvider).itemCount, 1);
    await tester.tap(find.byTooltip('Remove'));
    await tester.pump();
    expect(find.text('Your cart is empty'), findsOneWidget);
  });
}
