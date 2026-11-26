import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../orders/domain/order.dart';
import '../../orders/presentation/order_providers.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Live order updates wherever the customer is in the app.
    ref.listen(orderStatusChangesProvider, (_, next) {
      final change = next.value;
      if (change == null) return;
      final messenger = ScaffoldMessenger.of(context);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(_message(change.status)),
            action: SnackBarAction(
              label: 'View',
              textColor: AppColors.primary,
              onPressed: () => context.push(Routes.order(change.orderId)),
            ),
          ),
        );
    });
    final active = ref.watch(activeOrderCountProvider);

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (i) => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: active > 0,
                label: Text('$active'),
                backgroundColor: AppColors.primary,
                child: const Icon(Icons.receipt_long_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: active > 0,
                label: Text('$active'),
                backgroundColor: AppColors.primary,
                child: const Icon(Icons.receipt_long_rounded),
              ),
              label: 'Orders',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }

  static String _message(OrderStatus status) => switch (status) {
    OrderStatus.placed => 'Your order was placed',
    OrderStatus.accepted => 'The kitchen accepted your order',
    OrderStatus.preparing => 'Your food is being prepared',
    OrderStatus.onTheWay => 'Your order is on the way',
    OrderStatus.delivered => 'Your order was delivered. Enjoy!',
    OrderStatus.cancelled => 'Your order was cancelled',
  };
}
