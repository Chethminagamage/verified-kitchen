import 'hygiene.dart';
import 'kitchen.dart';

/// What the customer has chosen to see (search box + filter chips).
class KitchenQuery {
  const KitchenQuery({
    this.text = '',
    this.category,
    this.onlyGradeA = false,
    this.onlyOpen = false,
    this.onlyVerified = false,
  });

  final String text;
  final String? category;
  final bool onlyGradeA;
  final bool onlyOpen;
  final bool onlyVerified;

  KitchenQuery copyWith({
    String? text,
    String? Function()? category,
    bool? onlyGradeA,
    bool? onlyOpen,
    bool? onlyVerified,
  }) => KitchenQuery(
    text: text ?? this.text,
    category: category != null ? category() : this.category,
    onlyGradeA: onlyGradeA ?? this.onlyGradeA,
    onlyOpen: onlyOpen ?? this.onlyOpen,
    onlyVerified: onlyVerified ?? this.onlyVerified,
  );

  bool get isEmpty =>
      text.trim().isEmpty &&
      category == null &&
      !onlyGradeA &&
      !onlyOpen &&
      !onlyVerified;
}

/// Filter, then order the list the way a hygiene-first marketplace should:
/// open kitchens first, then verified hygiene evidence, then the better grade.
List<Kitchen> applyKitchenQuery(Iterable<Kitchen> kitchens, KitchenQuery q) {
  final text = q.text.trim().toLowerCase();
  final out = kitchens.where((k) {
    if (text.isNotEmpty) {
      final hay = '${k.name} ${k.cuisine ?? ''} ${k.location ?? ''}'
          .toLowerCase();
      if (!hay.contains(text)) return false;
    }
    if (q.category != null && k.category != q.category) return false;
    if (q.onlyGradeA && k.grade != HygieneGrade.a) return false;
    if (q.onlyOpen && !k.isOpen) return false;
    if (q.onlyVerified && k.status != HygieneStatus.verified) return false;
    return true;
  }).toList();
  out.sort(compareForListing);
  return out;
}

int compareForListing(Kitchen a, Kitchen b) {
  int rank(Kitchen k) => switch (k.status) {
    HygieneStatus.verified => 0,
    HygieneStatus.incomplete => 1,
    HygieneStatus.pending => 2,
    HygieneStatus.notMonitored => 3,
  };
  if (a.isOpen != b.isOpen) return a.isOpen ? -1 : 1;
  final byStatus = rank(a).compareTo(rank(b));
  if (byStatus != 0) return byStatus;
  final byGrade = (a.grade?.index ?? 9).compareTo(b.grade?.index ?? 9);
  if (byGrade != 0) return byGrade;
  return a.name.compareTo(b.name);
}

/// Distinct categories, in listing order.
List<String> categoriesOf(Iterable<Kitchen> kitchens) {
  final seen = <String>{};
  return [
    for (final k in kitchens)
      if (k.category != null && seen.add(k.category!)) k.category!,
  ];
}
