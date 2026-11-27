import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatting.dart';
import '../../../../core/widgets/async_view.dart';
import '../../domain/notification.dart';
import '../notification_providers.dart';

/// The customer's inbox: hygiene alerts and weekly summaries, newest first.
class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  @override
  void initState() {
    super.initState();
    // Always show the latest on opening (the list stays visible while it reloads).
    Future.microtask(() => ref.invalidate(inboxProvider));
  }

  @override
  Widget build(BuildContext context) {
    final inbox = ref.watch(inboxProvider);
    final unread = ref.watch(unreadCountProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unread > 0)
            // An icon keeps the bar from overflowing at large text sizes.
            IconButton(
              tooltip: 'Mark all read',
              icon: const Icon(Icons.done_all_rounded),
              onPressed: () => ref.read(inboxProvider.notifier).markAllRead(),
            ),
          IconButton(
            tooltip: 'Notification settings',
            icon: const Icon(Icons.tune_rounded),
            onPressed: () => context.push(Routes.notificationSettings),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: context.colors.ink,
        onRefresh: () async {
          final _ = await ref.refresh(inboxProvider.future);
        },
        child: AsyncView<List<AppNotification>>(
          value: inbox,
          onRetry: () => ref.invalidate(inboxProvider),
          data: (items) => items.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      icon: Icons.notifications_none_rounded,
                      title: 'No notifications yet',
                      message: 'We tell you when the hygiene of a kitchen you use changes, and send a weekly summary of your favourites.',
                    ),
                  ],
                )
              : ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const Divider(indent: 76),
                  itemBuilder: (_, i) => _NotificationTile(notification: items[i]),
                ),
        ),
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final n = notification;
    final t = Theme.of(context).textTheme;
    final color = context.colors.tone(n.tone);
    return Semantics(
      label: n.isRead ? null : 'Unread',
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: context.colors.toneSoft(n.tone), shape: BoxShape.circle),
          child: Icon(n.kind.icon, size: 20, color: color),
        ),
        title: Text(n.title, style: t.titleSmall?.copyWith(fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(n.body, style: t.bodySmall?.copyWith(color: context.colors.textSecondary, height: 1.4)),
              const SizedBox(height: 4),
              Text(
                formatAgo(n.createdAt, DateTime.now()),
                style: t.labelSmall?.copyWith(color: context.colors.textMuted),
              ),
            ],
          ),
        ),
        trailing: n.isRead
            ? null
            : Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(color: context.colors.primary, shape: BoxShape.circle),
              ),
        onTap: () {
          if (!n.isRead) ref.read(inboxProvider.notifier).markRead(n.id).catchError((_) {});
          switch (targetOf(orderId: n.orderId, kitchenId: n.kitchenId)) {
            case OrderTarget(:final id):
              context.push(Routes.order(id));
            case KitchenTarget(:final id):
              context.push(Routes.kitchen(id));
            case InboxTarget():
              break; // a summary: nothing more to open
          }
        },
      ),
    );
  }
}
