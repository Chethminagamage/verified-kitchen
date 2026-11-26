import 'package:flutter/material.dart';

/// The Verified Kitchen app icon (shield and chef hat on brand ink), as a
/// rounded tile. Use it wherever the brand appears inside the app.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40});

  static const String asset = 'assets/brand/icon_square.png';

  final double size;

  @override
  Widget build(BuildContext context) {
    final px = (size * MediaQuery.devicePixelRatioOf(context)).ceil();
    return Semantics(
      label: 'Verified Kitchen',
      image: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.28),
        child: Image.asset(asset, width: size, height: size, cacheWidth: px, filterQuality: FilterQuality.medium),
      ),
    );
  }
}

/// The icon followed by the product name, for headers.
class BrandLockup extends StatelessWidget {
  const BrandLockup({super.key, this.size = 40, this.color});

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.titleLarge?.copyWith(color: color);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(child: BrandMark(size: size)),
        SizedBox(width: size * 0.28),
        Text('Verified Kitchen', style: style),
      ],
    );
  }
}
