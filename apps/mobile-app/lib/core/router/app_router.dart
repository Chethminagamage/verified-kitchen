import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_flow_providers.dart';
import '../../features/auth/presentation/pages/password_pages.dart';
import '../../features/auth/presentation/pages/sign_in_page.dart';
import '../../features/auth/presentation/pages/welcome_page.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/cart/presentation/pages/checkout_page.dart';
import '../../features/auth/presentation/pages/sign_up_page.dart';
import '../../features/kitchens/presentation/pages/home_page.dart';
import '../../features/kitchens/presentation/pages/kitchen_page.dart';
import '../../features/kitchens/presentation/pages/search_page.dart';
import '../../features/navigation/presentation/app_shell.dart';
import '../../features/orders/presentation/pages/order_page.dart';
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/profile/domain/address.dart';
import '../../features/profile/presentation/account_providers.dart';
import '../../features/profile/presentation/pages/about_page.dart';
import '../../features/profile/presentation/pages/addresses_page.dart';
import '../../features/profile/presentation/pages/edit_profile_page.dart';
import '../../features/profile/presentation/pages/favourites_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/support_pages.dart';
import '../widgets/async_view.dart';
import '../supabase/supabase_providers.dart';
import 'routes.dart';

/// Where a user may go. An account is required for everything except the
/// welcome, sign-in, sign-up and forgot-password screens (as in ride-hailing
/// and delivery apps).
String? authRedirect({
  required bool signedIn,
  required String location,
  bool onboardingSeen = true,
  bool recoveringPassword = false,
}) {
  final isPublic = Routes.public.contains(location);
  if (signedIn && recoveringPassword) {
    return location == Routes.resetPassword ? null : Routes.resetPassword;
  }
  if (!signedIn) {
    if (!onboardingSeen && location != Routes.welcome) return Routes.welcome;
    return isPublic ? null : Routes.signIn;
  }
  if (isPublic || location == Routes.resetPassword) return Routes.home;
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final refresh = _AuthRefresh(client.auth.onAuthStateChange);
  ref.onDispose(refresh.dispose);
  // Re-check the rules when onboarding finishes or a reset link is opened.
  ref.listen(onboardingSeenProvider, (_, _) => refresh.ping());
  ref.listen(passwordRecoveryProvider, (_, _) => refresh.ping());

  return GoRouter(
    initialLocation: Routes.home,
    refreshListenable: refresh,
    redirect: (context, state) => authRedirect(
      signedIn: client.auth.currentSession != null,
      location: state.matchedLocation,
      onboardingSeen: ref.read(onboardingSeenProvider),
      recoveringPassword: ref.read(passwordRecoveryProvider),
    ),
    routes: [
      GoRoute(path: Routes.signIn, builder: (_, _) => const SignInPage()),
      GoRoute(path: Routes.signUp, builder: (_, _) => const SignUpPage()),
      GoRoute(path: Routes.welcome, builder: (_, _) => const WelcomePage()),
      GoRoute(
        path: Routes.forgotPassword,
        builder: (_, _) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: Routes.resetPassword,
        builder: (_, _) => const ResetPasswordPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: Routes.home, builder: (_, _) => const HomePage()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.orders,
                builder: (_, _) => const OrdersPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.profile,
                builder: (_, _) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(path: Routes.search, builder: (_, _) => const SearchPage()),
      GoRoute(path: Routes.cart, builder: (_, _) => const CartPage()),
      GoRoute(path: Routes.checkout, builder: (_, _) => const CheckoutPage()),
      GoRoute(
        path: '/orders/:id',
        builder: (_, state) => OrderPage(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: Routes.editProfile,
        builder: (_, _) => const EditProfilePage(),
      ),
      GoRoute(path: Routes.addresses, builder: (_, _) => const AddressesPage()),
      GoRoute(
        path: Routes.newAddress,
        builder: (_, _) => const AddressFormPage(),
      ),
      GoRoute(
        path: '/profile/addresses/:id',
        builder: (_, state) => _EditAddressRoute(
          id: state.pathParameters['id']!,
          fromList: state.extra is SavedAddress
              ? state.extra! as SavedAddress
              : null,
        ),
      ),
      GoRoute(
        path: Routes.favourites,
        builder: (_, _) => const FavouritesPage(),
      ),
      GoRoute(path: Routes.about, builder: (_, _) => const AboutPage()),
      GoRoute(path: Routes.help, builder: (_, _) => const HelpPage()),
      GoRoute(path: Routes.legal, builder: (_, _) => const LegalPage()),
      GoRoute(
        path: Routes.deleteAccount,
        builder: (_, _) => const DeleteAccountPage(),
      ),
      GoRoute(
        path: '/kitchen/:id',
        builder: (_, state) =>
            KitchenPage(kitchenId: state.pathParameters['id']!),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: const Center(child: Text('Page not found')),
    ),
  );
});

/// Re-evaluates redirects whenever the auth state changes (sign in / out / expiry).
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Stream<Object?> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<Object?> _sub;

  void ping() => notifyListeners();

  @override
  void dispose() {
    unawaited(_sub.cancel());
    super.dispose();
  }
}

/// Edit an address by id (works after a restart, when no object is passed along).
class _EditAddressRoute extends ConsumerWidget {
  const _EditAddressRoute({required this.id, required this.fromList});

  final String id;
  final SavedAddress? fromList;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (fromList != null) return AddressFormPage(address: fromList);
    return Scaffold(
      body: AsyncView<List<SavedAddress>>(
        value: ref.watch(addressesProvider),
        onRetry: () => ref.invalidate(addressesProvider),
        data: (list) {
          final a = list.where((x) => x.id == id).firstOrNull;
          return a == null
              ? const EmptyState(
                  icon: Icons.location_off_outlined,
                  title: 'Address not found',
                  message: '',
                )
              : AddressFormPage(address: a);
        },
      ),
    );
  }
}
