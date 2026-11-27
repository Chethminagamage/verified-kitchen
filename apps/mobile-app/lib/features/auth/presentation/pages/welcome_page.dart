import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/brand_mark.dart';
import '../auth_flow_providers.dart';

/// First-launch introduction: what makes this app different, in three slides.
class WelcomePage extends ConsumerStatefulWidget {
  const WelcomePage({super.key});

  @override
  ConsumerState<WelcomePage> createState() => _WelcomePageState();
}

class _Slide {
  const _Slide(this.icon, this.title, this.text);
  final IconData icon;
  final String title;
  final String text;
}

const _slides = [
  _Slide(
    Icons.verified_rounded,
    'Know the kitchen before you order',
    'Every kitchen shows a hygiene grade from A to D, so you can choose with confidence.',
  ),
  _Slide(
    Icons.sensors_rounded,
    'Measured live, not once a year',
    'Sensors and AI check the kitchen continuously: gloves and hairnets, food preparation, and the refrigerator.',
  ),
  _Slide(
    Icons.visibility_off_rounded,
    'Private by design',
    'Video never leaves the kitchen. You see the grade and why, never the people working there.',
  ),
];

class _WelcomePageState extends ConsumerState<WelcomePage> {
  final _pages = PageController();
  int _index = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  Future<void> _finish(String route) async {
    await ref.read(onboardingSeenProvider.notifier).complete();
    if (mounted) context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final last = _index == _slides.length - 1;
    return Scaffold(
      backgroundColor: AppColors.brandNavy, // the welcome slides are dark in both modes
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 8, 8, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: BrandLockup(size: 32, color: Colors.white),
                    ),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: Colors.white70),
                    onPressed: () => _finish(Routes.signIn),
                    child: const Text('Skip'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pages,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) {
                  final s = _slides[i];
                  // Scrolls when large text makes a slide taller than the screen.
                  return Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 88,
                            height: 88,
                            decoration: BoxDecoration(
                              color: context.colors.primary.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(26),
                            ),
                            child: Icon(s.icon, color: context.colors.primary, size: 46),
                          ),
                          const SizedBox(height: 36),
                          Text(s.title, style: t.displaySmall?.copyWith(color: Colors.white)),
                          const SizedBox(height: 14),
                          Text(s.text, style: t.bodyLarge?.copyWith(color: Colors.white70, fontSize: 17)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      for (var i = 0; i < _slides.length; i++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          margin: const EdgeInsets.only(right: 6),
                          width: i == _index ? 24 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: i == _index ? context.colors.primary : Colors.white24,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.brandNavy),
                    onPressed: last
                        ? () => _finish(Routes.signUp)
                        : () => _pages.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                    child: Text(last ? 'Create an account' : 'Next'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: Colors.white),
                    onPressed: () => _finish(Routes.signIn),
                    child: const Text('I already have an account'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
