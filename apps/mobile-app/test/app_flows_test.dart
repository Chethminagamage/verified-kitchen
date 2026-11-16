import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:verified_kitchen_app/core/router/app_router.dart';
import 'package:verified_kitchen_app/core/router/routes.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/presentation/auth_flow_providers.dart';
import 'package:verified_kitchen_app/features/auth/presentation/pages/password_pages.dart';
import 'package:verified_kitchen_app/features/auth/presentation/pages/welcome_page.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/hygiene.dart';
import 'package:verified_kitchen_app/features/orders/domain/order.dart';
import 'package:verified_kitchen_app/features/profile/presentation/pages/support_pages.dart';

void main() {
  group('navigation rules', () {
    test('first launch shows the welcome slides before anything else', () {
      expect(authRedirect(signedIn: false, location: Routes.signIn, onboardingSeen: false), Routes.welcome);
      expect(authRedirect(signedIn: false, location: Routes.welcome, onboardingSeen: false), isNull);
      expect(authRedirect(signedIn: false, location: Routes.forgotPassword), isNull);
    });

    test('a reset link leads straight to "set a new password"', () {
      expect(authRedirect(signedIn: true, location: Routes.home, recoveringPassword: true), Routes.resetPassword);
      expect(authRedirect(signedIn: true, location: Routes.resetPassword, recoveringPassword: true), isNull);
      // Without a recovery session the page is not reachable.
      expect(authRedirect(signedIn: true, location: Routes.resetPassword), Routes.home);
      expect(authRedirect(signedIn: false, location: Routes.resetPassword), Routes.signIn);
    });
  });

  group('plain-language hygiene levels', () {
    test('use the same bands as the grade', () {
      expect(PillarLevel.of(100), PillarLevel.strong);
      expect(PillarLevel.of(75), PillarLevel.strong);
      expect(PillarLevel.of(74.9), PillarLevel.good);
      expect(PillarLevel.of(50), PillarLevel.good);
      expect(PillarLevel.of(30), PillarLevel.needsImprovement);
      expect(PillarLevel.of(10), PillarLevel.poor);
      expect(PillarLevel.of(null), PillarLevel.notMonitored);
    });
  });

  group('order feedback', () {
    test('parses what the customer sent', () {
      final f = OrderFeedback.fromJson({'rating': 4, 'problem': 'cold', 'comment': 'Rice was cold'});
      expect(f.rating, 4);
      expect(f.problem, OrderProblem.cold);
      expect(OrderProblem.parse('teleported'), isNull);
      expect(OrderProblem.values.map((p) => p.value), contains('hygiene_concern'));
    });
  });

  Future<ProviderContainer> pumpWith(WidgetTester tester, Widget page) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(overrides: [sharedPreferencesProvider.overrideWithValue(prefs)]);
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(theme: AppTheme.light, home: page),
      ),
    );
    return container;
  }

  testWidgets('welcome slides step through and offer sign-up', (tester) async {
    await pumpWith(tester, const WelcomePage());
    expect(find.text('Know the kitchen before you order'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Measured live, not once a year'), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Private by design'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);
  });

  testWidgets('the onboarding flag is remembered on the device', (tester) async {
    final container = await pumpWith(tester, const SizedBox());
    expect(container.read(onboardingSeenProvider), isFalse);
    await container.read(onboardingSeenProvider.notifier).complete();
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool(OnboardingNotifier.key), isTrue);
  });

  testWidgets('forgot password validates the email first', (tester) async {
    await pumpWith(tester, const ForgotPasswordPage());
    await tester.tap(find.text('Send reset link'));
    await tester.pump();
    expect(find.text('Enter your email'), findsOneWidget);
  });

  testWidgets('new password must be repeated correctly', (tester) async {
    await pumpWith(tester, const ResetPasswordPage());
    await tester.enterText(find.byType(TextFormField).at(0), 'a-long-password');
    await tester.enterText(find.byType(TextFormField).at(1), 'something-else');
    await tester.tap(find.text('Save new password'));
    await tester.pump();
    expect(find.text('The passwords do not match'), findsOneWidget);
  });

  testWidgets('deleting an account needs DELETE typed first', (tester) async {
    await pumpWith(tester, const DeleteAccountPage());
    FilledButton button() => tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Delete my account'));
    expect(button().onPressed, isNull);
    await tester.enterText(find.byType(TextField), 'delete');
    await tester.pump();
    expect(button().onPressed, isNotNull);
  });

  testWidgets('help answers are there and expand', (tester) async {
    await pumpWith(tester, const HelpPage());
    await tester.tap(find.text('Can I cancel an order?'));
    await tester.pumpAndSettle();
    expect(find.textContaining('until the kitchen accepts it'), findsOneWidget);
  });
}
