import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/hygiene.dart';
import 'hygiene_badge.dart';

/// "How are hygiene grades decided?" bottom sheet.
Future<void> showHygieneExplainer(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _HygieneExplainer(),
  );
}

class _HygieneExplainer extends StatelessWidget {
  const _HygieneExplainer();

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    Widget point(IconData icon, String title, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: context.colors.fill, shape: BoxShape.circle),
            child: Icon(icon, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: t.titleSmall),
                const SizedBox(height: 2),
                Text(text, style: t.bodyMedium?.copyWith(color: context.colors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          Text('How hygiene grades work', style: t.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Grades come from what actually happens in the kitchen, measured continuously, not from a one-off inspection.',
            style: t.bodyLarge?.copyWith(color: context.colors.textSecondary),
          ),
          const SizedBox(height: 24),
          point(
            Icons.back_hand_outlined,
            'Personal hygiene',
            'An AI camera checks that staff wear gloves, hairnets and masks.',
          ),
          point(
            Icons.countertops_outlined,
            'Food preparation',
            'Clean preparation surfaces, no spills or food waste left around.',
          ),
          point(
            Icons.thermostat_outlined,
            'Environment',
            'Sensors check the refrigerator, kitchen temperature and humidity around the clock.',
          ),
          point(
            Icons.calendar_today_outlined,
            'Last 7 days',
            'The grade reflects the past week, with recent days counting more. One bad moment does not ruin it; a pattern does.',
          ),
          point(
            Icons.visibility_off_outlined,
            'Private by design',
            'Video is analysed inside the kitchen and never stored or sent anywhere. Only the results are shared.',
          ),
          point(
            Icons.lock_outline,
            'Tamper-evident',
            'Every hygiene incident is recorded in a tamper-evident log that the kitchen cannot quietly change.',
          ),
          const Divider(height: 32),
          Text('Grades', style: t.titleMedium),
          const SizedBox(height: 12),
          for (final g in HygieneGrade.values)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  GradeDisc(grade: g, size: 32),
                  const SizedBox(width: 12),
                  Text(g.meaning, style: t.bodyLarge),
                  const Spacer(),
                  Text(switch (g) {
                    HygieneGrade.a => '75–100',
                    HygieneGrade.b => '50–74',
                    HygieneGrade.c => '25–49',
                    HygieneGrade.d => '0–24',
                  }, style: t.bodyMedium?.copyWith(color: context.colors.textSecondary)),
                ],
              ),
            ),
          const SizedBox(height: 12),
          for (final s in [HygieneStatus.incomplete, HygieneStatus.pending, HygieneStatus.notMonitored])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '${s.label}: ', style: t.titleSmall),
                    TextSpan(
                      text: s.explanation,
                      style: t.bodyMedium?.copyWith(color: context.colors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
