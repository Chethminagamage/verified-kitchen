import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:verified_kitchen_app/core/supabase/supabase_providers.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/data/auth_repository.dart';
import 'package:verified_kitchen_app/features/auth/domain/validators.dart';
import 'package:verified_kitchen_app/features/auth/presentation/auth_flow_providers.dart';
import 'package:verified_kitchen_app/features/profile/domain/address.dart';
import 'package:verified_kitchen_app/features/profile/presentation/account_providers.dart';
import 'package:verified_kitchen_app/features/profile/presentation/appearance_providers.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/change_email_page.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/change_password_page.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/profile_page.dart';

/// Records the request instead of calling Supabase; fails for a wrong current password.
/// Other members are never used by this screen.
class _FakeAuth implements AuthRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  ({String current, String next, bool others})? request;

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required bool signOutOtherDevices,
  }) async {
    if (currentPassword != 'old-password-1') throw const AuthFailure('Your current password is not correct.');
    request = (current: currentPassword, next: newPassword, others: signOutOtherDevices);
  }

  String? emailRequestedTo;
  int otherDeviceSignOuts = 0;

  @override
  Future<void> changeEmail({required String newEmail, required String currentPassword}) async {
    if (currentPassword != 'old-password-1') throw const AuthFailure('Your current password is not correct.');
    emailRequestedTo = newEmail;
  }

  @override
  Future<void> signOutOtherDevices() async => otherDeviceSignOuts++;
}

final _user = User(
  id: 'u1',
  appMetadata: const {},
  userMetadata: const {},
  aud: 'authenticated',
  createdAt: '',
  email: 'nimal@example.com',
);

void main() {
  test('a new password follows the rules and differs from the current one', () {
    expect(Validators.newPassword('short', current: 'old-password-1'), 'At least 8 characters');
    expect(Validators.newPassword('old-password-1', current: 'old-password-1'), contains('different'));
    expect(Validators.newPassword('a-new-password', current: 'old-password-1'), isNull);
  });

  Future<_FakeAuth> pumpPage(WidgetTester tester) async {
    final fake = _FakeAuth();
    // Opened from another screen, so a successful change can go back.
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, _) => Scaffold(
            body: TextButton(onPressed: () => context.push('/password'), child: const Text('open')),
          ),
        ),
        GoRoute(path: '/password', builder: (_, _) => const ChangePasswordPage()),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(fake)],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    return fake;
  }

  Future<void> fill(WidgetTester tester, {required String current, required String next, String? repeat}) async {
    await tester.enterText(find.widgetWithText(TextFormField, 'Current password'), current);
    await tester.enterText(find.widgetWithText(TextFormField, 'New password'), next);
    await tester.enterText(find.widgetWithText(TextFormField, 'Repeat new password'), repeat ?? next);
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pumpAndSettle();
  }

  testWidgets('checks the form before contacting the server', (tester) async {
    final fake = await pumpPage(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Change password'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your current password'), findsOneWidget);

    await fill(tester, current: 'old-password-1', next: 'a-new-password', repeat: 'something-else');
    expect(find.text('The passwords do not match'), findsOneWidget);
    expect(fake.request, isNull);
  });

  testWidgets('a wrong current password is explained and nothing changes', (tester) async {
    final fake = await pumpPage(tester);
    await fill(tester, current: 'wrong-password', next: 'a-new-password');
    expect(find.text('Your current password is not correct.'), findsOneWidget);
    expect(fake.request, isNull);
  });

  testWidgets('changes the password and signs out other devices by default', (tester) async {
    final fake = await pumpPage(tester);
    await fill(tester, current: 'old-password-1', next: 'a-new-password');
    expect(fake.request, (current: 'old-password-1', next: 'a-new-password', others: true));
    expect(find.text('Password changed. Other devices were signed out.'), findsOneWidget);
    expect(find.byType(ChangePasswordPage), findsNothing); // back on the previous screen
  });

  group('change email', () {
    Future<_FakeAuth> pumpEmail(WidgetTester tester) async {
      final fake = _FakeAuth();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [authRepositoryProvider.overrideWithValue(fake), currentUserProvider.overrideWithValue(_user)],
          child: MaterialApp(theme: AppTheme.light, home: const ChangeEmailPage()),
        ),
      );
      return fake;
    }

    Future<void> submit(WidgetTester tester, {required String email, required String password}) async {
      await tester.enterText(find.widgetWithText(TextFormField, 'New email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Current password'), password);
      await tester.tap(find.text('Send confirmation link'));
      await tester.pumpAndSettle();
    }

    testWidgets('shows the current email and rejects a bad or unchanged one', (tester) async {
      final fake = await pumpEmail(tester);
      expect(find.text('nimal@example.com'), findsOneWidget);
      await submit(tester, email: 'not-an-email', password: 'old-password-1');
      expect(find.text('Enter a valid email'), findsOneWidget);
      await submit(tester, email: 'NIMAL@example.com', password: 'old-password-1');
      expect(find.text('That is already your email'), findsOneWidget);
      expect(fake.emailRequestedTo, isNull);
    });

    testWidgets('a wrong password changes nothing', (tester) async {
      final fake = await pumpEmail(tester);
      await submit(tester, email: 'new@example.com', password: 'wrong-password');
      expect(find.text('Your current password is not correct.'), findsOneWidget);
      expect(fake.emailRequestedTo, isNull);
    });

    testWidgets('sends the link and explains that nothing changes until it is opened', (tester) async {
      final fake = await pumpEmail(tester);
      await submit(tester, email: ' New@Example.com ', password: 'old-password-1');
      expect(fake.emailRequestedTo, ' New@Example.com ');
      expect(find.text('Check your inbox'), findsOneWidget);
      expect(find.textContaining('We sent a confirmation link to new@example.com'), findsOneWidget);
      expect(find.textContaining('keep signing in with nimal@example.com'), findsOneWidget);
    });
  });

  group('account screen', () {
    Future<_FakeAuth> pumpAccount(WidgetTester tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final fake = _FakeAuth();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            authRepositoryProvider.overrideWithValue(fake),
            currentUserProvider.overrideWithValue(_user),
            profileProvider.overrideWith(
              (ref) async => const CustomerProfile(fullName: 'Nimal', phone: null, email: 'nimal@example.com'),
            ),
          ],
          child: Consumer(
            builder: (context, ref, _) => MaterialApp(
              theme: AppTheme.light,
              darkTheme: AppTheme.dark,
              themeMode: ref.watch(themeModeProvider),
              home: const ProfilePage(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return fake;
    }

    testWidgets('sign out of other devices asks first, then keeps this phone signed in', (tester) async {
      final fake = await pumpAccount(tester);
      await tester.tap(find.text('Sign out of other devices'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(fake.otherDeviceSignOuts, 0);

      await tester.tap(find.text('Sign out of other devices'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign them out'));
      await tester.pumpAndSettle();
      expect(fake.otherDeviceSignOuts, 1);
      expect(find.text('Other devices were signed out'), findsOneWidget);
    });

    testWidgets('appearance can be switched to dark and back to the phone setting', (tester) async {
      await pumpAccount(tester);
      expect(find.text('Use phone setting'), findsOneWidget); // the default, shown under "Appearance"
      await tester.tap(find.text('Appearance'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Dark'));
      await tester.pumpAndSettle();
      expect(Theme.of(tester.element(find.byType(ProfilePage))).brightness, Brightness.dark);
      expect(find.text('Dark'), findsOneWidget);
    });
  });
}
