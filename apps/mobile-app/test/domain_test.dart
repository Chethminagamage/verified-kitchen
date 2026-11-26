import 'package:flutter_test/flutter_test.dart';
import 'package:verified_kitchen_app/core/router/app_router.dart';
import 'package:verified_kitchen_app/core/router/routes.dart';
import 'package:verified_kitchen_app/core/utils/formatting.dart';
import 'package:verified_kitchen_app/features/auth/domain/validators.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/hygiene.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen_filters.dart';

Map<String, dynamic> row(
  String name, {
  String? status,
  String? grade,
  bool open = true,
  String cuisine = 'Kottu · Street food',
}) => {
  'id': name,
  'name': name,
  'location': 'Kandy',
  'cuisine': cuisine,
  'description': null,
  'emoji': '🍛',
  'delivery_fee_lkr': 250,
  'prep_minutes': 25,
  'opens_at': '08:00:00',
  'closes_at': '22:00:00',
  'is_open': open,
  'rating_status': status ?? 'not_monitored',
  'rating': grade == null ? null : 88.4,
  'grade': grade,
  'personal_score': grade == null ? null : 90,
  'food_prep_score': null,
  'environmental_score': grade == null ? null : 85.5,
  'coverage': grade == null ? null : 0.93,
  'rating_updated_at': '2026-11-15T10:00:00Z',
  'monitored_now': grade != null,
};

void main() {
  group('Kitchen from the marketplace view', () {
    test('parses a verified kitchen', () {
      final k = Kitchen.fromJson(row('Kitchen 1', status: 'verified', grade: 'A'));
      expect(k.status, HygieneStatus.verified);
      expect(k.grade, HygieneGrade.a);
      expect(k.foodPrepScore, isNull); // pillar without evidence stays empty, never 0
      expect(k.coverage, 0.93);
      expect(k.category, 'Kottu');
      expect(k.isMonitored, isTrue);
    });

    test('an unmonitored kitchen has no grade', () {
      final k = Kitchen.fromJson(row('Demo'));
      expect(k.status, HygieneStatus.notMonitored);
      expect(k.grade, isNull);
      expect(k.isMonitored, isFalse);
    });

    test('unknown values from the server are handled safely', () {
      expect(HygieneStatus.parse('something-new'), HygieneStatus.notMonitored);
      expect(HygieneGrade.parse('E'), isNull);
      expect(HygieneGrade.c.needsAlert, isTrue);
      expect(HygieneGrade.a.needsAlert, isFalse);
    });
  });

  group('listing and filters', () {
    final kitchens = [
      Kitchen.fromJson(row('Zed demo')),
      Kitchen.fromJson(row('Closed A', status: 'verified', grade: 'A', open: false)),
      Kitchen.fromJson(row('Open B', status: 'verified', grade: 'B', cuisine: 'Pizza · Italian')),
      Kitchen.fromJson(row('Open A', status: 'verified', grade: 'A')),
      Kitchen.fromJson(row('Limited', status: 'incomplete', grade: 'B')),
    ];

    test('open first, then verified, then better grade', () {
      final names = applyKitchenQuery(kitchens, const KitchenQuery()).map((k) => k.name).toList();
      expect(names, ['Open A', 'Open B', 'Limited', 'Zed demo', 'Closed A']);
    });

    test('hygiene A filter keeps only grade A', () {
      final names = applyKitchenQuery(kitchens, const KitchenQuery(onlyGradeA: true)).map((k) => k.name);
      expect(names, ['Open A', 'Closed A']);
    });

    test('verified-only, open-now, category and text filters', () {
      expect(applyKitchenQuery(kitchens, const KitchenQuery(onlyVerified: true)).length, 3);
      expect(applyKitchenQuery(kitchens, const KitchenQuery(onlyOpen: true)).any((k) => !k.isOpen), isFalse);
      expect(applyKitchenQuery(kitchens, const KitchenQuery(category: 'Pizza')).single.name, 'Open B');
      expect(applyKitchenQuery(kitchens, const KitchenQuery(text: 'italian')).single.name, 'Open B');
    });

    test('categories are distinct, in order', () {
      expect(categoriesOf(kitchens), ['Kottu', 'Pizza']);
    });
  });

  group('formatting', () {
    test('rupees', () {
      expect(formatLkr(1250), 'LKR 1,250');
      expect(formatLkr(99.5), 'LKR 99.50');
    });

    test('time ago', () {
      final now = DateTime.utc(2026, 11, 15, 12);
      expect(formatAgo(now.subtract(const Duration(seconds: 20)), now), 'just now');
      expect(formatAgo(now.subtract(const Duration(minutes: 4)), now), '4 min ago');
      expect(formatAgo(now.subtract(const Duration(hours: 3)), now), '3 h ago');
      expect(formatAgo(now.subtract(const Duration(days: 1)), now), '1 day ago');
    });

    test('clock', () => expect(formatClock('08:00:00'), '08:00'));
  });

  group('sign-up validation matches the database rules', () {
    test('phone', () {
      expect(Validators.phone('077 123 4567'), isNull);
      expect(Validators.phone('+94771234567'), isNull);
      expect(Validators.phone('12345'), isNotNull);
      expect(Validators.phone('call me'), isNotNull);
    });

    test('email, password, name', () {
      expect(Validators.email('nimal@example.com'), isNull);
      expect(Validators.email('nimal@'), isNotNull);
      expect(Validators.password('short'), isNotNull);
      expect(Validators.password('long enough'), isNull);
      expect(Validators.name(' '), isNotNull);
    });
  });

  group('an account is required', () {
    test('signed out: everything leads to sign-in, except sign-in and sign-up', () {
      expect(authRedirect(signedIn: false, location: Routes.home), Routes.signIn);
      expect(authRedirect(signedIn: false, location: Routes.kitchen('x')), Routes.signIn);
      expect(authRedirect(signedIn: false, location: Routes.signUp), isNull);
    });

    test('signed in: the auth screens lead home', () {
      expect(authRedirect(signedIn: true, location: Routes.signIn), Routes.home);
      expect(authRedirect(signedIn: true, location: Routes.kitchen('x')), isNull);
    });
  });
}
