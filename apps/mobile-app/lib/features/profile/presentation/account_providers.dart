import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/errors.dart';
import '../../../core/supabase/supabase_providers.dart';
import '../data/account_repository.dart';
import '../domain/address.dart';

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => AccountRepository(ref.watch(supabaseClientProvider)),
);

final profileProvider = FutureProvider<CustomerProfile>((ref) {
  ref.watch(currentUserProvider); // reload after sign-in or a profile edit
  return ref.watch(accountRepositoryProvider).profile();
});

final addressesProvider = FutureProvider<List<SavedAddress>>((ref) {
  ref.watch(currentUserProvider);
  return ref.watch(accountRepositoryProvider).addresses();
});

/// Favourite kitchen ids. Toggling updates the screen immediately and rolls
/// back (with an error) if the server refuses.
class FavouritesNotifier extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() {
    ref.watch(currentUserProvider);
    return ref.read(accountRepositoryProvider).favouriteKitchenIds();
  }

  Future<void> toggle(String kitchenId) async {
    final before = state.value ?? const <String>{};
    final makeFavourite = !before.contains(kitchenId);
    state = AsyncData(
      makeFavourite ? {...before, kitchenId} : ({...before}..remove(kitchenId)),
    );
    try {
      await ref
          .read(accountRepositoryProvider)
          .setFavourite(kitchenId, favourite: makeFavourite);
    } on UserFacingError {
      state = AsyncData(before);
      rethrow;
    }
  }
}

final favouritesProvider =
    AsyncNotifierProvider<FavouritesNotifier, Set<String>>(
      FavouritesNotifier.new,
    );
