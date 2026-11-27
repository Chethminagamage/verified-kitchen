import 'package:flutter/material.dart';

import 'tone.dart';

/// Colour tokens for light and dark mode, provided through the theme.
///
/// Read them with `context.colors.textSecondary`, never as constants, so every
/// screen follows the mode the customer chose (or the phone's setting).
/// Premium, mostly monochrome UI; green is reserved for hygiene trust, so it
/// stays meaningful wherever it appears.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.ink,
    required this.onInk,
    required this.inkSoft,
    required this.primary,
    required this.primaryDark,
    required this.primarySoft,
    required this.background,
    required this.surface,
    required this.fill,
    required this.fillStrong,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.border,
    required this.success,
    required this.successSoft,
    required this.good,
    required this.goodSoft,
    required this.warning,
    required this.warningSoft,
    required this.danger,
    required this.dangerSoft,
    required this.info,
    required this.infoSoft,
  });

  /// Brand navy for surfaces that are dark in both modes (welcome slides, the
  /// home banner). Text on it is always white.
  static const Color brandNavy = Color(0xFF0B1220);

  /// Rating stars (same in both modes).
  static const Color star = Color(0xFFF59E0B);

  static const AppColors light = AppColors(
    ink: Color(0xFF0B1220),
    onInk: Colors.white,
    inkSoft: Color(0xFF1E293B),
    primary: Color(0xFF10B981),
    primaryDark: Color(0xFF047857),
    primarySoft: Color(0xFFD1FAE5),
    background: Color(0xFFFFFFFF),
    surface: Color(0xFFFFFFFF),
    fill: Color(0xFFF3F4F6),
    fillStrong: Color(0xFFE5E7EB),
    textPrimary: Color(0xFF0B1220),
    textSecondary: Color(0xFF545F71),
    textMuted: Color(0xFF8A94A6),
    border: Color(0xFFE5E7EB),
    success: Color(0xFF059669),
    successSoft: Color(0xFFD1FAE5),
    good: Color(0xFF4D7C0F),
    goodSoft: Color(0xFFECFCCB),
    warning: Color(0xFFB45309),
    warningSoft: Color(0xFFFEF3C7),
    danger: Color(0xFFDC2626),
    dangerSoft: Color(0xFFFEE2E2),
    info: Color(0xFF0369A1),
    infoSoft: Color(0xFFE0F2FE),
  );

  /// Dark mode: near-black surfaces, light text, and lighter status colours
  /// so they keep enough contrast on a dark background.
  static const AppColors dark = AppColors(
    ink: Color(0xFFF1F5F9),
    onInk: Color(0xFF0B1220),
    inkSoft: Color(0xFFCBD5E1),
    primary: Color(0xFF10B981),
    primaryDark: Color(0xFF34D399),
    primarySoft: Color(0xFF0F3A2C),
    background: Color(0xFF0B0F17),
    surface: Color(0xFF121826),
    fill: Color(0xFF1C2331),
    fillStrong: Color(0xFF2A3343),
    textPrimary: Color(0xFFF1F5F9),
    textSecondary: Color(0xFFA7B0BE),
    textMuted: Color(0xFF7C8698),
    border: Color(0xFF263041),
    success: Color(0xFF34D399),
    successSoft: Color(0xFF0F3A2C),
    good: Color(0xFFA3E635),
    goodSoft: Color(0xFF26350F),
    warning: Color(0xFFFBBF24),
    warningSoft: Color(0xFF3A2A0B),
    danger: Color(0xFFF87171),
    dangerSoft: Color(0xFF3B1518),
    info: Color(0xFF38BDF8),
    infoSoft: Color(0xFF0C2A3D),
  );

  /// Primary text, primary buttons and selected controls.
  final Color ink;

  /// Text and icons on [ink] (and on strong status colours).
  final Color onInk;
  final Color inkSoft;
  final Color primary;
  final Color primaryDark;
  final Color primarySoft;
  final Color background;
  final Color surface;
  final Color fill;
  final Color fillStrong;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color border;
  final Color success;
  final Color successSoft;
  final Color good;
  final Color goodSoft;
  final Color warning;
  final Color warningSoft;
  final Color danger;
  final Color dangerSoft;
  final Color info;
  final Color infoSoft;

  /// The colour for a meaning (text, icons, rings).
  Color tone(Tone t) => switch (t) {
    Tone.positive => success,
    Tone.good => good,
    Tone.warning => warning,
    Tone.critical => danger,
    Tone.ink => textPrimary,
    Tone.muted => textMuted,
  };

  /// A soft background for a meaning (badges, tinted tiles).
  Color toneSoft(Tone t) => switch (t) {
    Tone.positive => successSoft,
    Tone.good => goodSoft,
    Tone.warning => warningSoft,
    Tone.critical => dangerSoft,
    Tone.ink || Tone.muted => fill,
  };

  static AppColors of(BuildContext context) => Theme.of(context).extension<AppColors>() ?? light;

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(AppColors? other, double t) {
    if (other == null) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      ink: l(ink, other.ink),
      onInk: l(onInk, other.onInk),
      inkSoft: l(inkSoft, other.inkSoft),
      primary: l(primary, other.primary),
      primaryDark: l(primaryDark, other.primaryDark),
      primarySoft: l(primarySoft, other.primarySoft),
      background: l(background, other.background),
      surface: l(surface, other.surface),
      fill: l(fill, other.fill),
      fillStrong: l(fillStrong, other.fillStrong),
      textPrimary: l(textPrimary, other.textPrimary),
      textSecondary: l(textSecondary, other.textSecondary),
      textMuted: l(textMuted, other.textMuted),
      border: l(border, other.border),
      success: l(success, other.success),
      successSoft: l(successSoft, other.successSoft),
      good: l(good, other.good),
      goodSoft: l(goodSoft, other.goodSoft),
      warning: l(warning, other.warning),
      warningSoft: l(warningSoft, other.warningSoft),
      danger: l(danger, other.danger),
      dangerSoft: l(dangerSoft, other.dangerSoft),
      info: l(info, other.info),
      infoSoft: l(infoSoft, other.infoSoft),
    );
  }
}

extension AppColorsContext on BuildContext {
  /// The active palette (light or dark).
  AppColors get colors => AppColors.of(this);
}
