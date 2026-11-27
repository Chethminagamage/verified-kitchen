import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Premium, minimal theme: Inter with bold, tight headlines; pill-shaped
/// controls; flat surfaces separated by space rather than borders.
abstract final class AppTheme {
  static const String font = 'Inter';

  static TextTheme _textFor(AppColors c) => const TextTheme(
    displaySmall: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: -1.0, height: 1.1),
    headlineMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.8, height: 1.15),
    headlineSmall: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5, height: 1.2),
    titleLarge: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, letterSpacing: -0.3),
    titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.2),
    titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: -0.1),
    bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.4),
    bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.4),
    bodySmall: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w400, height: 1.35),
    labelLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
    labelMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
    labelSmall: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: 0.1),
  ).apply(bodyColor: c.textPrimary, displayColor: c.textPrimary, fontFamily: font);

  static ThemeData get light => _build(AppColors.light, Brightness.light);

  static ThemeData get dark => _build(AppColors.dark, Brightness.dark);

  static ThemeData _build(AppColors c, Brightness brightness) {
    final text = _textFor(c);
    final scheme = ColorScheme.fromSeed(
      seedColor: c.primary,
      brightness: brightness,
      primary: c.ink,
      onPrimary: c.onInk,
      secondary: c.primary,
      surface: c.surface,
      onSurface: c.textPrimary,
      error: c.danger,
    );
    final pill = RoundedRectangleBorder(borderRadius: BorderRadius.circular(999));
    final input = OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      extensions: [c],
      colorScheme: scheme,
      fontFamily: font,
      textTheme: text,
      scaffoldBackgroundColor: c.background,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: c.background,
        foregroundColor: c.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: text.titleLarge,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.ink,
          foregroundColor: c.onInk,
          disabledBackgroundColor: c.fillStrong,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: text.labelLarge?.copyWith(fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.textPrimary,
          minimumSize: const Size.fromHeight(54),
          side: BorderSide(color: c.border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: text.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: c.textPrimary, textStyle: text.labelLarge),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.fill,
        selectedColor: c.ink,
        secondarySelectedColor: c.ink,
        labelStyle: text.labelMedium,
        secondaryLabelStyle: text.labelMedium?.copyWith(color: c.onInk),
        side: BorderSide.none,
        shape: pill,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.fill,
        hintStyle: text.bodyLarge?.copyWith(color: c.textMuted),
        labelStyle: text.bodyMedium?.copyWith(color: c.textSecondary),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
        border: input,
        enabledBorder: input,
        focusedBorder: input.copyWith(borderSide: BorderSide(color: c.ink, width: 1.5)),
        errorBorder: input.copyWith(borderSide: BorderSide(color: c.danger)),
        focusedErrorBorder: input.copyWith(borderSide: BorderSide(color: c.danger, width: 1.5)),
      ),
      dividerTheme: DividerThemeData(color: c.border, thickness: 1, space: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: Colors.transparent,
        elevation: 0,
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => text.labelSmall?.copyWith(color: states.contains(WidgetState.selected) ? c.ink : c.textMuted),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(color: states.contains(WidgetState.selected) ? c.ink : c.textMuted, size: 26),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: c.onInk),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.ink),
    );
  }
}
