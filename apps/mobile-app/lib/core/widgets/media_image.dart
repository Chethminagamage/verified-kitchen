import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../media/media_url.dart';
import '../theme/app_colors.dart';

/// A kitchen banner or dish photo from Storage.
///
/// * Downloaded once and kept on the phone (cache), so lists scroll smoothly
///   and work again offline.
/// * Decoded at the size it is shown, not the full upload size (saves memory).
/// * The emoji is shown while loading, when there is no photo, and if the
///   download fails, so a missing photo never leaves a blank or broken box.
/// * Decorative for screen readers: the dish or kitchen name is read instead.
class MediaImage extends StatelessWidget {
  const MediaImage({
    super.key,
    required this.path,
    required this.emoji,
    required this.emojiSize,
    this.background,
    this.borderRadius = BorderRadius.zero,
    this.width,
    this.height,
  });

  /// Path in the kitchen-media bucket; null = no photo yet.
  final String? path;
  final String emoji;
  final double emojiSize;

  /// Behind the emoji (defaults to the soft fill colour).
  final Color? background;
  final BorderRadius borderRadius;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final url = mediaUrl(path);
    final fallback = ColoredBox(
      color: background ?? context.colors.fill,
      child: Center(
        child: ExcludeSemantics(
          child: Text(emoji, style: TextStyle(fontSize: emojiSize)),
        ),
      ),
    );
    return ClipRRect(
      borderRadius: borderRadius,
      child: SizedBox(
        width: width,
        height: height,
        child: url == null
            ? fallback
            : LayoutBuilder(
                builder: (context, constraints) {
                  final dpr = MediaQuery.devicePixelRatioOf(context);
                  int? decodeWidth(double w) => w.isFinite && w > 0 ? (w * dpr).round() : null;
                  return CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                    memCacheWidth: decodeWidth(constraints.maxWidth),
                    fadeInDuration: MediaQuery.disableAnimationsOf(context)
                        ? Duration.zero
                        : const Duration(milliseconds: 250),
                    placeholder: (_, _) => fallback,
                    errorWidget: (_, _, _) => fallback,
                  );
                },
              ),
      ),
    );
  }
}
