import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_providers.dart';

/// Device storage, provided from main() (overridden in tests).
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden in main()'),
);

/// Whether this device has seen the welcome slides.
class OnboardingNotifier extends Notifier<bool> {
  static const String key = 'onboarding_seen_v1';

  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(key) ?? false;

  Future<void> complete() async {
    state = true;
    await ref.read(sharedPreferencesProvider).setBool(key, true);
  }
}

final onboardingSeenProvider = NotifierProvider<OnboardingNotifier, bool>(OnboardingNotifier.new);

/// True after the customer opened a password-reset link, until they set a new password.
class PasswordRecoveryNotifier extends Notifier<bool> {
  @override
  bool build() {
    ref.listen(authStateProvider, (_, next) {
      final event = next.value?.event;
      if (event == AuthChangeEvent.passwordRecovery) state = true;
      if (event == AuthChangeEvent.signedOut) state = false;
    });
    return false;
  }

  void done() => state = false;
}

final passwordRecoveryProvider = NotifierProvider<PasswordRecoveryNotifier, bool>(PasswordRecoveryNotifier.new);
