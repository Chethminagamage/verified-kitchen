import '../../../core/theme/tone.dart';

/// Public hygiene status of a kitchen, as published by the Verified Kitchen
/// scoring service (marketplace_kitchens.rating_status). The app only
/// presents it; it never computes a score.
enum HygieneStatus {
  /// Monitored through >= 80 % of opening hours: grade is verified.
  verified,

  /// Monitoring gaps: grade limited to B, or no grade below 50 % coverage.
  incomplete,

  /// Monitoring started recently: not enough data yet.
  pending,

  /// No sensors or camera: no hygiene evidence at all.
  notMonitored;

  static HygieneStatus parse(String? value) => switch (value) {
    'verified' => verified,
    'incomplete' => incomplete,
    'pending' => pending,
    _ => notMonitored,
  };

  String get label => switch (this) {
    verified => 'Verified',
    incomplete => 'Monitoring incomplete',
    pending => 'Rating pending',
    notMonitored => 'Not verified',
  };

  String get explanation => switch (this) {
    verified => 'Monitored live by sensors and AI through most of its opening hours.',
    incomplete => 'Not monitored for part of its opening hours, so its grade is limited.',
    pending => 'Monitoring has just started. A grade appears after enough monitored opening time.',
    notMonitored => 'This kitchen does not use Verified Kitchen monitoring. No hygiene evidence is available.',
  };
}

/// Grade A-D (Sri Lanka PHI H-800 bands: A >= 75, B >= 50, C >= 25, else D).
enum HygieneGrade {
  a('A', 'Good', Tone.positive),
  b('B', 'Satisfactory', Tone.good),
  c('C', 'Below standard', Tone.warning),
  d('D', 'Poor', Tone.critical);

  const HygieneGrade(this.letter, this.meaning, this.tone);

  final String letter;
  final String meaning;

  /// Shown in the active palette with `context.colors.tone(grade.tone)`.
  final Tone tone;

  static HygieneGrade? parse(String? value) => switch (value) {
    'A' => a,
    'B' => b,
    'C' => c,
    'D' => d,
    _ => null,
  };

  /// C and D are shown with a hygiene alert before ordering.
  bool get needsAlert => this == c || this == d;
}

/// The three public hygiene areas, in display order.
enum HygieneArea {
  personal('Personal hygiene', 'personal hygiene'),
  foodPrep('Food preparation', 'food preparation'),
  environment('Environment', 'the kitchen environment');

  const HygieneArea(this.label, this.inSentence);

  final String label;

  /// How the area reads inside a sentence ("Lowered mainly by ...").
  final String inSentence;
}

/// One-line public reason for a grade below A: the weakest monitored area.
///
/// It names an area only, never an incident or a time. Returns null for an A,
/// for no grade, and when no area is below the A band (the grade is then
/// limited by incomplete monitoring, which the status notice already explains).
/// Ties go to the area listed first.
String? gradeReason(HygieneGrade? grade, List<(HygieneArea, double?)> areaScores) {
  if (grade == null || grade == HygieneGrade.a) return null;
  (HygieneArea, double)? weakest;
  for (final (area, score) in areaScores) {
    if (score != null && (weakest == null || score < weakest.$2)) weakest = (area, score);
  }
  if (weakest == null || weakest.$2 >= 75) return null;
  return 'Lowered mainly by ${weakest.$1.inSentence}.';
}

/// Plain-language level of one hygiene area (what customers see instead of a number).
enum PillarLevel {
  strong('Strong', Tone.positive),
  good('Good', Tone.good),
  needsImprovement('Needs improvement', Tone.warning),
  poor('Poor', Tone.critical),
  notMonitored('Not monitored yet', Tone.muted);

  const PillarLevel(this.label, this.tone);

  final String label;
  final Tone tone;

  /// Same bands as the grade (A/B/C/D), so the words always agree with it.
  static PillarLevel of(double? score) {
    if (score == null) return notMonitored;
    if (score >= 75) return strong;
    if (score >= 50) return good;
    if (score >= 25) return needsImprovement;
    return poor;
  }
}
