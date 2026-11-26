import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/brand_mark.dart';
import '../../../kitchens/presentation/widgets/hygiene_explainer.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  static const String version = '1.0.0';

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final muted = t.bodyLarge?.copyWith(color: AppColors.textSecondary);
    return Scaffold(
      appBar: AppBar(title: const Text('About')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          const Align(alignment: Alignment.centerLeft, child: BrandMark(size: 64)),
          const SizedBox(height: 16),
          Text('Verified Kitchen', style: t.headlineMedium),
          Text('Version $version', style: t.bodyMedium?.copyWith(color: AppColors.textMuted)),
          const SizedBox(height: 20),
          Text(
            'Order from cloud kitchens and see how hygienic each one really is before you choose.',
            style: t.titleMedium,
          ),
          const SizedBox(height: 12),
          Text(
            'Delivery-only kitchens are hidden from their customers, and hygiene ratings elsewhere come from '
            'inspections that may be months or years old. Verified Kitchen measures hygiene continuously: an AI '
            'camera checks gloves, hairnets and masks, and sensors watch the refrigerator and the kitchen climate.',
            style: muted,
          ),
          const SizedBox(height: 12),
          Text(
            'Video never leaves the kitchen: it is analysed on site and discarded. Hygiene incidents are kept in a '
            'tamper-evident record, so a kitchen cannot quietly change its history.',
            style: muted,
          ),
          const SizedBox(height: 20),
          OutlinedButton(onPressed: () => showHygieneExplainer(context), child: const Text('How hygiene grades work')),
          const SizedBox(height: 28),
          Text(
            'A final-year project prototype. Kitchens marked “demo” are sample listings, not real businesses.',
            style: t.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
