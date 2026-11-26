class SavedAddress {
  const SavedAddress({
    required this.id,
    required this.label,
    required this.addressLine,
    required this.instructions,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String addressLine;
  final String? instructions;
  final bool isDefault;

  /// Text sent with an order: the address plus any delivery instructions.
  String get forDelivery => instructions == null || instructions!.trim().isEmpty
      ? addressLine
      : '$addressLine (${instructions!.trim()})';

  factory SavedAddress.fromJson(Map<String, dynamic> json) => SavedAddress(
    id: json['id'] as String,
    label: json['label'] as String,
    addressLine: json['address_line'] as String,
    instructions: json['instructions'] as String?,
    isDefault: (json['is_default'] as bool?) ?? false,
  );
}

/// The signed-in customer's profile (public.profiles).
class CustomerProfile {
  const CustomerProfile({
    required this.fullName,
    required this.phone,
    required this.email,
  });

  final String? fullName;
  final String? phone;
  final String email;

  String get firstName => (fullName ?? '').trim().split(RegExp(r'\s+')).first;
}
