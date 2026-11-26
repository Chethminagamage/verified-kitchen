import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../domain/hygiene.dart';
import '../../domain/kitchen.dart';
import 'hygiene_badge.dart';
import 'hygiene_explainer.dart';

/// The hygiene layer of a kitchen page: grade, status, pillars and 7-day trend.
class HygienePanel extends StatelessWidget {
  const HygienePanel({super.key, required this.kitchen, required this.history, required this.now});

  final Kitchen kitchen;
  final List<HygieneDay> history;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final k = kitchen;
    final g = k.grade;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GradeDisc(grade: g, size: 58),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(g != null ? 'Hygiene ${g.letter} · ${g.meaning}' : k.status.label, style: t.titleLarge),
                    const SizedBox(height: 2),
                    Text(_subtitle(k, now), style: t.bodySmall?.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
          if (g != null && g.needsAlert) ...[
            const SizedBox(height: 14),
            _Notice(
              color: AppColors.danger,
              background: AppColors.dangerSoft,
              icon: Icons.warning_amber_rounded,
              text: 'Hygiene alert: this kitchen has been below standard over the past week.',
            ),
          ] else if (k.status != HygieneStatus.verified) ...[
            const SizedBox(height: 14),
            _Notice(
              color: AppColors.textSecondary,
              background: AppColors.fill,
              icon: Icons.info_outline_rounded,
              text: k.status.explanation,
            ),
          ],
          if (k.rating != null) ...[
            const SizedBox(height: 18),
            Text('Why this grade', style: t.titleSmall),
            const SizedBox(height: 10),
            _PillarBar(label: 'Personal hygiene', icon: Icons.back_hand_outlined, score: k.personalScore),
            _PillarBar(label: 'Food preparation', icon: Icons.countertops_outlined, score: k.foodPrepScore),
            _PillarBar(label: 'Environment', icon: Icons.thermostat_outlined, score: k.environmentalScore),
          ],
          if (history.where((d) => d.overall != null).length >= 2) ...[
            const SizedBox(height: 14),
            Text('Last 7 days', style: t.titleSmall),
            const SizedBox(height: 10),
            _Trend(days: history),
          ],
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              style: TextButton.styleFrom(padding: EdgeInsets.zero),
              onPressed: () => showHygieneExplainer(context),
              icon: const Icon(Icons.help_outline_rounded, size: 18),
              label: const Text('How is this measured?'),
            ),
          ),
        ],
      ),
    );
  }

  static String _subtitle(Kitchen k, DateTime now) {
    final parts = <String>[
      if (k.monitoredNow) 'Monitored live',
      if (k.coverage != null && k.isMonitored) '${(k.coverage! * 100).round()}% of opening hours monitored',
      if (k.ratingUpdatedAt != null) 'updated ${formatAgo(k.ratingUpdatedAt!, now)}',
    ];
    return parts.isEmpty ? 'No hygiene monitoring' : parts.join(' · ');
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.color, required this.background, required this.icon, required this.text});

  final Color color;
  final Color background;
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(12)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: color, height: 1.4)),
          ),
        ],
      ),
    );
  }
}

/// One hygiene area in plain words ("Strong", "Needs improvement"): customers
/// get the meaning, not raw numbers or the kitchen's internal records.
class _PillarBar extends StatelessWidget {
  const _PillarBar({required this.label, required this.icon, required this.score});

  final String label;
  final IconData icon;
  final double? score;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final level = PillarLevel.of(score);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(color: AppColors.fill, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: AppColors.ink),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: t.bodyLarge)),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (level != PillarLevel.notMonitored)
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(color: level.color, shape: BoxShape.circle),
                ),
              Text(level.label, style: t.titleSmall?.copyWith(color: level.color)),
            ],
          ),
        ],
      ),
    );
  }
}

/// Simple daily bars (0-100) for the past week.
class _Trend extends StatelessWidget {
  const _Trend({required this.days});
  final List<HygieneDay> days;

  @override
  Widget build(BuildContext context) {
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final t = Theme.of(context).textTheme;
    return SizedBox(
      height: 80,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final d in days.length > 7 ? days.sublist(days.length - 7) : days)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Semantics(
                      label: '${weekday[d.day.weekday - 1]}: ${PillarLevel.of(d.overall).label}',
                      child: Container(
                        height: 56 * ((d.overall ?? 0) / 100).clamp(0.05, 1.0),
                        decoration: BoxDecoration(
                          color: d.overall == null ? AppColors.fillStrong : PillarLevel.of(d.overall).color,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(weekday[d.day.weekday - 1], style: t.labelSmall?.copyWith(color: AppColors.textMuted)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
