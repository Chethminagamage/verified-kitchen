import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/hygiene.dart';

/// Compact pill shown on every kitchen card: "A · Verified", "Not verified" ...
class HygieneBadge extends StatelessWidget {
  const HygieneBadge({
    super.key,
    required this.status,
    required this.grade,
    this.dense = false,
  });

  final HygieneStatus status;
  final HygieneGrade? grade;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final g = grade;
    final (Color fg, Color bg) = g != null
        ? (g.color, g.softColor)
        : (AppColors.textSecondary, AppColors.fill);
    final text = Theme.of(context).textTheme.labelSmall!;
    final label = switch ((g, status)) {
      (final HygieneGrade grade, HygieneStatus.verified) =>
        'Hygiene ${grade.letter}',
      (final HygieneGrade grade, _) => 'Hygiene ${grade.letter} · limited',
      (null, HygieneStatus.notMonitored) => 'Not verified',
      (null, HygieneStatus.pending) => 'Rating pending',
      (null, _) => 'No grade yet',
    };
    return Semantics(
      label: '$label. ${status.explanation}',
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: dense ? 7 : 9,
          vertical: dense ? 3 : 5,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              g != null ? Icons.verified_rounded : Icons.shield_outlined,
              size: dense ? 13 : 15,
              color: fg,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: text.copyWith(color: fg, fontSize: dense ? 11 : 12),
            ),
          ],
        ),
      ),
    );
  }
}

/// The large grade disc on the kitchen page.
class GradeDisc extends StatelessWidget {
  const GradeDisc({super.key, required this.grade, this.size = 64});

  final HygieneGrade? grade;
  final double size;

  @override
  Widget build(BuildContext context) {
    final g = grade;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: g?.color ?? AppColors.fill,
        shape: BoxShape.circle,
      ),
      child: g != null
          ? Text(
              g.letter,
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.5,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
              ),
            )
          : Icon(
              Icons.shield_outlined,
              color: AppColors.textMuted,
              size: size * 0.45,
            ),
    );
  }
}
