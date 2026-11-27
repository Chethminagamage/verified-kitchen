import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verified_kitchen_app/core/media/media_url.dart';
import 'package:verified_kitchen_app/core/theme/app_theme.dart';
import 'package:verified_kitchen_app/core/widgets/media_image.dart';
import 'package:verified_kitchen_app/features/cart/domain/cart.dart';
import 'package:verified_kitchen_app/features/kitchens/domain/kitchen.dart';

import 'domain_test.dart' show row;

void main() {
  group('media URL', () {
    const base = 'https://abc.supabase.co';

    test('builds the public Storage URL from the stored path', () {
      expect(
        mediaUrl('k1/dishes/egg-kottu-1732.jpg', baseUrl: base),
        'https://abc.supabase.co/storage/v1/object/public/kitchen-media/k1/dishes/egg-kottu-1732.jpg',
      );
    });

    test('no path, no URL; unusual characters are encoded but folders kept', () {
      expect(mediaUrl(null, baseUrl: base), isNull);
      expect(mediaUrl('  ', baseUrl: base), isNull);
      expect(mediaUrl('k1/dishes/rice & curry.jpg', baseUrl: base), endsWith('/k1/dishes/rice%20%26%20curry.jpg'));
    });
  });

  group('image paths from the database', () {
    test('a kitchen banner and a dish photo are read; missing ones stay empty', () {
      final k = Kitchen.fromJson({...row('K'), 'banner_path': 'k1/banner-1.jpg'});
      expect(k.bannerPath, 'k1/banner-1.jpg');
      expect(Kitchen.fromJson(row('K')).bannerPath, isNull);

      final item = MenuItem.fromJson({
        'id': 'd1',
        'name': 'Egg kottu',
        'price_lkr': 750,
        'image_path': 'k1/dishes/d1-1.jpg',
      });
      expect(item.imagePath, 'k1/dishes/d1-1.jpg');
    });

    test('a saved cart keeps the dish photo', () {
      final k = Kitchen.fromJson(row('K'));
      const item = MenuItem(
        id: 'd1',
        name: 'Egg kottu',
        description: null,
        category: 'Kottu',
        priceLkr: 750,
        emoji: '🥚',
        isAvailable: true,
        imagePath: 'k1/dishes/d1-1.jpg',
      );
      final now = DateTime.utc(2026, 11, 27);
      final restored = Cart.fromSaved(Cart.empty.add(k, item, now: now).toJson(), now: now);
      expect(restored.lines.single.item.imagePath, 'k1/dishes/d1-1.jpg');
    });
  });

  group('MediaImage', () {
    Widget wrap(Widget child) => MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: Center(child: child)),
    );

    testWidgets('without a photo it shows the emoji', (tester) async {
      await tester.pumpWidget(wrap(const MediaImage(path: null, emoji: '🍛', emojiSize: 30, width: 80, height: 80)));
      expect(find.text('🍛'), findsOneWidget);
      expect(find.byType(CachedNetworkImage), findsNothing);
    });

    testWidgets('with a photo it loads the cached image, showing the emoji until it arrives', (tester) async {
      await tester.pumpWidget(
        wrap(const MediaImage(path: 'k1/dishes/d1-1.jpg', emoji: '🍛', emojiSize: 30, width: 80, height: 80)),
      );
      final image = tester.widget<CachedNetworkImage>(find.byType(CachedNetworkImage));
      expect(image.imageUrl, endsWith('/storage/v1/object/public/kitchen-media/k1/dishes/d1-1.jpg'));
      expect(image.memCacheWidth, isNotNull); // decoded at display size, not full size
      expect(find.text('🍛'), findsOneWidget); // placeholder while loading
    });
  });
}
