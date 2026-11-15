import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../models/home_restaurant.dart';
import 'hygiene_trust_badge.dart';

class VerifiedRestaurantCard extends StatelessWidget {
  final HomeRestaurant restaurant;
  final VoidCallback? onTap;

  const VerifiedRestaurantCard({
    super.key,
    required this.restaurant,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 286,
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _RestaurantVisual(
                  emoji: restaurant.emoji,
                  hygieneScore: restaurant.hygieneScore,
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 13, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        restaurant.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        restaurant.cuisine,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                        ),
                      ),
                      const SizedBox(height: 11),
                      Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 17,
                            color: AppColors.warning,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            restaurant.rating.toStringAsFixed(1),
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 10),
                          const _Dot(),
                          const SizedBox(width: 10),
                          const Icon(
                            Icons.schedule_rounded,
                            size: 15,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              restaurant.deliveryTime,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PopularRestaurantTile extends StatelessWidget {
  final HomeRestaurant restaurant;
  final VoidCallback? onTap;

  const PopularRestaurantTile({
    super.key,
    required this.restaurant,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 86,
                height: 86,
                decoration: BoxDecoration(
                  color: AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(15),
                ),
                alignment: Alignment.center,
                child: Text(
                  restaurant.emoji,
                  style: const TextStyle(fontSize: 38),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      restaurant.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      restaurant.cuisine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          size: 16,
                          color: AppColors.warning,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          restaurant.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const _Dot(),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            restaurant.deliveryTime,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 9),
                    HygieneTrustBadge(
                      score: restaurant.hygieneScore,
                      compact: true,
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RestaurantVisual extends StatelessWidget {
  final String emoji;
  final int hygieneScore;

  const _RestaurantVisual({required this.emoji, required this.hygieneScore});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 124,
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: BorderRadius.vertical(top: Radius.circular(17)),
      ),
      child: Stack(
        children: [
          Center(child: Text(emoji, style: const TextStyle(fontSize: 55))),
          Positioned(
            left: 12,
            bottom: 10,
            child: HygieneTrustBadge(score: hygieneScore, compact: true),
          ),
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.favorite_border_rounded,
                size: 19,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 3,
      height: 3,
      decoration: const BoxDecoration(
        color: AppColors.textMuted,
        shape: BoxShape.circle,
      ),
    );
  }
}
