import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_flow_providers.dart';

/// Light, dark, or follow the phone's setting (the default). Saved on the device.
class ThemeModeNotifier extends Notifier<ThemeMode> {
  static const String key = 'theme_mode_v1';

  @override
  ThemeMode build() => switch (ref.watch(sharedPreferencesProvider).getString(key)) {
    'light' => ThemeMode.light,
    'dark' => ThemeMode.dark,
    _ => ThemeMode.system,
  };

  Future<void> set(ThemeMode mode) async {
    state = mode;
    await ref.read(sharedPreferencesProvider).setString(key, mode.name);
  }
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

extension ThemeModeLabel on ThemeMode {
  String get label => switch (this) {
    ThemeMode.system => 'Use phone setting',
    ThemeMode.light => 'Light',
    ThemeMode.dark => 'Dark',
  };
}

/// Largest text size the layouts are built for. Phones allow up to 200 % on
/// Android; bigger accessibility sizes (iOS) are capped here so screens stay usable.
const double maxTextScale = 2.0;
