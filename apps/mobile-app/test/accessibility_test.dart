import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:verified_kitchen_app/core/supabase/supabase_providers.dart';
import 'package:verified_kitchen_app/core/theme/app_colors.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/presentation/auth_flow_providers.dart';
import 'package:verified_kitchen_app/features/auth/presentation/pages/sign_in_page.dart';
import 'package:verified_kitchen_app/features/auth/presentation/pages/welcome_page.dart';
import 'package:verified_kitchen_app/features/cart/presentation/cart_providers.dart';
import 'package:verified_kitchen_app/features/cart/presentation/pages/cart_page.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/kitchen_providers.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/dish_sheet.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/hygiene_panel.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/kitchen_card.dart';
import 'package:verified_kitchen_app/features/profile/domain/address.dart';
import 'package:verified_kitchen_app/features/profile/presentation/account_providers.dart';
import 'package:verified_kitchen_app/features/profile/presentation/appearance_providers.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/change_email_page.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/change_password_page.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/edit_profile_page.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/profile_page.dart';
import 'package:verified_kitchen_app/features/notifications/domain/notification.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/notification_providers.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/pages/notification_settings_page.dart';
import 'package:verified_kitchen_app/features/notifications/presentation/pages/notifications_page.dart';

import 'domain_test.dart' show row;
import 'notifications_test.dart' as n show FakeRepository, FakePush, row;

final _user = User(
  id: 'u1',
  appMetadata: const {},
  userMetadata: const {'full_name': 'Nimal Perera'},
  aud: 'authenticated',
  createdAt: '',
  email: 'nimal.perera.longname@example.com',
);

final _kitchen = Kitchen.fromJson({
  ...row('Kandy Kottu House and Rice', status: 'verified', grade: 'B'),
  'food_prep_score': 58,
});
const _dish = MenuItem(
  id: 'd1',
  name: 'Chicken kottu with extra cheese',
  description: 'Godamba roti, chicken, egg, vegetables and mozzarella',
  category: 'Kottu',
  priceLkr: 1150,
  emoji: '🥘',
  isAvailable: true,
);

void main() {
  /// Renders [screen] on a small phone (360 × 780 dp) at [scale] text size.
  /// Any text or layout overflow fails the test.
  Future<void> pumpScreen(WidgetTester tester, Widget screen, {required double scale, required ThemeMode mode}) async {
    tester.view
      ..physicalSize = const Size(360 * 3, 780 * 3)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        currentUserProvider.overrideWithValue(_user),
        profileProvider.overrideWith(
          (ref) async =>
              const CustomerProfile(fullName: 'Nimal Perera', phone: '077 123 4567', email: 'nimal@example.com'),
        ),
        favouritesProvider.overrideWith(_NoFavourites.new),
        kitchenProvider.overrideWith((ref, id) async => _kitchen),
        notificationsRepositoryProvider.overrideWithValue(
          n.FakeRepository([
            AppNotification.fromJson({
              ...n.row('n1', kind: 'order_hygiene_changed'),
              'title': 'Hygiene change at Kandy Kottu House and Rice',
              'body': 'Since you ordered, the hygiene grade dropped from B to C. You can still cancel until the kitchen accepts your order.',
            }),
            AppNotification.fromJson(n.row('n2', readAt: '2026-11-28T07:00:00Z')),
          ]),
        ),
        pushServiceProvider.overrideWithValue(n.FakePush()),
      ],
    );
    addTearDown(container.dispose);
    container.read(cartProvider.notifier).add(_kitchen, _dish, quantity: 2);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: mode,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: screen,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  final screens = <String, Widget>{
    'welcome': const WelcomePage(),
    'sign in': const SignInPage(),
    'kitchen card': Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [KitchenCard(kitchen: _kitchen, onTap: () {})],
      ),
    ),
    'hygiene panel': Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: HygienePanel(kitchen: _kitchen, history: const [], now: DateTime.utc(2026, 11, 27)),
      ),
    ),
    'dish sheet': Scaffold(
      body: SingleChildScrollView(
        child: DishSheet(kitchen: _kitchen, item: _dish),
      ),
    ),
    'cart': const CartPage(),
    'account': const ProfilePage(),
    'personal information': const EditProfilePage(),
    'change password': const ChangePasswordPage(),
    'change email': const ChangeEmailPage(),
    'notifications inbox': const NotificationsPage(),
    'notification settings': const NotificationSettingsPage(),
  };

  for (final mode in [ThemeMode.light, ThemeMode.dark]) {
    for (final scale in [1.0, 1.5, maxTextScale]) {
      group('${mode.name} mode, text ${(scale * 100).round()} %', () {
        for (final entry in screens.entries) {
          testWidgets('${entry.key} fits without overflow', (tester) async {
            await pumpScreen(tester, entry.value, scale: scale, mode: mode);
            expect(tester.takeException(), isNull);
          });
        }
      });
    }
  }

  testWidgets('dark mode uses the dark palette', (tester) async {
    await pumpScreen(tester, const ProfilePage(), scale: 1, mode: ThemeMode.dark);
    final context = tester.element(find.byType(ProfilePage));
    expect(context.colors.background, AppColors.dark.background);
    expect(Theme.of(context).brightness, Brightness.dark);
  });

  test('the appearance choice is remembered on the device', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    ProviderContainer open() {
      final c = ProviderContainer(overrides: [sharedPreferencesProvider.overrideWithValue(prefs)]);
      addTearDown(c.dispose);
      return c;
    }

    expect(open().read(themeModeProvider), ThemeMode.system); // follows the phone by default
    await open().read(themeModeProvider.notifier).set(ThemeMode.dark);
    expect(open().read(themeModeProvider), ThemeMode.dark);
  });
}

class _NoFavourites extends FavouritesNotifier {
  @override
  Future<Set<String>> build() async => {};
}
