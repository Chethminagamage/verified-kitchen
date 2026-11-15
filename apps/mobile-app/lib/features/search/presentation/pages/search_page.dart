import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../home/presentation/models/home_restaurant.dart';
import '../../../home/presentation/widgets/restaurant_card.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _searchController = TextEditingController();

  String _selectedCategory = 'All';

  static const _categories = ['All', 'Rice', 'Burgers', 'Pizza', 'Healthy'];

  static const _restaurants = [
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
      name: 'Kitchen 24',
      cuisine: 'Burgers • Fast Food',
      rating: 4.5,
      deliveryTime: '20–30 min',
      deliveryFee: 'Rs. 220',
      hygieneScore: 91,
      emoji: '🍔',
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
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: _SearchHeader(),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search restaurants or food',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: IconButton(
                      tooltip: 'Filters',
                      onPressed: () {},
                      icon: const Icon(Icons.tune_rounded),
                    ),
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 24, 20, 0),
                child: Text(
                  'Browse by category',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: SizedBox(
                height: 62,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  separatorBuilder: (_, _) {
                    return const SizedBox(width: 9);
                  },
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    final selected = category == _selectedCategory;

                    return ChoiceChip(
                      label: Text(category),
                      selected: selected,
                      onSelected: (_) {
                        setState(() {
                          _selectedCategory = category;
                        });
                      },
                    );
                  },
                ),
              ),
            ),

            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 26, 20, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Restaurants',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Text(
                      '4 results',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
              sliver: SliverList.separated(
                itemCount: _restaurants.length,
                separatorBuilder: (_, _) {
                  return const SizedBox(height: 12);
                },
                itemBuilder: (context, index) {
                  return PopularRestaurantTile(
                    restaurant: _restaurants[index],
                    onTap: () {
                      // Restaurant details route can be connected here.
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchHeader extends StatelessWidget {
  const _SearchHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Find your food',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        SizedBox(height: 6),
        Text(
          'Discover restaurants with transparent hygiene information.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
