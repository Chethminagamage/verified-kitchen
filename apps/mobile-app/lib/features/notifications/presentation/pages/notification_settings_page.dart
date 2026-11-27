import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../domain/notification.dart';
import '../notification_providers.dart';

/// Which notifications the customer wants. Saved to their account, so the
/// choice applies on every phone they use.
class NotificationSettingsPage extends ConsumerWidget {
  const NotificationSettingsPage({super.key});

  Future<void> _save(BuildContext context, WidgetRef ref, NotificationSettings next, {required bool turningOn}) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(notificationSettingsProvider.notifier).save(next);
      // Turning something on is the natural moment to ask the phone for permission.
      if (turningOn) await ref.read(pushRegistrationProvider.notifier).askPermission();
    } on UserFacingError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: AsyncView<NotificationSettings>(
        value: ref.watch(notificationSettingsProvider),
        onRetry: () => ref.invalidate(notificationSettingsProvider),
        data: (s) => ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            SwitchListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              value: s.hygieneAlerts,
              onChanged: (v) => _save(context, ref, s.copyWith(hygieneAlerts: v), turningOn: v),
              title: Text('Hygiene alerts', style: t.titleMedium),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'When a favourite kitchen, or one you ordered from in the last 30 days, changes hygiene grade or '
                  'verification. Also if it changes while your order is in progress.',
                  style: t.bodySmall?.copyWith(color: context.colors.textSecondary, height: 1.4),
                ),
              ),
            ),
            SwitchListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              value: s.weeklySummary,
              onChanged: (v) => _save(context, ref, s.copyWith(weeklySummary: v), turningOn: v),
              title: Text('Weekly summary', style: t.titleMedium),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'On Sunday evenings: how your favourite kitchens are rated this week.',
                  style: t.bodySmall?.copyWith(color: context.colors.textSecondary, height: 1.4),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Text(
                'Alerts use only the public hygiene rating. They never include staff, camera images or individual '
                'incidents.',
                style: t.bodySmall?.copyWith(color: context.colors.textMuted, height: 1.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
