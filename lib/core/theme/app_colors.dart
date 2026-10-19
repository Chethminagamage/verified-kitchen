import 'package:flutter/material.dart';

abstract final class AppColors {
  // Brand
  static const Color navy = Color(0xFF0F172A);
  static const Color navyDark = Color(0xFF020617);
  static const Color navySoft = Color(0xFF1E293B);

  // Primary trust / hygiene colour
  static const Color primary = Color(0xFF10B981);
  static const Color primaryDark = Color(0xFF059669);
  static const Color primaryLight = Color(0xFF34D399);
  static const Color primarySoft = Color(0xFFD1FAE5);

  // Application surfaces
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSoft = Color(0xFFF1F5F9);

  // Typography
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // Borders
  static const Color border = Color(0xFFE2E8F0);

  // Information
  static const Color info = Color(0xFF0EA5E9);
  static const Color infoSoft = Color(0xFFE0F2FE);

  // Hygiene states
  static const Color success = Color(0xFF10B981);
  static const Color successSoft = Color(0xFFD1FAE5);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningSoft = Color(0xFFFEF3C7);

  static const Color danger = Color(0xFFEF4444);
  static const Color dangerSoft = Color(0xFFFEE2E2);
}
