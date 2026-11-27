import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/supabase_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../domain/kitchen.dart';
import '../../domain/kitchen_filters.dart';
import '../../../../core/widgets/skeleton.dart';
import '../../../orders/domain/order.dart';
import '../../../orders/presentation/order_providers.dart';
import '../../../profile/presentation/account_providers.dart';
import '../kitchen_providers.dart';
import '../widgets/hygiene_explainer.dart';
import '../widgets/kitchen_card.dart';
import '../../../notifications/presentation/notification_providers.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kitchens = ref.watch(kitchensProvider);
    final query = ref.watch(kitchenQueryProvider);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: context.colors.ink,
          onRefresh: () => ref.refresh(kitchensProvider.future),
          child: AsyncView<List<Kitchen>>(
            value: kitchens,
            loading: const KitchenListSkeleton(),
            onRetry: () => ref.invalidate(kitchensProvider),
            data: (all) => _HomeContent(all: all, query: query),
          ),
        ),
      ),
    );
  }
}

class _HomeContent extends ConsumerWidget {
  const _HomeContent({required this.all, required this.query});

  final List<Kitchen> all;
  final KitchenQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final profileName = ref.watch(profileProvider).value?.firstName;
    final name = (profileName?.isNotEmpty == true)
        ? profileName
        : (ref.watch(currentUserProvider)?.userMetadata?['full_name'] as String?)?.split(' ').first;
    final unread = ref.watch(unreadCountProvider);
    final byId = {for (final k in all) k.id: k};
    // Kitchens of past delivered orders, most recent first.
    final orderAgain = <Kitchen>[
      for (final id in {
        for (final o in ref.watch(myOrdersProvider).value ?? const <CustomerOrder>[])
          if (o.status == OrderStatus.delivered) o.kitchenId,
      })
        ?byId[id],
    ];
    final favouriteIds = ref.watch(favouritesProvider).value ?? const <String>{};
    final favourites = applyKitchenQuery(all.where((k) => favouriteIds.contains(k.id)), const KitchenQuery());
    final visible = applyKitchenQuery(all, query);
    final verified = applyKitchenQuery(all.where((k) => k.isMonitored), const KitchenQuery());
    final notifier = ref.read(kitchenQueryProvider.notifier);
    void open(Kitchen k) => context.push(Routes.kitchen(k.id));

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverList.list(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_greeting(name), style: t.headlineMedium),
                        const SizedBox(height: 4),
                        Text(
                          'Order from kitchens you can trust.',
                          style: t.bodyLarge?.copyWith(color: context.colors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  IconButton.filledTonal(
                    tooltip: unread > 0 ? '$unread unread notifications' : 'Notifications',
                    style: IconButton.styleFrom(backgroundColor: context.colors.fill),
                    onPressed: () => context.push(Routes.notifications),
                    icon: Badge(
                      isLabelVisible: unread > 0,
                      label: Text('$unread'),
                      backgroundColor: context.colors.primary,
                      child: Icon(Icons.notifications_none_rounded, color: context.colors.ink),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _SearchPill(onTap: () => context.push(Routes.search)),
              const SizedBox(height: 14),
              if (query.isEmpty) ...[
                _TrustBanner(onTap: () => showHygieneExplainer(context)),
                const SizedBox(height: 10),
              ],
            ],
          ),
        ),
        SliverToBoxAdapter(
          child: _ChipRow(
            children: [
              _FilterChip(
                label: 'All',
                selected: query.category == null,
                onTap: () => notifier.set(query.copyWith(category: () => null)),
              ),
              for (final c in categoriesOf(all))
                _FilterChip(
                  label: c,
                  selected: query.category == c,
                  onTap: () => notifier.set(query.copyWith(category: () => query.category == c ? null : c)),
                ),
            ],
          ),
        ),
        SliverToBoxAdapter(
          child: _ChipRow(
            children: [
              _FilterChip(
                icon: Icons.verified_rounded,
                label: 'Hygiene A',
                selected: query.onlyGradeA,
                onTap: () => notifier.set(query.copyWith(onlyGradeA: !query.onlyGradeA)),
              ),
              _FilterChip(
                icon: Icons.shield_outlined,
                label: 'Verified only',
                selected: query.onlyVerified,
                onTap: () => notifier.set(query.copyWith(onlyVerified: !query.onlyVerified)),
              ),
              _FilterChip(
                icon: Icons.schedule_rounded,
                label: 'Open now',
                selected: query.onlyOpen,
                onTap: () => notifier.set(query.copyWith(onlyOpen: !query.onlyOpen)),
              ),
            ],
          ),
        ),
        if (query.isEmpty && orderAgain.isNotEmpty) ...[
          const _SectionTitle(title: 'Order again'),
          _KitchenRow(kitchens: orderAgain, onOpen: open),
        ],
        if (query.isEmpty && favourites.isNotEmpty) ...[
          _SectionTitle(title: 'Your favourites', action: 'See all', onAction: () => context.push(Routes.favourites)),
          _KitchenRow(kitchens: favourites, onOpen: open),
        ],
        if (query.isEmpty && verified.isNotEmpty) ...[
          _SectionTitle(
            title: 'Hygiene verified',
            action: 'How it works',
            onAction: () => showHygieneExplainer(context),
          ),
          _KitchenRow(kitchens: verified, onOpen: open),
        ],
        _SectionTitle(title: query.isEmpty ? 'All kitchens' : '${visible.length} kitchens'),
        if (visible.isEmpty)
          SliverToBoxAdapter(
            child: EmptyState(
              icon: Icons.search_off_rounded,
              title: 'No kitchens match',
              message: 'Try removing a filter.',
              action: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size(160, 44)),
                onPressed: () => notifier.set(const KitchenQuery()),
                child: const Text('Clear filters'),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
            sliver: SliverList.separated(
              itemCount: visible.length,
              separatorBuilder: (_, _) => const SizedBox(height: 24),
              itemBuilder: (_, i) =>
                  KitchenCard(kitchen: visible[i], showFavourite: true, onTap: () => open(visible[i])),
            ),
          ),
      ],
    );
  }

  static String _greeting(String? name) {
    final h = DateTime.now().hour;
    final part = h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
    return name == null || name.isEmpty ? part : '$part, $name';
  }
}

