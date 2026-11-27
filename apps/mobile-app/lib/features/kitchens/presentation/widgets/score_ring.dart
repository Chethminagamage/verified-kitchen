import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/hygiene.dart';

/// Headline of the kitchen page: the public hygiene score (0-100) as a ring
/// drawn in the grade's colour. Without a score it shows an empty track and a
/// shield, so "no grade" never looks like a low grade.
class ScoreRing extends StatelessWidget {
  const ScoreRing({super.key, required this.score, required this.grade, this.size = 76});

  final double? score;
  final HygieneGrade? grade;
  final double size;

  @override
  Widget build(BuildContext context) {
    final value = score?.clamp(0, 100).round();
    final color = (grade == null ? context.colors.textMuted : context.colors.tone(grade!.tone));
    final track = (grade == null ? context.colors.fill : context.colors.toneSoft(grade!.tone));
    final animate = !MediaQuery.disableAnimationsOf(context);

    return Semantics(
      label: value == null ? 'No hygiene score yet' : 'Hygiene score $value out of 100',
      excludeSemantics: true,
      child: SizedBox.square(
        dimension: size,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: (value ?? 0) / 100),
          duration: animate ? const Duration(milliseconds: 900) : Duration.zero,
          curve: Curves.easeOutCubic,
          builder: (context, progress, child) => CustomPaint(
            painter: _RingPainter(progress: progress, color: color, track: track, stroke: size * 0.095),
            child: child,
          ),
          child: Center(
            child: value == null
                ? Icon(Icons.shield_outlined, color: context.colors.textMuted, size: size * 0.4)
                : Text.rich(
                    TextSpan(
                      text: '$value',
                      style: TextStyle(
                        color: context.colors.ink,
                        fontSize: size * 0.3,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        height: 1,
                      ),
                      children: [
                        TextSpan(
                          text: '%',
                          style: TextStyle(
                            color: context.colors.textSecondary,
                            fontSize: size * 0.15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({required this.progress, required this.color, required this.track, required this.stroke});

  final double progress;
  final Color color;
  final Color track;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(arcRect, 0, 2 * math.pi, false, paint..color = track);
    if (progress > 0) {
      // Starts at 12 o'clock and runs clockwise.
      canvas.drawArc(arcRect, -math.pi / 2, 2 * math.pi * progress, false, paint..color = color);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color || old.track != track || old.stroke != stroke;
}
