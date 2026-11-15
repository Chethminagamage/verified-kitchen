import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class HygieneTrustBadge extends StatelessWidget {
  final int score;
  final bool compact;

  const HygieneTrustBadge({
    super.key,
    required this.score,
    this.compact = false,
  });

  String get _label {
    if (score >= 90) {
      return 'Excellent';
    }

    if (score >= 75) {
      return 'Good';
    }

    if (score >= 60) {
      return 'Moderate';
    }

    return 'Attention';
  }

  Color get _foregroundColor {
    if (score >= 90) {
      return AppColors.success;
    }

    if (score >= 75) {
      return AppColors.primaryDark;
    }

    if (score >= 60) {
      return AppColors.warning;
    }

    return AppColors.danger;
  }

  Color get _backgroundColor {
    if (score >= 90) {
      return AppColors.successSoft;
    }

    if (score >= 75) {
      return AppColors.primarySoft;
    }

    if (score >= 60) {
      return AppColors.warningSoft;
    }

    return AppColors.dangerSoft;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 9 : 11,
        vertical: compact ? 6 : 7,
      ),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.shield_rounded,
            size: compact ? 14 : 16,
            color: _foregroundColor,
          ),
          const SizedBox(width: 5),
          Text(
            '$score',
            style: TextStyle(
              color: _foregroundColor,
              fontSize: compact ? 12 : 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            _label,
            style: TextStyle(
              color: _foregroundColor,
              fontSize: compact ? 11 : 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
