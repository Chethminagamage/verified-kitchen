import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verified_kitchen_app/app.dart';

void main() {
  testWidgets('Verified Kitchen starts on splash page', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: VerifiedKitchenApp()));

    expect(find.text('Verified Kitchen'), findsWidgets);

    expect(find.text('Hygiene Intelligence Platform'), findsWidgets);

    expect(
      find.text('Transparent hygiene.\nTrusted food choices.'),
      findsOneWidget,
    );

    expect(find.text('Preparing your experience...'), findsOneWidget);
  });
}
