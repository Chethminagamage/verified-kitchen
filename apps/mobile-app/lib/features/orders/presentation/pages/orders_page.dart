import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class OrdersPage extends StatelessWidget {
  const OrdersPage({super.key});

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
                child: _OrdersHeader(),
              ),
            ),

            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 24, 20, 0),
                child: _ActiveOrderCard(),
              ),
            ),

            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 30, 20, 12),
                child: Text(
                  'Previous orders',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
              sliver: SliverList(
                delegate: SliverChildListDelegate(const [
                  _PreviousOrderCard(
                    restaurant: 'Green Bowl',
                    emoji: '🥗',
                    orderId: '#VK1027',
                    date: '28 Aug 2026',
                    amount: 'Rs. 2,450',
                    hygieneScore: 93,
                  ),
                  SizedBox(height: 12),
                  _PreviousOrderCard(
                    restaurant: 'Kitchen 24',
                    emoji: '🍔',
                    orderId: '#VK1019',
                    date: '22 Aug 2026',
                    amount: 'Rs. 3,150',
                    hygieneScore: 91,
                  ),
                  SizedBox(height: 12),
                  _PreviousOrderCard(
                    restaurant: 'Pizza Corner',
                    emoji: '🍕',
                    orderId: '#VK1008',
                    date: '14 Aug 2026',
                    amount: 'Rs. 2,890',
                    hygieneScore: 78,
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrdersHeader extends StatelessWidget {
  const _OrdersHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your orders',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        SizedBox(height: 6),
        Text(
          'Track active deliveries and review your order history.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
        ),
      ],
    );
  }
}

class _ActiveOrderCard extends StatelessWidget {
  const _ActiveOrderCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.navy,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Text(
                  'ACTIVE ORDER',
                  style: TextStyle(
                    color: AppColors.primaryLight,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '#VK1042',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.55),
                  fontSize: 11,
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          const Row(
            children: [
              Text('🍲', style: TextStyle(fontSize: 38)),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'The Urban Kitchen',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '2 items • Rs. 2,780',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 22),

          const _OrderProgress(),

          const SizedBox(height: 18),

          Row(
            children: [
              const Icon(
                Icons.schedule_outlined,
                color: AppColors.primaryLight,
                size: 18,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Estimated arrival: 8:45 PM',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.82),
                    fontSize: 12.5,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.18)),
                minimumSize: const Size.fromHeight(46),
              ),
              child: const Text(
                'Track Order',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderProgress extends StatelessWidget {
  const _OrderProgress();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _ProgressPoint(label: 'Confirmed', completed: true),
        _ProgressLine(completed: true),
        _ProgressPoint(label: 'Preparing', completed: true),
        _ProgressLine(completed: false),
        _ProgressPoint(label: 'Delivery', completed: false),
      ],
    );
  }
}

class _ProgressPoint extends StatelessWidget {
  final String label;
  final bool completed;

  const _ProgressPoint({required this.label, required this.completed});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: completed ? AppColors.primary : AppColors.navySoft,
              shape: BoxShape.circle,
              border: Border.all(
                color: completed ? AppColors.primary : AppColors.textMuted,
              ),
            ),
            child: completed
                ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                : null,
          ),
          const SizedBox(height: 7),
          Text(
            label,
            style: TextStyle(
              color: completed ? Colors.white : AppColors.textMuted,
              fontSize: 9.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressLine extends StatelessWidget {
  final bool completed;

  const _ProgressLine({required this.completed});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 22),
        color: completed ? AppColors.primary : AppColors.navySoft,
      ),
    );
  }
}

class _PreviousOrderCard extends StatelessWidget {
  final String restaurant;
  final String emoji;
  final String orderId;
  final String date;
  final String amount;
  final int hygieneScore;

  const _PreviousOrderCard({
    required this.restaurant,
    required this.emoji,
    required this.orderId,
    required this.date,
    required this.amount,
    required this.hygieneScore,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 66,
            height: 66,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.surfaceSoft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 30)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  restaurant,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$orderId • $date',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11.5,
                  ),
                ),
                const SizedBox(height: 7),
                Row(
                  children: [
                    Text(
                      amount,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.shield_rounded,
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '$hygieneScore',
                      style: const TextStyle(
                        color: AppColors.primaryDark,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {},
            child: const Text(
              'Reorder',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
