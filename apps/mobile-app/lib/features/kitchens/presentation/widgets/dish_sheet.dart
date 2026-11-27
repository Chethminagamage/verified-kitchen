import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../cart/domain/cart.dart';
import '../../../cart/presentation/add_to_cart.dart';
import '../../../cart/presentation/cart_providers.dart';
import '../../../cart/presentation/widgets/cart_widgets.dart';
import '../../domain/kitchen.dart';
import '../../../../core/widgets/media_image.dart';

/// Details of one dish, opened by tapping it on the menu: full description,
/// a quantity and "Add to cart", as in delivery apps.
Future<void> showDishSheet(BuildContext context, {required Kitchen kitchen, required MenuItem item}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    backgroundColor: context.colors.surface,
    builder: (_) => DishSheet(kitchen: kitchen, item: item),
  );
}

class DishSheet extends ConsumerStatefulWidget {
  const DishSheet({super.key, required this.kitchen, required this.item});

  final Kitchen kitchen;
  final MenuItem item;

  @override
  ConsumerState<DishSheet> createState() => _DishSheetState();
}

class _DishSheetState extends ConsumerState<DishSheet> {
  int _quantity = 1;
  bool _adding = false;

  Future<void> _add() async {
    setState(() => _adding = true);
    final added = await addToCart(context, ref, widget.kitchen, widget.item, quantity: _quantity);
    if (!mounted) return;
    setState(() => _adding = false);
    if (added) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final item = widget.item;
    final kitchen = widget.kitchen;
    final inCart = ref.watch(cartProvider.select((c) => c.kitchenId == kitchen.id ? c.quantityOf(item.id) : 0));
    final room = maxQuantity - inCart; // the database allows at most 20 of a dish per order
    final unavailableReason = !item.isAvailable
        ? 'Sold out right now.'
        : !kitchen.isOpen
        ? 'The kitchen is closed. It opens at ${formatClock(kitchen.opensAt)}.'
        : room <= 0
        ? 'You already have the most allowed in one order.'
        : null;
    final canAdd = unavailableReason == null;
    final quantity = canAdd ? _quantity.clamp(1, room) : 1;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // The details scroll on short screens or with large text; the
          // quantity and "Add to cart" row below always stays visible.
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Photos are square (800 x 800); the sheet shows a wide crop, capped in height.
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 240),
                    child: AspectRatio(
                      aspectRatio: 16 / 10,
                      child: MediaImage(
                        path: item.imagePath,
                        emoji: item.emoji,
                        emojiSize: 72,
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(item.name, style: t.headlineSmall),
                  const SizedBox(height: 4),
                  Text(formatLkr(item.priceLkr), style: t.titleMedium?.copyWith(color: context.colors.textSecondary)),
                  if (item.description != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      item.description!,
                      style: t.bodyMedium?.copyWith(color: context.colors.textSecondary, height: 1.45),
                    ),
                  ],
                  if (inCart > 0) ...[
                    const SizedBox(height: 12),
                    Text(
                      '$inCart already in your cart',
                      style: t.bodySmall?.copyWith(color: context.colors.primaryDark, fontWeight: FontWeight.w600),
                    ),
                  ],
                  if (unavailableReason != null) ...[
                    const SizedBox(height: 12),
                    Text(unavailableReason, style: t.bodyMedium?.copyWith(color: context.colors.danger)),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              QuantityStepper(
                quantity: quantity,
                min: 1,
                max: canAdd ? room : 1,
                onChanged: canAdd ? (q) => setState(() => _quantity = q) : (_) {},
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: canAdd && !_adding ? _add : null,
                  child: Text(
                    canAdd ? 'Add to cart · ${formatLkr(item.priceLkr * quantity)}' : 'Not available',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
