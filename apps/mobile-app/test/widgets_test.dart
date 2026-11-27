import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/features/auth/presentation/pages/sign_in_page.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/hygiene.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/hygiene_badge.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/hygiene_panel.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/kitchen_card.dart';
import 'package:verified_kitchen_app/features/kitchens/presentation/widgets/score_ring.dart';

import 'domain_test.dart' show row;

Widget wrap(Widget child) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: SingleChildScrollView(child: child)),
  ),
);

void main() {
  testWidgets('badge says what the customer needs to know', (tester) async {
    await tester.pumpWidget(
      wrap(
        const Column(
          children: [
            HygieneBadge(status: HygieneStatus.verified, grade: HygieneGrade.a),
            HygieneBadge(status: HygieneStatus.incomplete, grade: HygieneGrade.b),
            HygieneBadge(status: HygieneStatus.notMonitored, grade: null),
            HygieneBadge(status: HygieneStatus.pending, grade: null),
          ],
        ),
      ),
    );
    expect(find.text('Hygiene A'), findsOneWidget);
    expect(find.text('Hygiene B · limited'), findsOneWidget);
    expect(find.text('Not verified'), findsOneWidget);
    expect(find.text('Rating pending'), findsOneWidget);
  });

  testWidgets('kitchen card shows name, badge, and a closed overlay', (tester) async {
    final k = Kitchen.fromJson(row('Kandy Kottu', status: 'verified', grade: 'A', open: false));
    await tester.pumpWidget(wrap(KitchenCard(kitchen: k, onTap: () {})));
    expect(find.text('Kandy Kottu'), findsOneWidget);
    expect(find.text('Hygiene A'), findsOneWidget);
    expect(find.text('Closed · opens 08:00'), findsOneWidget);
  });

  testWidgets('hygiene panel: pillars, and "Not monitored" for a pillar without evidence', (tester) async {
    final k = Kitchen.fromJson(row('K', status: 'verified', grade: 'A'));
    await tester.pumpWidget(wrap(HygienePanel(kitchen: k, history: const [], now: DateTime.utc(2026, 11, 15, 10, 5))));
    expect(find.text('Hygiene A · Good'), findsOneWidget);
    expect(find.text('Why this grade'), findsOneWidget);
    expect(find.text('Food preparation'), findsOneWidget);
    expect(find.text('Strong'), findsNWidgets(2)); // personal 90, environment 85.5: words, not numbers
    expect(find.text('Not monitored yet'), findsOneWidget);
    expect(find.text('90'), findsNothing);
    expect(find.textContaining('93% of opening hours monitored'), findsOneWidget);
    expect(find.textContaining('Hygiene alert'), findsNothing);
  });

  testWidgets('a C grade shows a hygiene alert before ordering', (tester) async {
    final k = Kitchen.fromJson(row('K', status: 'verified', grade: 'C'));
    await tester.pumpWidget(wrap(HygienePanel(kitchen: k, history: const [], now: DateTime.utc(2026, 11, 15))));
    expect(find.textContaining('Hygiene alert'), findsOneWidget);
  });

  testWidgets('an unmonitored kitchen explains why there is no grade', (tester) async {
    final k = Kitchen.fromJson(row('Demo'));
    await tester.pumpWidget(wrap(HygienePanel(kitchen: k, history: const [], now: DateTime.utc(2026, 11, 15))));
    expect(find.text('Not verified'), findsOneWidget);
    expect(find.textContaining('does not use Verified Kitchen monitoring'), findsOneWidget);
    expect(find.text('Personal hygiene'), findsNothing);
  });

  testWidgets('the score ring shows the score in the grade colour; no score shows no number', (tester) async {
    final k = Kitchen.fromJson(row('K', status: 'verified', grade: 'A'));
    await tester.pumpWidget(wrap(HygienePanel(kitchen: k, history: const [], now: DateTime.utc(2026, 11, 15))));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Hygiene score 88 out of 100'), findsOneWidget);
    expect(find.textContaining('Lowered mainly'), findsNothing); // an A needs no reason

    await tester.pumpWidget(wrap(const ScoreRing(score: null, grade: null)));
    expect(find.bySemanticsLabel('No hygiene score yet'), findsOneWidget);
    expect(find.byIcon(Icons.shield_outlined), findsOneWidget);
  });

  testWidgets('a grade below A says which area lowered it', (tester) async {
    final k = Kitchen.fromJson({...row('K', status: 'verified', grade: 'B'), 'food_prep_score': 58});
    await tester.pumpWidget(wrap(HygienePanel(kitchen: k, history: const [], now: DateTime.utc(2026, 11, 15))));
    expect(find.text('Lowered mainly by food preparation.'), findsOneWidget);
  });

  testWidgets('sign-in form validates before contacting the server', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(theme: AppTheme.light, home: const SignInPage()),
      ),
    );
    await tester.tap(find.text('Sign in'));
    await tester.pump();
    expect(find.text('Enter your email'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);
  });
}
