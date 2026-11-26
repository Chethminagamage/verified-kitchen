import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../kitchens/domain/kitchen.dart';
import '../../../kitchens/domain/kitchen_filters.dart';
import '../../../kitchens/presentation/kitchen_providers.dart';
import '../../../kitchens/presentation/widgets/kitchen_card.dart';
import '../account_providers.dart';

class FavouritesPage extends ConsumerWidget {
  const FavouritesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favourites = ref.watch(favouritesProvider);
    final kitchens = ref.watch(kitchensProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Favourites')),
      body: AsyncView<List<Kitchen>>(
        value: kitchens,
        onRetry: () => ref.invalidate(kitchensProvider),
        data: (all) {
          final ids = favourites.value ?? const <String>{};
          final list = applyKitchenQuery(all.where((k) => ids.contains(k.id)), const KitchenQuery());
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.favorite_border_rounded,
              title: 'No favourites yet',
              message: 'Tap the heart on a kitchen to save it here.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 24),
            itemBuilder: (_, i) => KitchenCard(kitchen: list[i], onTap: () => context.push(Routes.kitchen(list[i].id))),
          );
        },
      ),
    );
  }
}
