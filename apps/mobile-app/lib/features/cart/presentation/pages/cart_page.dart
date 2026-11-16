import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../kitchens/presentation/kitchen_providers.dart';
import '../../../kitchens/presentation/widgets/hygiene_badge.dart';
import '../cart_providers.dart';
import '../widgets/cart_widgets.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final cart = ref.watch(cartProvider);
    final kitchen = cart.kitchenId == null
        ? null
        : ref.watch(kitchenProvider(cart.kitchenId!)).value;

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(),
        body: EmptyState(
          icon: Icons.shopping_bag_outlined,
          title: 'Your cart is empty',
          message: 'Add dishes from a kitchen to start an order.',
          action: FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(200, 50)),
            onPressed: () => context.go(Routes.home),
            child: const Text('Find a kitchen'),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your cart'),
        actions: [
          TextButton(
            onPressed: () => ref.read(cartProvider.notifier).clear(),
            child: const Text('Clear'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          InkWell(
            onTap: () => context.push(Routes.kitchen(cart.kitchenId!)),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.fill,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      kitchen?.emoji ?? '🍽️',
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(cart.kitchenName ?? '', style: t.titleMedium),
                        if (kitchen != null) ...[
                          const SizedBox(height: 4),
                          HygieneBadge(
                            status: kitchen.status,
                            grade: kitchen.grade,
                            dense: true,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 24),
          for (final line in cart.lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Text(line.item.emoji, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(line.item.name, style: t.titleSmall),
                        const SizedBox(height: 2),
                        Text(
                          formatLkr(line.total),
                          style: t.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  QuantityStepper(
                    quantity: line.quantity,
                    onChanged: (q) => ref
                        .read(cartProvider.notifier)
                        .setQuantity(line.item.id, q),
                  ),
                ],
              ),
            ),
          const Divider(height: 24),
          PriceRow(label: 'Subtotal', amount: cart.subtotal),
          PriceRow(label: 'Delivery fee', amount: cart.deliveryFeeLkr),
          const SizedBox(height: 4),
          PriceRow(label: 'Total', amount: cart.total, bold: true),
          const SizedBox(height: 8),
          Text(
            'Prices are confirmed by the kitchen when you place the order.',
            style: t.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton(
            onPressed: kitchen != null && !kitchen.isOpen
                ? null
                : () => context.push(Routes.checkout),
            child: Text(
              kitchen != null && !kitchen.isOpen
                  ? 'Kitchen is closed now'
                  : 'Go to checkout',
            ),
          ),
        ),
      ),
    );
  }
}
