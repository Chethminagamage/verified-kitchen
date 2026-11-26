import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/supabase_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../cart/presentation/cart_providers.dart';
import '../../../kitchens/presentation/widgets/hygiene_explainer.dart';
import '../account_providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Stay')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    ref.read(cartProvider.notifier).clear(); // a shared phone must not keep someone else's cart
    await ref.read(authRepositoryProvider).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final user = ref.watch(currentUserProvider);
    final profile = ref.watch(profileProvider).value;
    final name = (profile?.fullName ?? user?.userMetadata?['full_name'] as String?)?.trim();
    final phone = profile?.phone;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name?.isNotEmpty == true ? name! : 'Your account', style: t.headlineMedium),
                      const SizedBox(height: 4),
                      Text(user?.email ?? '', style: t.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                      if (phone != null) Text(phone, style: t.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.fill,
                  child: Text((name?.isNotEmpty == true ? name![0] : '?').toUpperCase(), style: t.headlineSmall),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                _QuickAction(
                  icon: Icons.favorite_border_rounded,
                  label: 'Favourites',
                  onTap: () => context.push(Routes.favourites),
                ),
                const SizedBox(width: 10),
                _QuickAction(
                  icon: Icons.receipt_long_outlined,
                  label: 'Orders',
                  onTap: () => context.go(Routes.orders),
                ),
                const SizedBox(width: 10),
                _QuickAction(
                  icon: Icons.location_on_outlined,
                  label: 'Addresses',
                  onTap: () => context.push(Routes.addresses),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _Tile(
              icon: Icons.person_outline_rounded,
              title: 'Personal information',
              onTap: () => context.push(Routes.editProfile),
            ),
            _Tile(
              icon: Icons.verified_outlined,
              title: 'How hygiene grades work',
              onTap: () => showHygieneExplainer(context),
            ),
            _Tile(icon: Icons.help_outline_rounded, title: 'Help & support', onTap: () => context.push(Routes.help)),
            _Tile(icon: Icons.privacy_tip_outlined, title: 'Terms & privacy', onTap: () => context.push(Routes.legal)),
            _Tile(icon: Icons.info_outline_rounded, title: 'About', onTap: () => context.push(Routes.about)),
            const Divider(height: 32),
            _Tile(
              icon: Icons.logout_rounded,
              title: 'Sign out',
              destructive: true,
              onTap: () => _signOut(context, ref),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                style: TextButton.styleFrom(foregroundColor: AppColors.textMuted),
                onPressed: () => context.push(Routes.deleteAccount),
                child: const Text('Delete account'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: AppColors.fill,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              children: [
                Icon(icon, color: AppColors.ink),
                const SizedBox(height: 6),
                Text(label, style: Theme.of(context).textTheme.labelMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.title, required this.onTap, this.destructive = false});

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.danger : AppColors.ink;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: color),
      title: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color)),
      trailing: destructive ? null : const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
      onTap: onTap,
    );
  }
}
