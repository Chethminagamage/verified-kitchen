import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
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

/// Checks an email and password without touching the signed-in session.
/// Returns false for a wrong password.
typedef PasswordCheck = Future<bool> Function(String email, String password);

class AuthRepository {
  AuthRepository(this._client, {PasswordCheck? checkPassword})
    : _checkPassword = checkPassword ?? _checkWithTemporaryClient;
  final SupabaseClient _client;
  final PasswordCheck _checkPassword;

  /// Signs in on a separate, short-lived client that stores nothing on the
  /// device, then ends that extra session. The customer's own session is untouched.
  static Future<bool> _checkWithTemporaryClient(String email, String password) async {
    final temp = SupabaseClient(
      Env.supabaseUrl,
      Env.supabasePublishableKey,
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
    try {
      await temp.auth.signInWithPassword(email: email, password: password);
      await temp.auth.signOut(scope: SignOutScope.local);
      return true;
    } on AuthException catch (e) {
      if (e.message.toLowerCase().contains('invalid login')) return false;
      rethrow;
    } finally {
      await temp.dispose();
    }
  }

  Future<void> signIn({required String email, required String password}) async {
    try {
      await _client.auth.signInWithPassword(email: email.trim().toLowerCase(), password: password);
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
      return res.session != null ? SignUpOutcome.signedIn : SignUpOutcome.confirmEmail;
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    }
  }

  Future<void> signOut() => _client.auth.signOut();

  /// Sends a reset link. Always reports success, so the screen never reveals
  /// whether an email address has an account.
  Future<void> sendPasswordReset(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(email.trim().toLowerCase(), redirectTo: authRedirectUrl);
    } on AuthException catch (e) {
      if (e.statusCode == '429' || e.message.toLowerCase().contains('rate limit')) {
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

  /// Changes the password from the account screen. The current password is
  /// checked first, so someone holding an unlocked phone cannot take over the
  /// account. Optionally ends every other signed-in session.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required bool signOutOtherDevices,
  }) async {
    final email = _client.auth.currentUser?.email;
    if (email == null) throw const AuthFailure('Please sign in again.');
    await _requireCurrentPassword(email, currentPassword);

    await updatePassword(newPassword);
    if (signOutOtherDevices) {
      try {
        await _client.auth.signOut(scope: SignOutScope.others);
      } catch (_) {
        // The password is already changed; other sessions still expire on their own.
      }
    }
  }

  /// Starts an email change: Supabase emails a confirmation link to the new
  /// address (and, if the project asks for it, to the current one too). The
  /// sign-in email changes only after the link is opened. The current password
  /// is checked first, as for a password change.
  Future<void> changeEmail({required String newEmail, required String currentPassword}) async {
    final email = _client.auth.currentUser?.email;
    if (email == null) throw const AuthFailure('Please sign in again.');
    final next = newEmail.trim().toLowerCase();
    if (next == email.toLowerCase()) throw const AuthFailure('That is already your email.');
    await _requireCurrentPassword(email, currentPassword);
    try {
      await _client.auth.updateUser(UserAttributes(email: next), emailRedirectTo: authRedirectUrl);
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    }
  }

  /// Ends every session of this account except the one on this phone
  /// (for a lost or shared phone).
  Future<void> signOutOtherDevices() async {
    try {
      await _client.auth.signOut(scope: SignOutScope.others);
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    } catch (e) {
      throw AuthFailure(toUserFacing(e).message);
    }
  }

  Future<void> _requireCurrentPassword(String email, String password) async {
    final bool correct;
    try {
      correct = await _checkPassword(email, password);
    } on AuthException catch (e) {
      throw AuthFailure(_friendly(e));
    } catch (e) {
      throw AuthFailure(toUserFacing(e).message);
    }
    if (!correct) throw const AuthFailure('Your current password is not correct.');
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
    if (m.contains('email not confirmed')) return 'Please confirm your email first. Check your inbox.';
    if (m.contains('already been registered') || e.code == 'email_exists') {
      return 'Another account already uses this email.';
    }
    if (m.contains('already registered') || m.contains('already exists')) {
      return 'An account with this email already exists. Sign in instead.';
    }
    if (m.contains('different from the old')) return 'Choose a password different from your current one.';
    if (m.contains('reauthenticat')) return 'For your security, sign out and sign in again, then change your password.';
    if (m.contains('password')) return 'Choose a stronger password (at least 8 characters).';
    if (m.contains('rate limit') || e.statusCode == '429') return 'Too many attempts. Please wait a minute.';
    if (m.contains('signups not allowed') || m.contains('signup is disabled')) {
      return 'New sign-ups are closed at the moment.';
    }
    return 'Something went wrong. Check your connection and try again.';
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.watch(supabaseClientProvider)));
