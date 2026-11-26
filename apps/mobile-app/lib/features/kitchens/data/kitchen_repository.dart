import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/kitchen.dart';

/// Reads the consumer-facing data. The database only lets a customer see the
/// marketplace views and menus (Row Level Security); everything operational
/// stays private.
class KitchenRepository {
  KitchenRepository(this._client);
  final SupabaseClient _client;

  Future<List<Kitchen>> kitchens() async {
    final rows = await _client.from('marketplace_kitchens').select();
    return [for (final r in rows) Kitchen.fromJson(r)];
  }

  Future<Kitchen?> kitchen(String id) async {
    final row = await _client
        .from('marketplace_kitchens')
        .select()
        .eq('id', id)
        .maybeSingle();
    return row == null ? null : Kitchen.fromJson(row);
  }

  Future<List<MenuItem>> menu(String kitchenId) async {
    final rows = await _client
        .from('menu_items')
        .select(
          'id, name, description, category, price_lkr, emoji, is_available',
        )
        .eq('kitchen_id', kitchenId)
        .order('sort_order')
        .order('name');
    return [for (final r in rows) MenuItem.fromJson(r)];
  }

  Future<List<HygieneDay>> history(String kitchenId) async {
    final rows = await _client
        .from('marketplace_rating_history')
        .select('day, overall_score')
        .eq('kitchen_id', kitchenId)
        .order('day');
    return [for (final r in rows) HygieneDay.fromJson(r)];
  }
}
