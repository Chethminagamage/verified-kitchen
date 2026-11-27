import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../kitchens/domain/kitchen.dart';
import '../../../kitchens/presentation/kitchen_providers.dart';
import '../../domain/order.dart';
import '../order_providers.dart';
import '../../../../core/widgets/media_image.dart';

class OrdersPage extends ConsumerWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final orders = ref.watch(myOrdersProvider);
    final kitchens = {for (final k in ref.watch(kitchensProvider).value ?? const <Kitchen>[]) k.id: k};

    return Scaffold(
      appBar: AppBar(title: Text('Orders', style: t.headlineMedium), toolbarHeight: 72),
      body: RefreshIndicator(
        color: context.colors.ink,
        onRefresh: () async {
          final _ = await ref.refresh(myOrdersProvider.future);
        },
        child: AsyncView<List<CustomerOrder>>(
          value: orders,
          onRetry: () => ref.invalidate(myOrdersProvider),
          data: (list) {
            if (list.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No orders yet',
                    message: 'When you order, you will follow it here from kitchen to door.',
                    action: FilledButton(
                      style: FilledButton.styleFrom(minimumSize: const Size(200, 50)),
                      onPressed: () => context.go(Routes.home),
                      child: const Text('Find a kitchen'),
                    ),
                  ),
                ],
              );
            }
            final active = list.where((o) => o.status.isActive).toList();
            final past = list.where((o) => !o.status.isActive).toList();
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                if (active.isNotEmpty) ...[
                  _Header('In progress'),
                  for (final o in active) _OrderTile(order: o, kitchen: kitchens[o.kitchenId]),
                ],
                if (past.isNotEmpty) ...[
                  _Header('Past orders'),
                  for (final o in past) _OrderTile(order: o, kitchen: kitchens[o.kitchenId]),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
    child: Text(text, style: Theme.of(context).textTheme.titleLarge),
  );
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order, required this.kitchen});

  final CustomerOrder order;
  final Kitchen? kitchen;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final o = order;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      leading: MediaImage(
        path: kitchen?.bannerPath,
        emoji: kitchen?.emoji ?? '🍽️',
        emojiSize: 24,
        width: 52,
        height: 52,
        borderRadius: BorderRadius.circular(12),
      ),
      title: Text(kitchen?.name ?? 'Order ${o.reference}', style: t.titleMedium),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Text(
          '${o.itemCount} items · ${formatLkr(o.totalLkr)} · ${DateFormat('d MMM, h:mm a').format(o.placedAt)}',
          style: t.bodySmall?.copyWith(color: context.colors.textSecondary),
        ),
      ),
      trailing: Text(o.status.label, style: t.labelMedium?.copyWith(color: context.colors.tone(o.status.tone))),
      onTap: () => context.push(Routes.order(o.id)),
    );
  }
}
