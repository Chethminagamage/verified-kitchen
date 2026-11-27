import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../domain/cart.dart';
import '../cart_providers.dart';

/// − 2 + control.
class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.quantity,
    required this.onChanged,
    this.min = 0,
    this.max = maxQuantity,
  });

  final int quantity;
  final ValueChanged<int> onChanged;

  /// 0 (in the cart): the minus becomes "Remove" at 1. 1 (choosing a quantity): minus stops at 1.
  final int min;
  final int max;

  @override
  Widget build(BuildContext context) {
    Widget button(IconData icon, String tip, VoidCallback? onTap) => IconButton(
      tooltip: tip,
      visualDensity: VisualDensity.compact,
      iconSize: 18,
      onPressed: onTap,
      icon: Icon(icon),
    );
    return Container(
      decoration: BoxDecoration(color: context.colors.fill, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (min == 0)
            button(
              quantity <= 1 ? Icons.delete_outline_rounded : Icons.remove_rounded,
              quantity <= 1 ? 'Remove' : 'Less',
              () => onChanged(quantity - 1),
            )
          else
            button(Icons.remove_rounded, 'Less', quantity <= min ? null : () => onChanged(quantity - 1)),
          SizedBox(
            width: 22,
            child: Text('$quantity', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleSmall),
          ),
          button(Icons.add_rounded, 'More', quantity >= max ? null : () => onChanged(quantity + 1)),
        ],
      ),
    );
  }
}

/// Label ........ amount
class PriceRow extends StatelessWidget {
  const PriceRow({super.key, required this.label, required this.amount, this.bold = false});

  final String label;
  final double amount;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final style = bold ? t.titleMedium : t.bodyMedium?.copyWith(color: context.colors.textSecondary);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(formatLkr(amount), style: bold ? t.titleMedium : t.bodyMedium),
        ],
      ),
    );
  }
}

/// Black bar at the bottom of a kitchen page: "View cart · 3 · LKR 2,150".
class ViewCartBar extends ConsumerWidget {
  const ViewCartBar({super.key, required this.kitchenId});

  final String kitchenId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    if (cart.isEmpty || cart.kitchenId != kitchenId) return const SizedBox.shrink();
    final t = Theme.of(context).textTheme;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: FilledButton(
          onPressed: () => context.push(Routes.cart),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: context.colors.onInk.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('${cart.itemCount}', style: t.labelLarge?.copyWith(color: context.colors.onInk)),
              ),
              const SizedBox(width: 12),
              const Expanded(child: Text('View cart')),
              Text(formatLkr(cart.subtotal)),
            ],
          ),
        ),
      ),
    );
  }
}
