import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

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
  a('A', 'Good', AppColors.success, AppColors.successSoft),
  b('B', 'Satisfactory', Color(0xFF4D7C0F), Color(0xFFECFCCB)),
  c('C', 'Below standard', AppColors.warning, AppColors.warningSoft),
  d('D', 'Poor', AppColors.danger, AppColors.dangerSoft);

  const HygieneGrade(this.letter, this.meaning, this.color, this.softColor);

  final String letter;
  final String meaning;
  final Color color;
  final Color softColor;

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

/// Plain-language level of one hygiene area (what customers see instead of a number).
enum PillarLevel {
  strong('Strong', AppColors.success),
  good('Good', Color(0xFF4D7C0F)),
  needsImprovement('Needs improvement', AppColors.warning),
  poor('Poor', AppColors.danger),
  notMonitored('Not monitored yet', AppColors.textMuted);

  const PillarLevel(this.label, this.color);

  final String label;
  final Color color;

  /// Same bands as the grade (A/B/C/D), so the words always agree with it.
  static PillarLevel of(double? score) {
    if (score == null) return notMonitored;
    if (score >= 75) return strong;
    if (score >= 50) return good;
    if (score >= 25) return needsImprovement;
    return poor;
  }
}
