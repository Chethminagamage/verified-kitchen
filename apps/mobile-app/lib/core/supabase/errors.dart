import 'dart:async';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

/// An error message safe and useful to show to the customer.
class UserFacingError implements Exception {
  const UserFacingError(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Messages raised by our own database functions are written for customers
/// (e.g. "this kitchen is closed now"); anything else becomes a generic message.
UserFacingError toUserFacing(Object error) {
  if (error is UserFacingError) return error;
  if (error is PostgrestException) {
    const ours = {
      'P0001',
      '23514',
      '42501',
      'P0002',
      '02000',
    }; // raise / check_violation / privilege / no data
    final msg = error.message.trim();
    if (ours.contains(error.code) &&
        msg.isNotEmpty &&
        msg.length < 140 &&
        !msg.contains('violates')) {
      return UserFacingError(
        '${msg[0].toUpperCase()}${msg.substring(1)}.'.replaceAll('..', '.'),
      );
    }
    if (msg.contains('you can save up to 10 addresses')) {
      return const UserFacingError('You can save up to 10 addresses.');
    }
    return const UserFacingError('Something went wrong. Please try again.');
  }
  if (error is SocketException ||
      error is TimeoutException ||
      error is AuthRetryableFetchException) {
    return const UserFacingError(
      'No internet connection. Check your connection and try again.',
    );
  }
  return const UserFacingError('Something went wrong. Please try again.');
}
