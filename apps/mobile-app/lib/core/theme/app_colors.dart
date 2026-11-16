import 'package:flutter/material.dart';

/// Colour tokens. Premium, mostly monochrome UI (near-black ink on white with
/// soft grey surfaces); green is reserved for hygiene trust, so it stays
/// meaningful wherever it appears.
abstract final class AppColors {
  // Ink (primary text, primary buttons) — the brand navy, used as "black".
  static const Color ink = Color(0xFF0B1220);
  static const Color inkSoft = Color(0xFF1E293B);

  // Hygiene / trust green.
  static const Color primary = Color(0xFF10B981);
  static const Color primaryDark = Color(0xFF047857);
  static const Color primarySoft = Color(0xFFD1FAE5);

  // Surfaces.
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color fill = Color(0xFFF3F4F6); // search bar, chips, image tiles
  static const Color fillStrong = Color(0xFFE5E7EB);

  // Text.
  static const Color textPrimary = ink;
  static const Color textSecondary = Color(0xFF545F71);
  static const Color textMuted = Color(0xFF8A94A6);

  static const Color border = Color(0xFFE5E7EB);

  // States.
  static const Color success = Color(0xFF059669);
  static const Color successSoft = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFB45309);
  static const Color warningSoft = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFDC2626);
  static const Color dangerSoft = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF0369A1);
  static const Color infoSoft = Color(0xFFE0F2FE);
}
