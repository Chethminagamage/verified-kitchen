import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../domain/kitchen.dart';
import '../../domain/kitchen_filters.dart';
import '../kitchen_providers.dart';
import '../widgets/hygiene_badge.dart';
import '../../../../core/widgets/media_image.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _controller = TextEditingController();
  String _text = '';

  /// The text the dish search runs on: it follows [_text] after a short pause,
  /// so typing does not send a request per letter.
  String _dishText = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() => _text = value);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _dishText = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final kitchens = ref.watch(kitchensProvider);
    final dishMatches = ref.watch(dishMatchesProvider(_dishText)).value ?? const <String, List<String>>{};
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 16),
          child: TextField(
            controller: _controller,
            autofocus: true,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Kitchens, food, area',
              prefixIcon: const Icon(Icons.search_rounded),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              suffixIcon: _text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () {
                        _controller.clear();
                        _onChanged('');
                      },
                    ),
            ),
            onChanged: _onChanged,
          ),
        ),
      ),
      body: AsyncView<List<Kitchen>>(
        value: kitchens,
        onRetry: () => ref.invalidate(kitchensProvider),
        data: (all) {
          final results = applyKitchenQuery(all, KitchenQuery(text: _text), dishMatches: dishMatches);
          if (results.isEmpty) {
            return const EmptyState(
              icon: Icons.search_off_rounded,
              title: 'No results',
              message: 'Try another dish, kitchen or area.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: results.length,
            separatorBuilder: (_, _) => const Divider(indent: 88),
            itemBuilder: (_, i) {
              final k = results[i];
              final dishes = dishMatches[k.id];
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                leading: MediaImage(
                  path: k.bannerPath,
                  emoji: k.emoji,
                  emojiSize: 26,
                  width: 52,
                  height: 52,
                  borderRadius: BorderRadius.circular(12),
                ),
                title: Text(k.name, style: t.titleMedium),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          HygieneBadge(status: k.status, grade: k.grade, dense: true),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              k.isOpen ? (k.cuisine ?? '') : 'Closed',
                              style: t.bodySmall?.copyWith(color: context.colors.textSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (dishes != null && dishes.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Serves ${dishes.take(2).join(', ')}${dishes.length > 2 ? ' and ${dishes.length - 2} more' : ''}',
                          style: t.bodySmall?.copyWith(color: context.colors.ink, fontWeight: FontWeight.w500),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                onTap: () => context.push(Routes.kitchen(k.id)),
              );
            },
          );
        },
      ),
    );
  }
}
