import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../cart/presentation/add_to_cart.dart';
import '../../../cart/presentation/cart_providers.dart';
import '../../../cart/presentation/widgets/cart_widgets.dart';
import '../../../kitchens/presentation/kitchen_providers.dart';
import '../../../kitchens/presentation/widgets/hygiene_badge.dart';
import '../../domain/order.dart';
import '../order_providers.dart';
import '../widgets/feedback_section.dart';

class OrderPage extends ConsumerWidget {
  const OrderPage({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.canPop() ? context.pop() : context.go(Routes.orders)),
      ),
      body: RefreshIndicator(
        color: context.colors.ink,
        onRefresh: () async {
          final _ = await ref.refresh(orderProvider(orderId).future);
        },
        child: AsyncView<CustomerOrder?>(
          value: order,
          onRetry: () => ref.invalidate(orderProvider(orderId)),
          data: (o) => o == null
              ? const EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: 'Order not found',
                  message: 'It may belong to another account.',
                )
              : _OrderContent(order: o),
        ),
      ),
    );
  }
}

class _OrderContent extends ConsumerStatefulWidget {
  const _OrderContent({required this.order});

  final CustomerOrder order;

  @override
  ConsumerState<_OrderContent> createState() => _OrderContentState();
}

class _OrderContentState extends ConsumerState<_OrderContent> {
  bool _cancelling = false;
  bool _reordering = false;

  /// Puts the same dishes back in the cart at today's prices and opens the cart.
  Future<void> _reorder() async {
    final o = widget.order;
    final messenger = ScaffoldMessenger.of(context);
    void say(String text) => messenger.showSnackBar(SnackBar(content: Text(text)));
    setState(() => _reordering = true);
    try {
      final kitchen = await ref.read(kitchenProvider(o.kitchenId).future);
      if (kitchen == null) return say('This kitchen is no longer listed.');
      if (!kitchen.isOpen) return say('${kitchen.name} is closed. It opens at ${formatClock(kitchen.opensAt)}.');
      final plan = ReorderPlan.from(o.lines, await ref.refresh(menuProvider(o.kitchenId).future));
      if (plan.isEmpty) return say('None of these dishes are available right now.');

      final cart = ref.read(cartProvider);
      if (!mounted) return;
      if (!cart.isEmpty && !await confirmNewCart(context, currentKitchen: cart.kitchenName ?? 'another kitchen')) {
        return;
      }
      ref.read(cartProvider.notifier).replaceWith(kitchen, plan.items);
      if (plan.unavailable.isNotEmpty) say('Not available right now: ${plan.unavailable.join(', ')}.');
      if (mounted) context.push(Routes.cart);
    } catch (_) {
      say('Could not load the menu. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _reordering = false);
    }
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this order?'),
        content: const Text('The kitchen has not accepted it yet, so you can cancel it for free.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep order')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: context.colors.danger, minimumSize: const Size(0, 44)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel order'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _cancelling = true);
    try {
      await ref.read(orderRepositoryProvider).cancel(widget.order.id);
      ref.invalidate(orderProvider(widget.order.id));
      ref.invalidate(myOrdersProvider);
    } on UserFacingError catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      ref.invalidate(orderProvider(widget.order.id));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final o = widget.order;
    final kitchen = ref.watch(kitchenProvider(o.kitchenId)).value;
    final time = DateFormat('h:mm a');

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      children: [
        Text(o.status.label, style: t.headlineMedium?.copyWith(color: context.colors.tone(o.status.tone))),
        const SizedBox(height: 4),
        Text(o.status.description, style: t.bodyLarge?.copyWith(color: context.colors.textSecondary)),
        const SizedBox(height: 4),
        Text(
          '${kitchen?.name ?? 'Kitchen'} · ${o.reference} · ${DateFormat('d MMM, h:mm a').format(o.placedAt)}',
          style: t.bodySmall?.copyWith(color: context.colors.textMuted),
        ),
        if (kitchen != null)
          if (o.arrivalWindow(kitchen.prepMinutes) case final window?) ...[
            const SizedBox(height: 16),
            _ArrivalCard(from: time.format(window.from), to: time.format(window.to)),
          ],
        const SizedBox(height: 24),
        if (o.status == OrderStatus.cancelled)
          _Step(
            icon: OrderStatus.cancelled.icon,
            title: o.cancelledBy == 'kitchen' ? 'Cancelled by the kitchen' : 'You cancelled this order',
            time: o.timestamps[OrderStatus.cancelled],
            state: _StepState.failed,
            last: true,
            format: time,
          )
        else
          for (final (i, step) in OrderStatus.progress.indexed)
            _Step(
              icon: step.icon,
              title: step.label,
              time: o.timestamps[step],
              state: o.timestamps.containsKey(step)
                  ? (step == o.status ? _StepState.current : _StepState.done)
                  : _StepState.todo,
              last: i == OrderStatus.progress.length - 1,
              format: time,
            ),
        const Divider(height: 36),
        Text('Order summary', style: t.titleLarge),
        const SizedBox(height: 8),
        for (final line in o.lines)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                SizedBox(width: 32, child: Text('${line.quantity}×', style: t.titleSmall)),
                Expanded(child: Text(line.name, style: t.bodyMedium)),
                Text(formatLkr(line.lineTotalLkr), style: t.bodyMedium),
              ],
            ),
          ),
        const Divider(height: 24),
        PriceRow(label: 'Subtotal', amount: o.subtotalLkr),
        PriceRow(label: 'Delivery fee', amount: o.deliveryFeeLkr),
        PriceRow(label: 'Total · cash on delivery', amount: o.totalLkr, bold: true),
        const Divider(height: 28),
        _Detail(icon: Icons.location_on_outlined, title: 'Delivery address', text: o.deliveryAddress),
        _Detail(icon: Icons.phone_outlined, title: 'Contact', text: o.contactPhone),
        if (o.note != null) _Detail(icon: Icons.sticky_note_2_outlined, title: 'Note', text: o.note!),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: Text('Hygiene when you ordered', style: t.titleSmall)),
            HygieneBadge(status: o.hygieneStatusAtOrder, grade: o.gradeAtOrder, dense: true),
          ],
        ),
        if (o.status == OrderStatus.delivered) ...[const SizedBox(height: 24), FeedbackSection(orderId: o.id)],
        if (o.canReorder) ...[
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _reordering ? null : _reorder,
            icon: const Icon(Icons.replay_rounded, size: 20),
            label: Text(_reordering ? 'Adding to cart…' : 'Reorder'),
          ),
        ],
        if (o.canCancel) ...[
          const SizedBox(height: 28),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: context.colors.danger,
              side: BorderSide(color: context.colors.dangerSoft),
            ),
            onPressed: _cancelling ? null : _cancel,
            child: Text(_cancelling ? 'Cancelling…' : 'Cancel order'),
          ),
        ],
      ],
    );
  }
}

