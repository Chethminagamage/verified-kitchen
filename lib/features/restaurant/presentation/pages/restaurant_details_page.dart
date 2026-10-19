import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../home/presentation/models/home_restaurant.dart';
import '../widgets/restaurant_hygiene_card.dart';

class RestaurantDetailsPage extends StatelessWidget {
  final HomeRestaurant restaurant;

  const RestaurantDetailsPage({super.key, required this.restaurant});

  static const _menuItems = [
    _MenuItem(
      name: 'Chicken Rice Bowl',
      description: 'Grilled chicken, steamed rice, vegetables and house sauce.',
      price: 1250,
      emoji: '🍛',
    ),
    _MenuItem(
      name: 'Spicy Chicken Burger',
      description: 'Crispy chicken, lettuce, cheese and signature spicy sauce.',
      price: 1450,
      emoji: '🍔',
    ),
    _MenuItem(
      name: 'Healthy Green Bowl',
      description: 'Fresh vegetables, avocado, grains and light herb dressing.',
      price: 1150,
      emoji: '🥗',
    ),
    _MenuItem(
      name: 'Chicken Kottu',
      description:
          'Sri Lankan style kottu with chicken, vegetables and spices.',
      price: 1350,
      emoji: '🍲',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          //
          // RESTAURANT HERO
          //
          SliverAppBar(
            expandedHeight: 230,
            pinned: true,
            backgroundColor: AppColors.surface,
            surfaceTintColor: Colors.transparent,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: _RoundActionButton(
                icon: Icons.arrow_back_rounded,
                onPressed: () {
                  context.pop();
                },
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _RoundActionButton(
                  icon: Icons.favorite_border_rounded,
                  onPressed: () {},
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.surfaceSoft,
                child: SafeArea(
                  bottom: false,
                  child: Center(
                    child: Text(
                      restaurant.emoji,
                      style: const TextStyle(fontSize: 85),
                    ),
                  ),
                ),
              ),
            ),
          ),

          //
          // RESTAURANT INFORMATION
          //
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: _RestaurantInformation(restaurant: restaurant),
            ),
          ),

          //
          // HYGIENE SCORE
          //
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
              child: RestaurantHygieneCard(
                score: restaurant.hygieneScore,
                onViewDetails: () {
                  // Detailed hygiene page is the next feature.
                },
              ),
            ),
          ),

          //
          // MENU HEADER
          //
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, 28, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Popular dishes',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),
                  Text(
                    'Menu',
                    style: TextStyle(
                      color: AppColors.primaryDark,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),

          //
          // MENU ITEMS
          //
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
            sliver: SliverList.separated(
              itemCount: _menuItems.length,
              separatorBuilder: (_, _) {
                return const SizedBox(height: 12);
              },
              itemBuilder: (context, index) {
                return _FoodMenuCard(
                  item: _menuItems[index],
                  onTap: () {
                    // Food details will be added later.
                  },
                  onAdd: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '${_menuItems[index].name} added to cart',
                        ),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RestaurantInformation extends StatelessWidget {
  final HomeRestaurant restaurant;

  const _RestaurantInformation({required this.restaurant});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          restaurant.name,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 27,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.6,
          ),
        ),

        const SizedBox(height: 6),

        Text(
          restaurant.cuisine,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
          ),
        ),

        const SizedBox(height: 15),

        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _InformationChip(
              icon: Icons.star_rounded,
              text: restaurant.rating.toStringAsFixed(1),
              iconColor: AppColors.warning,
            ),
            _InformationChip(
              icon: Icons.schedule_outlined,
              text: restaurant.deliveryTime,
            ),
            _InformationChip(
              icon: Icons.delivery_dining_outlined,
              text: restaurant.deliveryFee,
            ),
          ],
        ),
      ],
    );
  }
}

class _InformationChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color? iconColor;

  const _InformationChip({
    required this.icon,
    required this.text,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: iconColor ?? AppColors.textSecondary),
          const SizedBox(width: 6),
          Text(
            text,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _FoodMenuCard extends StatelessWidget {
  final _MenuItem item;
  final VoidCallback onTap;
  final VoidCallback onAdd;

  const _FoodMenuCard({
    required this.item,
    required this.onTap,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(17),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 94,
                height: 94,
                decoration: BoxDecoration(
                  color: AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Text(item.emoji, style: const TextStyle(fontSize: 42)),
              ),

              const SizedBox(width: 13),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),

                    const SizedBox(height: 5),

                    Text(
                      item.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11.5,
                        height: 1.4,
                      ),
                    ),

                    const SizedBox(height: 9),

                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Rs. ${item.price}',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 34,
                          height: 34,
                          child: IconButton.filled(
                            tooltip: 'Add to cart',
                            onPressed: onAdd,
                            padding: EdgeInsets.zero,
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                            ),
                            icon: const Icon(Icons.add_rounded, size: 19),
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
    );
  }
}

class _RoundActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;

  const _RoundActionButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon, color: AppColors.textPrimary),
      ),
    );
  }
}

class _MenuItem {
  final String name;
  final String description;
  final int price;
  final String emoji;

  const _MenuItem({
    required this.name,
    required this.description,
    required this.price,
    required this.emoji,
  });
}
