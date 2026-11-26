import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../cart/presentation/cart_providers.dart';
import '../../../cart/presentation/widgets/cart_widgets.dart';
import '../../../profile/presentation/account_providers.dart';
import '../../domain/kitchen.dart';
import '../kitchen_providers.dart';
import '../widgets/hygiene_panel.dart';

class KitchenPage extends ConsumerWidget {
  const KitchenPage({super.key, required this.kitchenId});

  final String kitchenId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kitchen = ref.watch(kitchenProvider(kitchenId));
    return Scaffold(
      bottomNavigationBar: ViewCartBar(kitchenId: kitchenId),
      body: AsyncView<Kitchen?>(
        value: kitchen,
        onRetry: () => ref.invalidate(kitchenProvider(kitchenId)),
        data: (k) => k == null
            ? Scaffold(
                appBar: AppBar(),
                body: const EmptyState(
                  icon: Icons.storefront_outlined,
                  title: 'Kitchen not available',
                  message: 'This kitchen is no longer listed.',
                ),
              )
            : _KitchenContent(kitchen: k),
      ),
    );
  }
}

class _KitchenContent extends ConsumerWidget {
  const _KitchenContent({required this.kitchen});

  final Kitchen kitchen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final k = kitchen;
    final history = ref.watch(hygieneHistoryProvider(k.id)).value ?? const <HygieneDay>[];
    final menu = ref.watch(menuProvider(k.id));

    return RefreshIndicator(
      color: AppColors.ink,
      onRefresh: () async {
        ref.invalidate(hygieneHistoryProvider(k.id));
        ref.invalidate(menuProvider(k.id));
        final _ = await ref.refresh(kitchenProvider(k.id).future);
      },
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 210,
            backgroundColor: AppColors.surface,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: _CircleButton(icon: Icons.arrow_back_rounded, tooltip: 'Back', onTap: () => context.pop()),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.all(8),
                child: _FavouriteButton(kitchenId: k.id),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: ColoredBox(
                color: k.grade?.softColor ?? AppColors.fill,
                child: SafeArea(
                  child: Center(child: Text(k.emoji, style: const TextStyle(fontSize: 84))),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            sliver: SliverList.list(
              children: [
                Text(k.name, style: t.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  [if (k.cuisine != null) k.cuisine!, if (k.location != null) k.location!].join('  ·  '),
                  style: t.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _InfoChip(
                      icon: Icons.schedule_rounded,
                      text: k.isOpen
                          ? 'Open · until ${formatClock(k.closesAt)}'
                          : 'Closed · opens ${formatClock(k.opensAt)}',
                      color: k.isOpen ? AppColors.success : AppColors.danger,
                    ),
                    _InfoChip(icon: Icons.delivery_dining_outlined, text: '${k.prepMinutes}–${k.prepMinutes + 15} min'),
                    _InfoChip(icon: Icons.payments_outlined, text: '${formatLkr(k.deliveryFeeLkr)} delivery'),
                  ],
                ),
                if (k.description != null) ...[
                  const SizedBox(height: 14),
                  Text(k.description!, style: t.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                ],
                const SizedBox(height: 20),
                HygienePanel(kitchen: k, history: history, now: DateTime.now()),
                const SizedBox(height: 28),
                Text('Menu', style: t.headlineSmall),
                const SizedBox(height: 4),
              ],
            ),
          ),
          ...menu.when(
            data: (items) => _menuSlivers(context, items, k),
            loading: () => [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
            ],
            error: (_, _) => [SliverToBoxAdapter(child: ErrorState(onRetry: () => ref.invalidate(menuProvider(k.id))))],
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }

  List<Widget> _menuSlivers(BuildContext context, List<MenuItem> items, Kitchen k) {
    if (items.isEmpty) {
      return const [
        SliverToBoxAdapter(
          child: EmptyState(icon: Icons.restaurant_menu, title: 'No menu yet', message: 'Check back later.'),
        ),
      ];
    }
    final byCategory = <String, List<MenuItem>>{};
    for (final i in items) {
      byCategory.putIfAbsent(i.category, () => []).add(i);
    }
    final t = Theme.of(context).textTheme;
    return [
      for (final entry in byCategory.entries) ...[
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
          sliver: SliverToBoxAdapter(child: Text(entry.key, style: t.titleLarge)),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          sliver: SliverList.separated(
            itemCount: entry.value.length,
            separatorBuilder: (_, _) => const Divider(),
            itemBuilder: (_, i) => _MenuRow(item: entry.value[i], kitchen: k),
          ),
        ),
      ],
    ];
  }
}

class _MenuRow extends ConsumerWidget {
  const _MenuRow({required this.item, required this.kitchen});

