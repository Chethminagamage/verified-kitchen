/// Build-time configuration, passed with `--dart-define-from-file=env.json`
/// (see env.example.json). Only the Supabase **publishable** key may ever be
/// used here: it is public by design. Data access is enforced by the
/// database's Row Level Security, not by keeping this key secret.
abstract final class Env {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );

  static bool get isConfigured =>
      supabaseUrl.startsWith('https://') && supabasePublishableKey.isNotEmpty;

  /// Refuse a server-side key: it would bypass all data protection.
  static bool get usesForbiddenKey =>
      supabasePublishableKey.startsWith('sb_secret_') ||
      supabasePublishableKey.contains('service_role');
}
