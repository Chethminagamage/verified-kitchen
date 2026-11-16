import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/supabase/errors.dart';
import '../../../profile/presentation/account_providers.dart';
import '../../domain/kitchen.dart';
import 'hygiene_badge.dart';

/// Full-width listing card: image tile, name, hygiene badge and essentials.
class KitchenCard extends StatelessWidget {
  const KitchenCard({
    super.key,
    required this.kitchen,
    required this.onTap,
    this.width,
    this.showFavourite = false,
  });

  final Kitchen kitchen;
  final VoidCallback onTap;
  final double? width;

  /// Heart on the image (needs the signed-in account; off in previews/tests).
  final bool showFavourite;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final k = kitchen;
    return SizedBox(
      width: width,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ImageTile(kitchen: k, showFavourite: showFavourite),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    k.name,
                    style: t.titleMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                HygieneBadge(status: k.status, grade: k.grade, dense: true),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              [
                if (k.isOpen)
                  '${k.prepMinutes}–${k.prepMinutes + 15} min'
                else
                  'Opens ${formatClock(k.opensAt)}',
                '${formatLkr(k.deliveryFeeLkr)} delivery',
                if (k.cuisine != null) k.cuisine!,
              ].join('  ·  '),
              style: t.bodySmall?.copyWith(color: AppColors.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageTile extends StatelessWidget {
  const _ImageTile({required this.kitchen, required this.showFavourite});

  final Kitchen kitchen;
  final bool showFavourite;

  @override
  Widget build(BuildContext context) {
    final k = kitchen;
    return AspectRatio(
      aspectRatio: 16 / 8,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: k.grade?.softColor ?? AppColors.fill,
              child: Center(
                child: Text(k.emoji, style: const TextStyle(fontSize: 64)),
              ),
            ),
            if (!k.isOpen)
              ColoredBox(
                color: Colors.black.withValues(alpha: 0.45),
                child: Center(
                  child: Text(
                    'Closed · opens ${formatClock(k.opensAt)}',
                    style: Theme.of(context).textTheme.titleSmall
                        ?.copyWith(color: Colors.white),
                  ),
                ),
              ),
            if (k.monitoredNow)
              const Positioned(left: 10, top: 10, child: LiveTag()),
            if (showFavourite)
              Positioned(right: 6, top: 6, child: _CardHeart(kitchenId: k.id)),
          ],
        ),
      ),
    );
  }
}

/// "Live" pill: the kitchen's sensors and camera are reporting right now.
class LiveTag extends StatelessWidget {
  const LiveTag({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text('Monitored live', style: Theme.of(context).textTheme.labelSmall),
        ],
      ),
    );
  }
}

class _CardHeart extends ConsumerWidget {
  const _CardHeart({required this.kitchenId});
  final String kitchenId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favourite =
        ref.watch(favouritesProvider).value?.contains(kitchenId) ?? false;
    return IconButton(
      tooltip: favourite ? 'Remove from favourites' : 'Save to favourites',
      style: IconButton.styleFrom(
        backgroundColor: Colors.white,
        minimumSize: const Size(40, 40),
      ),
      icon: Icon(
        favourite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
        size: 20,
        color: favourite ? AppColors.danger : AppColors.ink,
      ),
      onPressed: () async {
        try {
          await ref.read(favouritesProvider.notifier).toggle(kitchenId);
        } on UserFacingError catch (e) {
          if (context.mounted)
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(e.message)));
        }
      },
    );
  }
}
