/// Form validation (same rules the database enforces, so errors show early).
abstract final class Validators {
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  // Same as the database check on profiles.phone / orders.contact_phone.
  static final _phone = RegExp(r'^\+?[0-9 ]{9,16}$');

  static String? email(String? v) {
    final s = v?.trim() ?? '';
    if (s.isEmpty) return 'Enter your email';
    if (!_email.hasMatch(s)) return 'Enter a valid email';
    return null;
  }

  static String? password(String? v) {
    final s = v ?? '';
    if (s.isEmpty) return 'Enter a password';
    if (s.length < 8) return 'At least 8 characters';
    return null;
  }

  static String? name(String? v) {
    final s = v?.trim() ?? '';
    if (s.length < 2) return 'Enter your name';
    if (s.length > 100) return 'Name is too long';
    return null;
  }

  static String? phone(String? v) {
    final s = v?.trim() ?? '';
    if (s.isEmpty) return 'Enter your phone number';
    if (!_phone.hasMatch(s))
      return 'Enter a valid phone number, e.g. 077 123 4567';
    return null;
  }
}
