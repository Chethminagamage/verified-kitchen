import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/errors.dart';
import '../domain/address.dart';

/// The customer's own account data. Row Level Security makes every query
/// here return or change only the signed-in customer's rows.
class AccountRepository {
  AccountRepository(this._client);
  final SupabaseClient _client;

  String get _uid {
    final id = _client.auth.currentUser?.id;
    if (id == null) throw const UserFacingError('Please sign in again.');
    return id;
  }

  Future<CustomerProfile> profile() async {
    final row = await _client
        .from('profiles')
        .select('full_name, phone')
        .eq('id', _uid)
        .maybeSingle();
    return CustomerProfile(
      fullName: row?['full_name'] as String?,
      phone: row?['phone'] as String?,
      email: _client.auth.currentUser?.email ?? '',
    );
  }

  Future<void> updateProfile({
    required String fullName,
    required String phone,
  }) async {
    try {
      await _client
          .from('profiles')
          .update({'full_name': fullName.trim(), 'phone': phone.trim()})
          .eq('id', _uid);
      // Keep the sign-in record in step (shown before the profile loads).
      await _client.auth.updateUser(
        UserAttributes(
          data: {'full_name': fullName.trim(), 'phone': phone.trim()},
        ),
      );
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  // -- addresses ------------------------------------------------------------
  Future<List<SavedAddress>> addresses() async {
    final rows = await _client
        .from('customer_addresses')
        .select('id, label, address_line, instructions, is_default')
        .order('is_default', ascending: false)
        .order('created_at');
    return [for (final r in rows) SavedAddress.fromJson(r)];
  }

  Future<void> saveAddress({
    String? id,
    required String label,
    required String addressLine,
    String? instructions,
    bool makeDefault = false,
  }) async {
    try {
      final data = {
        'label': label.trim(),
        'address_line': addressLine.trim(),
        'instructions': (instructions == null || instructions.trim().isEmpty)
            ? null
            : instructions.trim(),
      };
      final String savedId;
      if (id == null) {
        final row = await _client
            .from('customer_addresses')
            .insert(data)
            .select('id')
            .single();
        savedId = row['id'] as String;
      } else {
        await _client.from('customer_addresses').update(data).eq('id', id);
        savedId = id;
      }
      if (makeDefault)
        await _client.rpc<void>(
          'set_default_address',
          params: {'p_address': savedId},
        );
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  Future<void> setDefaultAddress(String id) async {
    try {
      await _client.rpc<void>('set_default_address', params: {'p_address': id});
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  Future<void> deleteAddress(String id) async {
    try {
      await _client.from('customer_addresses').delete().eq('id', id);
    } catch (e) {
      throw toUserFacing(e);
    }
  }

  // -- favourites -----------------------------------------------------------
  Future<Set<String>> favouriteKitchenIds() async {
    final rows = await _client.from('favourite_kitchens').select('kitchen_id');
    return {for (final r in rows) r['kitchen_id'] as String};
  }

  Future<void> setFavourite(String kitchenId, {required bool favourite}) async {
    try {
      if (favourite) {
        await _client.from('favourite_kitchens').upsert({
          'kitchen_id': kitchenId,
        }, ignoreDuplicates: true);
      } else {
        await _client
            .from('favourite_kitchens')
            .delete()
            .eq('kitchen_id', kitchenId);
      }
    } catch (e) {
      throw toUserFacing(e);
    }
  }
}
