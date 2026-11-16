import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/links.dart';
import '../../../core/supabase/errors.dart';
import '../../../core/supabase/supabase_providers.dart';

/// Result of creating an account: signed in straight away, or waiting for
/// the customer to confirm their email (when the project requires it).
enum SignUpOutcome { signedIn, confirmEmail }

/// A message safe to show to the customer.
class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

class AuthRepository {
  AuthRepository(this._client);
  final SupabaseClient _client;

  Future<void> signIn({required String email, required String password}) async {
    try {
      await _client.auth.signInWithPassword(
        email: email.trim().toLowerCase(),
        password: password,
      );
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    }
  }

  /// Every sign-up becomes a *customer* (the database ignores any role sent).
  Future<SignUpOutcome> signUp({
    required String fullName,
    required String phone,
    required String email,
    required String password,
  }) async {
    try {
      final res = await _client.auth.signUp(
        email: email.trim().toLowerCase(),
        password: password,
        data: {'full_name': fullName.trim(), 'phone': phone.trim()},
        emailRedirectTo: authRedirectUrl,
      );
      return res.session != null
          ? SignUpOutcome.signedIn
          : SignUpOutcome.confirmEmail;
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    }
  }

  Future<void> signOut() => _client.auth.signOut();

  /// Sends a reset link. Always reports success, so the screen never reveals
  /// whether an email address has an account.
  Future<void> sendPasswordReset(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        redirectTo: authRedirectUrl,
      );
    } on AuthException catch (e) {
      if (e.statusCode == '429' ||
          e.message.toLowerCase().contains('rate limit')) {
        throw const AuthFailure('Too many attempts. Please wait a minute.');
      }
    }
  }

  /// Sets a new password (after opening the reset link, or from the account).
  Future<void> updatePassword(String password) async {
    try {
      await _client.auth.updateUser(UserAttributes(password: password));
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    }
  }

  /// Permanently deletes the customer's account (server function), then signs out.
  Future<void> deleteAccount() async {
    try {
      await _client.rpc<void>('delete_my_account');
    } catch (e) {
      throw AuthFailure(toUserFacing(e).message);
    }
    await _client.auth.signOut();
  }

  static String _friendly(AuthException e) {
    final m = e.message.toLowerCase();
    if (m.contains('invalid login')) return 'Wrong email or password.';
    if (m.contains('email not confirmed'))
      return 'Please confirm your email first. Check your inbox.';
    if (m.contains('already registered') || m.contains('already exists')) {
      return 'An account with this email already exists. Sign in instead.';
    }
    if (m.contains('password'))
      return 'Choose a stronger password (at least 8 characters).';
    if (m.contains('rate limit') || e.statusCode == '429')
      return 'Too many attempts. Please wait a minute.';
    if (m.contains('signups not allowed') || m.contains('signup is disabled')) {
      return 'New sign-ups are closed at the moment.';
    }
    return 'Something went wrong. Check your connection and try again.';
  }
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(supabaseClientProvider)),
);
