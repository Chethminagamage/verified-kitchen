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
    final row = await _client.from('marketplace_kitchens').select().eq('id', id).maybeSingle();
    return row == null ? null : Kitchen.fromJson(row);
  }

  Future<List<MenuItem>> menu(String kitchenId) async {
    final rows = await _client
        .from('menu_items')
        .select('id, name, description, category, price_lkr, emoji, is_available, image_path')
        .eq('kitchen_id', kitchenId)
        .order('sort_order', ascending: true) // postgrest-dart sorts descending unless told
        .order('name', ascending: true);
    return [for (final r in rows) MenuItem.fromJson(r)];
  }

  /// Dishes whose name matches [pattern] (see dishSearchPattern), grouped by
  /// kitchen id. Only menus of listed kitchens are visible (Row Level Security).
  Future<Map<String, List<String>>> searchDishes(String pattern) async {
    final rows = await _client
        .from('menu_items')
        .select('kitchen_id, name')
        .ilike('name', pattern)
        .order('name', ascending: true)
        .limit(100);
    final out = <String, List<String>>{};
    for (final r in rows) {
      out.putIfAbsent(r['kitchen_id'] as String, () => []).add(r['name'] as String);
    }
    return out;
  }

  Future<List<HygieneDay>> history(String kitchenId) async {
    final rows = await _client
        .from('marketplace_rating_history')
        .select('day, overall_score')
        .eq('kitchen_id', kitchenId)
        .order('day', ascending: true); // oldest first: the trend reads left to right
    return [for (final r in rows) HygieneDay.fromJson(r)];
  }
}
