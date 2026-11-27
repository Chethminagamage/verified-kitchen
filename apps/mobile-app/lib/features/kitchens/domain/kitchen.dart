import 'hygiene.dart';

/// A kitchen as listed in the app (row of the marketplace_kitchens view).
class Kitchen {
  const Kitchen({
    required this.id,
    required this.name,
    required this.location,
    required this.cuisine,
    required this.description,
    required this.emoji,
    required this.deliveryFeeLkr,
    required this.prepMinutes,
    required this.opensAt,
    required this.closesAt,
    required this.isOpen,
    required this.status,
    required this.rating,
    required this.grade,
    required this.personalScore,
    required this.foodPrepScore,
    required this.environmentalScore,
    required this.coverage,
    required this.ratingUpdatedAt,
    required this.monitoredNow,
    this.bannerPath,
  });

  final String id;
  final String name;
  final String? location;
  final String? cuisine;
  final String? description;
  final String emoji;
  final double deliveryFeeLkr;
  final int prepMinutes;
  final String opensAt;
  final String closesAt;
  final bool isOpen;
  final HygieneStatus status;
  final double? rating;
  final HygieneGrade? grade;
  final double? personalScore;
  final double? foodPrepScore;
  final double? environmentalScore;
  final double? coverage;
  final DateTime? ratingUpdatedAt;
  final bool monitoredNow;

  /// Banner photo in the kitchen-media bucket; null = show the emoji.
  final String? bannerPath;

  /// Has hygiene evidence (verified, incomplete or pending).
  bool get isMonitored => status != HygieneStatus.notMonitored;

  /// The public score of each hygiene area (null = no evidence), in display order.
  List<(HygieneArea, double?)> get areaScores => [
    (HygieneArea.personal, personalScore),
    (HygieneArea.foodPrep, foodPrepScore),
    (HygieneArea.environment, environmentalScore),
  ];

  /// "Lowered mainly by food preparation." for grades below A, otherwise null.
  String? get gradeReasonText => gradeReason(grade, areaScores);

  /// First part of the cuisine ("Kottu · Street food" -> "Kottu"), used as a category.
  String? get category {
    final c = cuisine?.split('·').first.trim();
    return (c == null || c.isEmpty) ? null : c;
  }

  factory Kitchen.fromJson(Map<String, dynamic> json) {
    double? d(Object? v) => v == null ? null : (v as num).toDouble();
    return Kitchen(
      id: json['id'] as String,
      name: json['name'] as String,
      location: json['location'] as String?,
      cuisine: json['cuisine'] as String?,
      description: json['description'] as String?,
      emoji: (json['emoji'] as String?) ?? '🍽️',
      deliveryFeeLkr: d(json['delivery_fee_lkr']) ?? 0,
      prepMinutes: (json['prep_minutes'] as num?)?.toInt() ?? 30,
      opensAt: (json['opens_at'] as String?) ?? '00:00',
      closesAt: (json['closes_at'] as String?) ?? '00:00',
      isOpen: (json['is_open'] as bool?) ?? false,
      status: HygieneStatus.parse(json['rating_status'] as String?),
      rating: d(json['rating']),
      grade: HygieneGrade.parse(json['grade'] as String?),
      personalScore: d(json['personal_score']),
      foodPrepScore: d(json['food_prep_score']),
      environmentalScore: d(json['environmental_score']),
      coverage: d(json['coverage']),
      ratingUpdatedAt: json['rating_updated_at'] == null ? null : DateTime.parse(json['rating_updated_at'] as String),
      monitoredNow: (json['monitored_now'] as bool?) ?? false,
      bannerPath: json['banner_path'] as String?,
    );
  }
}

/// One day of the 7-day hygiene trend (marketplace_rating_history).
class HygieneDay {
  const HygieneDay({required this.day, required this.overall});

  final DateTime day;
  final double? overall;

  factory HygieneDay.fromJson(Map<String, dynamic> json) =>
      HygieneDay(day: DateTime.parse(json['day'] as String), overall: (json['overall_score'] as num?)?.toDouble());
}

/// A dish on a kitchen's menu.
class MenuItem {
  const MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.priceLkr,
    required this.emoji,
    required this.isAvailable,
    this.imagePath,
  });

  final String id;
  final String name;
  final String? description;
  final String category;
  final double priceLkr;
  final String emoji;
  final bool isAvailable;

  /// Dish photo in the kitchen-media bucket; null = show the emoji.
  final String? imagePath;

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    category: (json['category'] as String?) ?? 'Menu',
    priceLkr: (json['price_lkr'] as num).toDouble(),
    emoji: (json['emoji'] as String?) ?? '🍽️',
    isAvailable: (json['is_available'] as bool?) ?? true,
    imagePath: json['image_path'] as String?,
  );

  /// Same keys as [MenuItem.fromJson] (used to keep the cart on the device).
  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'category': category,
    'price_lkr': priceLkr,
    'emoji': emoji,
    'is_available': isAvailable,
    'image_path': imagePath,
  };
}
