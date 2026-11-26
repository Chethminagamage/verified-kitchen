import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Softly pulsing placeholder shapes shown while content loads.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, required this.child});

  final Widget child;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading',
      child: FadeTransition(opacity: Tween(begin: 0.45, end: 1.0).animate(_c), child: widget.child),
    );
  }
}

/// A grey rounded block.
class Bone extends StatelessWidget {
  const Bone({super.key, this.width, required this.height, this.radius = 10});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(color: AppColors.fill, borderRadius: BorderRadius.circular(radius)),
  );
}

/// Placeholder for a list of kitchen cards (home, favourites).
class KitchenListSkeleton extends StatelessWidget {
  const KitchenListSkeleton({super.key, this.count = 3});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Skeleton(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        itemCount: count,
        separatorBuilder: (_, _) => const SizedBox(height: 24),
        itemBuilder: (_, _) => const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 8,
              child: Bone(height: double.infinity, radius: 16),
            ),
            SizedBox(height: 12),
            Bone(width: 180, height: 16),
            SizedBox(height: 8),
            Bone(width: 240, height: 12),
          ],
        ),
      ),
    );
  }
}
