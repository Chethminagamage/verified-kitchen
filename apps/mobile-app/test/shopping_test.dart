import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:verified_kitchen_app/core/supabase/supabase_providers.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/presentation/auth_flow_providers.dart';
import 'package:verified_kitchen_app/features/cart/domain/cart.dart';
import 'package:verified_kitchen_app/features/cart/presentation/cart_providers.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen_filters.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/dish_sheet.dart';
import 'package:verified_kitchen_app/features/orders/domain/order.dart';

import 'domain_test.dart' show row;

MenuItem dish(String id, double price, {bool available = true, String? description}) => MenuItem(
  id: id,
  name: 'Dish $id',
  description: description,
  category: 'Mains',
  priceLkr: price,
  emoji: '🍛',
  isAvailable: available,
);

User user(String id) =>
    User(id: id, appMetadata: const {}, userMetadata: const {}, aud: 'authenticated', createdAt: '');

void main() {
  final kitchenA = Kitchen.fromJson(row('Kitchen A', status: 'verified', grade: 'A'));
  final kitchenB = Kitchen.fromJson(row('Kitchen B', cuisine: 'Burgers · Fast food'));
  final now = DateTime.utc(2026, 11, 27, 12);

  group('cart quantities', () {
    test('adds several at once and never goes over the database limit', () {
      var cart = Cart.empty.add(kitchenA, dish('1', 500), quantity: 3, now: now);
      expect(cart.quantityOf('1'), 3);
      cart = cart.add(kitchenA, dish('1', 500), quantity: 50, now: now);
      expect(cart.quantityOf('1'), maxQuantity);
    });

    test('a reorder cart holds exactly the given dishes', () {
      final cart = Cart.of(kitchenA, [(dish('1', 500), 2), (dish('2', 300), 1)], now: now);
      expect(cart.kitchenId, kitchenA.id);
      expect(cart.itemCount, 3);
      expect(cart.subtotal, 1300);
    });
  });

  group('saved cart', () {
    test('survives a save and restore', () {
      final cart = Cart.empty.add(kitchenA, dish('1', 650, description: 'Spicy'), quantity: 2, now: now);
      final restored = Cart.fromSaved(
        jsonDecode(jsonEncode(cart.toJson())) as Map<String, dynamic>,
        now: now.add(const Duration(hours: 3)),
      );
      expect(restored.kitchenId, kitchenA.id);
      expect(restored.kitchenName, 'Kitchen A');
      expect(restored.deliveryFeeLkr, 250);
      expect(restored.quantityOf('1'), 2);
      expect(restored.lines.single.item.description, 'Spicy');
    });

    test('an old or unreadable save gives an empty cart instead of an error', () {
      final cart = Cart.empty.add(kitchenA, dish('1', 650), now: now);
      expect(Cart.fromSaved(cart.toJson(), now: now.add(const Duration(hours: 25))).isEmpty, isTrue);
      expect(Cart.fromSaved({'lines': 'nonsense'}, now: now).isEmpty, isTrue);
      expect(Cart.fromSaved(null, now: now).isEmpty, isTrue);
    });

    test('the cart is kept per account on the device', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      ProviderContainer containerFor(String userId) {
        final c = ProviderContainer(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            currentUserProvider.overrideWithValue(user(userId)),
          ],
        );
        addTearDown(c.dispose);
        return c;
      }

      containerFor('alice').read(cartProvider.notifier).add(kitchenA, dish('1', 650), quantity: 2);
      // The app was closed and opened again.
      expect(containerFor('alice').read(cartProvider).quantityOf('1'), 2);
      // Someone else signs in on the same phone: they do not see Alice's cart.
      expect(containerFor('bob').read(cartProvider).isEmpty, isTrue);

      containerFor('alice').read(cartProvider.notifier).clear();
      expect(containerFor('alice').read(cartProvider).isEmpty, isTrue);
    });
  });

  group('search by dish', () {
    test('a dish match finds the kitchen that serves it', () {
      final results = applyKitchenQuery(
        [kitchenA, kitchenB],
        const KitchenQuery(text: 'devilled'),
        dishMatches: {
          kitchenB.id: ['Devilled chicken'],
        },
      );
      expect(results.map((k) => k.name), ['Kitchen B']);
      // Names and cuisines still match without any dish results.
      expect(applyKitchenQuery([kitchenA, kitchenB], const KitchenQuery(text: 'burgers')).map((k) => k.name), [
        'Kitchen B',
      ]);
    });

    test('the database pattern escapes wildcards and needs two letters', () {
      expect(dishSearchPattern(' egg '), '%egg%');
      expect(dishSearchPattern('50%_off'), r'%50\%\_off%');
      expect(dishSearchPattern('e'), isNull);
      expect(dishSearchPattern('   '), isNull);
    });
  });

  group('order arrival and reorder', () {
    CustomerOrder order(String status, {List<Map<String, dynamic>> items = const []}) => CustomerOrder.fromJson({
      'id': '3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b',
      'kitchen_id': kitchenA.id,
      'status': status,
      'delivery_address': '1 Main St',
      'contact_phone': '0771234567',
      'note': null,
      'subtotal_lkr': 1300,
      'delivery_fee_lkr': 250,
      'total_lkr': 1550,
      'hygiene_grade_at_order': 'A',
      'hygiene_status_at_order': 'verified',
      'placed_at': '2026-11-27T06:30:00Z',
      'cancelled_by': null,
      'order_items': items,
    });

    test('an order in progress has an arrival window from the kitchen prep time', () {
      final o = order('preparing');
      final window = o.arrivalWindow(25)!;
      expect(window.from, o.placedAt.add(const Duration(minutes: 25)));
      expect(window.to, o.placedAt.add(const Duration(minutes: 40)));
      expect(o.canReorder, isFalse);
    });

    test('a finished order has no arrival window and can be reordered', () {
      for (final status in ['delivered', 'cancelled']) {
        expect(order(status).arrivalWindow(25), isNull);
        expect(order(status).canReorder, isTrue);
      }
    });

    test('reorder uses today\'s menu and leaves out removed or sold-out dishes', () {
      final o = order(
        'delivered',
        items: [
          {'menu_item_id': '1', 'name': 'Dish 1', 'unit_price_lkr': 400, 'quantity': 2, 'line_total_lkr': 800},
          {'menu_item_id': '2', 'name': 'Dish 2', 'unit_price_lkr': 300, 'quantity': 1, 'line_total_lkr': 300},
          {'menu_item_id': null, 'name': 'Old special', 'unit_price_lkr': 200, 'quantity': 1, 'line_total_lkr': 200},
        ],
      );
      final plan = ReorderPlan.from(o.lines, [dish('1', 450), dish('2', 300, available: false)]);
      expect(plan.items.single.$1.priceLkr, 450); // today's price, not the old one
      expect(plan.items.single.$2, 2);
      expect(plan.unavailable, ['Dish 2', 'Old special']);
    });
  });

  test('only news from the kitchen is announced, not what the customer just did', () {
    OrderStatusChange change(String status, [String? by]) =>
        OrderStatusChange(orderId: 'o1', status: OrderStatus.parse(status), cancelledBy: by);
    expect(change('placed').worthTelling, isFalse);
    expect(change('cancelled', 'customer').worthTelling, isFalse);
    expect(change('cancelled', 'kitchen').worthTelling, isTrue);
    for (final s in ['accepted', 'preparing', 'on_the_way', 'delivered']) {
      expect(change(s).worthTelling, isTrue, reason: s);
    }
  });

  group('dish sheet', () {
    Future<ProviderContainer> pumpSheet(WidgetTester tester, Kitchen kitchen, MenuItem item) async {
      final container = ProviderContainer(overrides: [currentUserProvider.overrideWithValue(null)]);
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: DishSheet(kitchen: kitchen, item: item),
            ),
          ),
        ),
      );
      return container;
    }

    testWidgets('choose a quantity, then add it to the cart', (tester) async {
      final container = await pumpSheet(tester, kitchenA, dish('1', 650, description: 'Godamba roti, egg'));
      expect(find.text('Godamba roti, egg'), findsOneWidget);
      expect(find.text('Add to cart · LKR 650'), findsOneWidget);
      await tester.tap(find.byTooltip('More'));
      await tester.pump();
      expect(find.text('Add to cart · LKR 1,300'), findsOneWidget);
      await tester.tap(find.text('Add to cart · LKR 1,300'));
      await tester.pumpAndSettle();
      expect(container.read(cartProvider).quantityOf('1'), 2);
    });

    testWidgets('a sold-out dish or a closed kitchen cannot be added', (tester) async {
      await pumpSheet(tester, kitchenA, dish('1', 650, available: false));
      expect(find.text('Sold out right now.'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);

      final closed = Kitchen.fromJson(row('Closed K', open: false));
      await pumpSheet(tester, closed, dish('2', 650));
      expect(find.textContaining('The kitchen is closed'), findsOneWidget);
    });
  });
}