class _SearchPill extends StatelessWidget {
  const _SearchPill({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.colors.fill,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
          child: Row(
            children: [
              Icon(Icons.search_rounded, color: context.colors.ink),
              const SizedBox(width: 10),
              Text(
                'Search kitchens or food',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.colors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        scrollDirection: Axis.horizontal,
        itemCount: children.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) => children[i],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap, this.icon});

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      avatar: icon == null ? null : Icon(icon, size: 16, color: selected ? context.colors.onInk : context.colors.ink),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.action, this.onAction});

  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 22, 12, 12),
      sliver: SliverToBoxAdapter(
        child: Row(
          children: [
            Expanded(child: Text(title, style: Theme.of(context).textTheme.headlineSmall)),
            if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
          ],
        ),
      ),
    );
  }
}

/// Dark banner: what makes this marketplace different.
class _TrustBanner extends StatelessWidget {
  const _TrustBanner({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    // Always a dark card with white text; in dark mode a lifted surface so it still stands out.
    return Material(
      color: Theme.of(context).brightness == Brightness.dark ? context.colors.fill : AppColors.brandNavy,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.verified_rounded, color: context.colors.primary, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          'HYGIENE VERIFIED',
                          style: t.labelSmall?.copyWith(color: context.colors.primary, letterSpacing: 1.2),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'See the kitchen\u2019s hygiene before you order.',
                      style: t.titleLarge?.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Grades come from live sensors and AI, not one-off inspections.',
                      style: t.bodySmall?.copyWith(color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.arrow_forward_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

/// Horizontal row of kitchen cards.
class _KitchenRow extends StatelessWidget {
  const _KitchenRow({required this.kitchens, required this.onOpen});

  final List<Kitchen> kitchens;
  final void Function(Kitchen) onOpen;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 232,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          scrollDirection: Axis.horizontal,
          itemCount: kitchens.length,
          separatorBuilder: (_, _) => const SizedBox(width: 14),
          itemBuilder: (_, i) =>
              KitchenCard(kitchen: kitchens[i], width: 300, showFavourite: true, onTap: () => onOpen(kitchens[i])),
        ),
      ),
    );
  }
}
