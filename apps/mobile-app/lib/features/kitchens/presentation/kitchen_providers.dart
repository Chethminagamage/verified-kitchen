import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_providers.dart';
import '../data/kitchen_repository.dart';
import '../domain/kitchen.dart';
import '../domain/kitchen_filters.dart';

final kitchenRepositoryProvider = Provider<KitchenRepository>(
  (ref) => KitchenRepository(ref.watch(supabaseClientProvider)),
);

/// All listed kitchens. Refreshed on pull-to-refresh and every 60 s while
/// watched, so grades and "open now" stay current (views have no realtime).
final kitchensProvider = FutureProvider<List<Kitchen>>((ref) async {
  final timer = Stream<void>.periodic(const Duration(seconds: 60)).listen((_) => ref.invalidateSelf());
  ref.onDispose(timer.cancel);
  return ref.watch(kitchenRepositoryProvider).kitchens();
});

final kitchenProvider = FutureProvider.family<Kitchen?, String>((ref, id) async {
  final timer = Stream<void>.periodic(const Duration(seconds: 60)).listen((_) => ref.invalidateSelf());
  ref.onDispose(timer.cancel);
  return ref.watch(kitchenRepositoryProvider).kitchen(id);
});

final menuProvider = FutureProvider.family<List<MenuItem>, String>(
  (ref, id) => ref.watch(kitchenRepositoryProvider).menu(id),
);

final hygieneHistoryProvider = FutureProvider.family<List<HygieneDay>, String>(
  (ref, id) => ref.watch(kitchenRepositoryProvider).history(id),
);

/// Search box + filter chips on the home and search screens.
class KitchenQueryNotifier extends Notifier<KitchenQuery> {
  @override
  KitchenQuery build() => const KitchenQuery();

  void set(KitchenQuery query) => state = query;
}

final kitchenQueryProvider = NotifierProvider<KitchenQueryNotifier, KitchenQuery>(KitchenQueryNotifier.new);
