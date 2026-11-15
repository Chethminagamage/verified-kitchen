import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../models/home_restaurant.dart';
import '../widgets/category_tile.dart';
import '../widgets/restaurant_card.dart';

import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const _verifiedRestaurants = [
    HomeRestaurant(
      name: 'The Urban Kitchen',
      cuisine: 'Rice • Asian • Healthy',
      rating: 4.8,
      deliveryTime: '25–35 min',
      deliveryFee: 'Rs. 250',
      hygieneScore: 96,
      emoji: '🍲',
    ),
    HomeRestaurant(
      name: 'Green Bowl',
      cuisine: 'Healthy • Salads • Bowls',
      rating: 4.7,
      deliveryTime: '20–30 min',
      deliveryFee: 'Rs. 200',
      hygieneScore: 93,
      emoji: '🥗',
    ),
    HomeRestaurant(
      name: 'Ceylon Spice',
      cuisine: 'Sri Lankan • Rice & Curry',
      rating: 4.6,
      deliveryTime: '30–40 min',
      deliveryFee: 'Rs. 180',
      hygieneScore: 88,
      emoji: '🍛',
    ),
  ];

  static const _popularRestaurants = [
    HomeRestaurant(
      name: 'Kitchen 24',
      cuisine: 'Burgers • Fast Food',
      rating: 4.5,
      deliveryTime: '20–30 min',
      deliveryFee: 'Rs. 220',
      hygieneScore: 91,
      emoji: '🍔',
    ),
    HomeRestaurant(
      name: 'Fire & Spice',
      cuisine: 'Sri Lankan • Indian',
      rating: 4.4,
      deliveryTime: '30–45 min',
      deliveryFee: 'Rs. 200',
      hygieneScore: 84,
      emoji: '🍱',
    ),
    HomeRestaurant(
      name: 'Pizza Corner',
      cuisine: 'Pizza • Italian',
      rating: 4.3,
      deliveryTime: '25–40 min',
      deliveryFee: 'Rs. 240',
      hygieneScore: 78,
      emoji: '🍕',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            //
            // HEADER
            //
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 18, 20, 0),
                child: _HomeHeader(),
              ),
            ),

            //
            // SEARCH
            //
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
                child: _SearchBox(
                  onTap: () {
                    // Search navigation will be connected next.
                  },
                ),
              ),
            ),

            //
            // VERIFIED KITCHEN HERO
            //
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: _TrustBanner(),
              ),
            ),

            //
            // CATEGORIES
            //
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 26, 20, 0),
                child: _SectionHeader(title: 'What are you craving?'),
              ),
            ),

            SliverToBoxAdapter(
              child: SizedBox(
                height: 98,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  scrollDirection: Axis.horizontal,
                  children: const [
                    CategoryTile(label: 'Rice', icon: Icons.rice_bowl_outlined),
                    SizedBox(width: 12),
                    CategoryTile(
                      label: 'Burgers',
                      icon: Icons.lunch_dining_outlined,
                    ),
                    SizedBox(width: 12),
                    CategoryTile(
                      label: 'Pizza',
                      icon: Icons.local_pizza_outlined,
                    ),
                    SizedBox(width: 12),
                    CategoryTile(label: 'Healthy', icon: Icons.eco_outlined),
                    SizedBox(width: 12),
                    CategoryTile(label: 'Desserts', icon: Icons.cake_outlined),
                  ],
                ),
              ),
            ),

            //
            // VERIFIED RESTAURANTS
            //
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 28, 20, 0),
                child: _SectionHeader(
                  title: 'Verified Kitchens',
                  action: 'See all',
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: SizedBox(
                height: 247,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  scrollDirection: Axis.horizontal,
                  itemCount: _verifiedRestaurants.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    return VerifiedRestaurantCard(
                      restaurant: _verifiedRestaurants[index],
                      onTap: () {
                        context.push(
                          AppRoutes.restaurant,
                          extra: _verifiedRestaurants[index],
                        );
                      },
                    );
                  },
                ),
              ),
            ),

            //
            // POPULAR
            //
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 30, 20, 12),
                child: _SectionHeader(
                  title: 'Popular near you',
                  action: 'See all',
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index == _popularRestaurants.length - 1 ? 0 : 12,
                    ),
                    child: PopularRestaurantTile(
                      restaurant: _popularRestaurants[index],
                      onTap: () {
                        context.push(
                          AppRoutes.restaurant,
                          extra: _popularRestaurants[index],
                        );
                      },
                    ),
                  );
                }, childCount: _popularRestaurants.length),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Good Evening 👋',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 7),
              Row(
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    color: AppColors.primary,
                    size: 17,
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    'Deliver to',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Flexible(
                    child: Text(
                      'Current location',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: AppColors.textSecondary,
                    size: 18,
                  ),
                ],
              ),
            ],
          ),
        ),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: IconButton(
            tooltip: 'Notifications',
            onPressed: () {},
            icon: const Icon(
              Icons.notifications_none_rounded,
              color: AppColors.textPrimary,
              size: 22,
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchBox extends StatelessWidget {
  final VoidCallback onTap;

  const _SearchBox({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Container(
          height: 54,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            children: [
              Icon(Icons.search_rounded, color: AppColors.textSecondary),
              SizedBox(width: 11),
              Expanded(
                child: Text(
                  'Search food or restaurants',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                ),
              ),
              Icon(
                Icons.tune_rounded,
                color: AppColors.textSecondary,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrustBanner extends StatelessWidget {
  const _TrustBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.navy, AppColors.navySoft],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(30),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.verified_rounded,
                  color: AppColors.primaryLight,
                  size: 16,
                ),
                SizedBox(width: 6),
                Text(
                  'VERIFIED KITCHEN',
                  style: TextStyle(
                    color: AppColors.primaryLight,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Order safe.\nEat confident.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 27,
              fontWeight: FontWeight.w700,
              height: 1.12,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Discover restaurants with transparent hygiene trust information before you order.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.70),
              fontSize: 13.5,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              const Icon(
                Icons.shield_outlined,
                size: 18,
                color: AppColors.primaryLight,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Real-time hygiene insights',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.88),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? action;

  const _SectionHeader({required this.title, this.action});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
        ),
        if (action != null)
          TextButton(
            onPressed: () {},
            child: Text(
              action!,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}
