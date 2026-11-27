import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../domain/hygiene.dart';
import '../../domain/kitchen.dart';
import 'hygiene_explainer.dart';
import 'score_ring.dart';

/// The hygiene layer of a kitchen page: score ring, grade, status, the reason
/// for a grade below A, the three areas and the 7-day trend.
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
    final reason = k.gradeReasonText;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ScoreRing(score: k.rating, grade: g),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(g != null ? 'Hygiene ${g.letter} · ${g.meaning}' : k.status.label, style: t.titleLarge),
                    const SizedBox(height: 2),
                    Text(_subtitle(k, now), style: t.bodySmall?.copyWith(color: context.colors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
          if (g != null && g.needsAlert) ...[
            const SizedBox(height: 14),
            _Notice(
              color: context.colors.danger,
              background: context.colors.dangerSoft,
              icon: Icons.warning_amber_rounded,
              text: 'Hygiene alert: this kitchen has been below standard over the past week.',
            ),
          ] else if (k.status != HygieneStatus.verified) ...[
            const SizedBox(height: 14),
            _Notice(
              color: context.colors.textSecondary,
              background: context.colors.fill,
              icon: Icons.info_outline_rounded,
              text: k.status.explanation,
            ),
          ],
          if (k.rating != null) ...[
            const SizedBox(height: 18),
            Text('Why this grade', style: t.titleSmall),
            if (reason != null && g != null) ...[
              const SizedBox(height: 6),
              _Reason(text: reason, color: context.colors.tone(g.tone)),
            ],
            const SizedBox(height: 12),
            for (final (area, score) in k.areaScores) _PillarBar(area: area, score: score),
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

/// The short public reason for a grade below A, in the grade's colour.
class _Reason extends StatelessWidget {
  const _Reason({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.trending_down_rounded, size: 18, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

/// One hygiene area in plain words ("Strong", "Needs improvement"): customers
/// get the meaning, not raw numbers or the kitchen's internal records.
class _PillarBar extends StatelessWidget {
  const _PillarBar({required this.area, required this.score});

  final HygieneArea area;
  final double? score;

  static IconData _icon(HygieneArea area) => switch (area) {
    HygieneArea.personal => Icons.back_hand_outlined,
    HygieneArea.foodPrep => Icons.countertops_outlined,
    HygieneArea.environment => Icons.thermostat_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final level = PillarLevel.of(score);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: context.colors.fill, shape: BoxShape.circle),
            child: Icon(_icon(area), size: 18, color: context.colors.ink),
          ),
          const SizedBox(width: 12),
          // The level sits under the name, so long levels ("Needs improvement")
          // fit on any phone width without cutting off the area name.
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(area.label, style: t.bodyLarge?.copyWith(fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    if (level != PillarLevel.notMonitored)
                      Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(color: context.colors.tone(level.tone), shape: BoxShape.circle),
                      ),
                    Flexible(
                      child: Text(
                        level.label,
                        style: t.bodySmall?.copyWith(
                          color: context.colors.tone(level.tone),
                          fontWeight: FontWeight.w600,
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
                          color: d.overall == null
                              ? context.colors.fillStrong
                              : context.colors.tone(PillarLevel.of(d.overall).tone),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(weekday[d.day.weekday - 1], style: t.labelSmall?.copyWith(color: context.colors.textMuted)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
