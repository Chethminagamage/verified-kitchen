import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/config/env.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/auth_flow_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!Env.isConfigured || Env.usesForbiddenKey) {
    runApp(const _SetupRequired());
    return;
  }

  // Sessions are stored on the device and refreshed automatically.
  await Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabasePublishableKey);
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(overrides: [sharedPreferencesProvider.overrideWithValue(prefs)], child: const VerifiedKitchenApp()),
  );
}

/// Shown instead of crashing when the app was started without env.json.
class _SetupRequired extends StatelessWidget {
  const _SetupRequired();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Setup required', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 12),
                Text(
                  Env.usesForbiddenKey
                      ? 'A server secret key was supplied. The app must only use the Supabase publishable key.'
                      : 'Run the app with its connection settings:\n\n'
                            'flutter run --dart-define-from-file=env.json\n\n'
                            'In Android Studio, use the "Verified Kitchen" run configuration.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
