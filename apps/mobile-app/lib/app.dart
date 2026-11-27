import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/profile/presentation/appearance_providers.dart';

class VerifiedKitchenApp extends ConsumerWidget {
  const VerifiedKitchenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Verified Kitchen',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ref.watch(themeModeProvider),
      // Follows the phone's text size (and bold text, reduce motion), up to the
      // largest size the layouts are built for.
      builder: (context, child) => MediaQuery.withClampedTextScaling(maxScaleFactor: maxTextScale, child: child!),
      routerConfig: router,
    );
  }
}
