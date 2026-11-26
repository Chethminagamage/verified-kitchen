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

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _controller = TextEditingController();
  String _text = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final kitchens = ref.watch(kitchensProvider);
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
                      onPressed: () => setState(() {
                        _controller.clear();
                        _text = '';
                      }),
                    ),
            ),
            onChanged: (v) => setState(() => _text = v),
          ),
        ),
      ),
      body: AsyncView<List<Kitchen>>(
        value: kitchens,
        onRetry: () => ref.invalidate(kitchensProvider),
        data: (all) {
          final results = applyKitchenQuery(all, KitchenQuery(text: _text));
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
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                leading: Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: AppColors.fill, borderRadius: BorderRadius.circular(12)),
                  child: Text(k.emoji, style: const TextStyle(fontSize: 26)),
                ),
                title: Text(k.name, style: t.titleMedium),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      HygieneBadge(status: k.status, grade: k.grade, dense: true),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          k.isOpen ? (k.cuisine ?? '') : 'Closed',
                          style: t.bodySmall?.copyWith(color: AppColors.textSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
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