enum _StepState { done, current, todo, failed }

class _Step extends StatelessWidget {
  const _Step({
    required this.icon,
    required this.title,
    required this.time,
    required this.state,
    required this.last,
    required this.format,
  });

  final IconData icon;
  final String title;
  final DateTime? time;
  final _StepState state;
  final bool last;
  final DateFormat format;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final (Color dot, Color line) = switch (state) {
      _StepState.done => (context.colors.ink, context.colors.ink),
      _StepState.current => (context.colors.primary, context.colors.fillStrong),
      _StepState.todo => (context.colors.fillStrong, context.colors.fillStrong),
      _StepState.failed => (context.colors.danger, context.colors.fillStrong),
    };
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
                  child: Icon(
                    icon,
                    size: 17,
                    color: state == _StepState.todo ? context.colors.textMuted : context.colors.onInk,
                  ),
                ),
                if (!last)
                  Expanded(
                    child: Container(width: 2, color: line, margin: const EdgeInsets.symmetric(vertical: 2)),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 6, bottom: last ? 0 : 20),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: state == _StepState.todo
                          ? t.bodyLarge?.copyWith(color: context.colors.textMuted)
                          : t.titleMedium,
                    ),
                  ),
                  if (time != null)
                    Text(format.format(time!), style: t.bodySmall?.copyWith(color: context.colors.textSecondary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.icon, required this.title, required this.text});

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: context.colors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: t.labelMedium?.copyWith(color: context.colors.textSecondary)),
                const SizedBox(height: 2),
                Text(text, style: t.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "Arriving 12:05 – 12:20" while the order is in progress.
class _ArrivalCard extends StatelessWidget {
  const _ArrivalCard({required this.from, required this.to});

  final String from;
  final String to;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Semantics(
      label: 'Estimated arrival between $from and $to',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(color: context.colors.fill, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            Icon(Icons.schedule_rounded, color: context.colors.ink),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Estimated arrival', style: t.bodySmall?.copyWith(color: context.colors.textSecondary)),
                  const SizedBox(height: 2),
                  Text('$from – $to', style: t.titleLarge),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