  final MenuItem item;
  final Kitchen kitchen;

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final cart = ref.read(cartProvider.notifier);
    if (cart.add(kitchen, item) == AddResult.added) return;
    final current = ref.read(cartProvider).kitchenName ?? 'another kitchen';
    final replace = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Start a new cart?'),
        content: Text('Your cart has items from $current. Starting a new cart removes them.'),
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
    if (replace == true) cart.startNewCart(kitchen, item);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final available = item.isAvailable && kitchen.isOpen;
    final inCart = ref.watch(cartProvider.select((c) => c.kitchenId == kitchen.id ? c.quantityOf(item.id) : 0));
    return Opacity(
      opacity: item.isAvailable ? 1 : 0.45,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.name, style: t.titleMedium),
                  const SizedBox(height: 4),
                  Text(formatLkr(item.priceLkr), style: t.bodyMedium),
                  if (item.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.description!,
                      style: t.bodySmall?.copyWith(color: AppColors.textSecondary),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (!item.isAvailable) ...[
                    const SizedBox(height: 4),
                    Text('Sold out', style: t.labelSmall?.copyWith(color: AppColors.danger)),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 14),
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 92,
                  height: 92,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.fill, borderRadius: BorderRadius.circular(14)),
                  child: Text(item.emoji, style: const TextStyle(fontSize: 40)),
                ),
                Positioned(
                  right: -6,
                  bottom: -6,
                  child: inCart > 0
                      ? _CountButton(count: inCart, onTap: available ? () => _add(context, ref) : null)
                      : _CircleButton(
                          icon: Icons.add_rounded,
                          tooltip: 'Add ${item.name}',
                          onTap: available ? () => _add(context, ref) : null,
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.text, this.color});

  final IconData icon;
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(color: AppColors.fill, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color ?? AppColors.ink),
          const SizedBox(width: 5),
          Text(text, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color)),
        ],
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({required this.icon, required this.onTap, required this.tooltip, this.iconColor});

  final IconData icon;
  final VoidCallback? onTap;
  final String tooltip;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: onTap == null ? AppColors.fillStrong : Colors.white,
        shape: const CircleBorder(),
        elevation: 2,
        shadowColor: Colors.black26,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(icon, size: 22, color: iconColor ?? AppColors.ink),
          ),
        ),
      ),
    );
  }
}

/// Black disc with the quantity already in the cart; tap adds one more.
class _CountButton extends StatelessWidget {
  const _CountButton({required this.count, required this.onTap});

  final int count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.ink,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 38,
          height: 38,
          child: Center(
            child: Text(
              '$count',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.white),
              semanticsLabel: '$count in cart, add one more',
            ),
          ),
        ),
      ),
    );
  }
}

class _FavouriteButton extends ConsumerWidget {
  const _FavouriteButton({required this.kitchenId});

  final String kitchenId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favourite = ref.watch(favouritesProvider).value?.contains(kitchenId) ?? false;
    return _CircleButton(
      icon: favourite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
      iconColor: favourite ? AppColors.danger : null,
      tooltip: favourite ? 'Remove from favourites' : 'Save to favourites',
      onTap: () async {
        try {
          await ref.read(favouritesProvider.notifier).toggle(kitchenId);
        } on UserFacingError catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
          }
        }
      },
    );
  }
}
