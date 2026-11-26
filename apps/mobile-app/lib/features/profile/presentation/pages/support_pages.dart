import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../cart/presentation/cart_providers.dart';
import '../../../kitchens/presentation/widgets/hygiene_explainer.dart';

/// Answers to the questions customers actually ask.
class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  static const _faqs = <(String, String)>[
    (
      'What does the hygiene grade mean?',
      'A is good, B satisfactory, C below standard and D poor. The grade summarises the last 7 days of continuous '
          'monitoring of personal hygiene, food preparation and the kitchen environment.',
    ),
    (
      'Why does a kitchen say "Not verified"?',
      'It does not use Verified Kitchen monitoring, so there is no hygiene evidence for it. That does not mean it is '
          'unhygienic, only that it has not been measured.',
    ),
    (
      'Why is a grade "limited"?',
      'The kitchen was not monitored for part of its opening hours. Gaps can never improve a grade, so its grade is '
          'capped until monitoring is complete again.',
    ),
    (
      'Can I cancel an order?',
      'Yes, until the kitchen accepts it. Open the order and tap Cancel order. After that, contact the kitchen.',
    ),
    (
      'How do I pay?',
      'Cash on delivery. Pay the rider when your order arrives.',
    ),
    (
      'Something was wrong with my order',
      'Open the delivered order and tap "Report a problem". The kitchen sees your report privately.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          for (final (q, a) in _faqs)
            Theme(
              data: Theme.of(context)
                  .copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 14),
                title: Text(q, style: t.titleMedium),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      a,
                      style: t.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => showHygieneExplainer(context),
            child: const Text('How hygiene grades work'),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.fill,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.support_agent_rounded),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'For a problem with an order, open it under Orders and tap "Report a problem". '
                    'The kitchen receives it straight away.',
                    style: t.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Terms of use and privacy policy, in plain language.
class LegalPage extends StatelessWidget {
  const LegalPage({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    Widget section(String title, String body) => Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: t.titleMedium),
          const SizedBox(height: 6),
          Text(
            body,
            style: t.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & privacy')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          Text('Privacy', style: t.headlineSmall),
          const SizedBox(height: 12),
          section(
            'What we keep about you',
            'Your name, mobile number and email (your account), your saved addresses and favourite kitchens, '
                'and your orders. Nothing else.',
          ),
          section(
            'Who sees it',
            'A kitchen sees your name, number, delivery address and order only for orders you place with it. '
                'Your feedback on an order is seen only by that kitchen. Nobody else sees your data.',
          ),
          section(
            'Kitchen monitoring',
            'Kitchen cameras are analysed inside the kitchen. No image or video is stored or sent anywhere, and '
                'no one is identified. You see a hygiene grade and its reasons, never the people working there.',
          ),
          section(
            'Deleting your account',
            'You can delete your account at any time from Account. Your login, profile, addresses and favourites '
                'are erased. Past orders stay with the kitchen for its records, without your name or account.',
          ),
          const Divider(height: 32),
          Text('Terms of use', style: t.headlineSmall),
          const SizedBox(height: 12),
          section(
            'Hygiene grades',
            'Grades describe measured hygiene over the past 7 days. They are information to help you choose, not a '
                'guarantee of food safety. Kitchens marked "Not verified" have no hygiene evidence.',
          ),
          section(
            'Orders and payment',
            'Prices are set by the kitchen and confirmed when you order. Payment is cash on delivery. You can cancel '
                'until the kitchen accepts your order.',
          ),
          section(
            'Prototype',
            'Verified Kitchen is a final-year project prototype. Kitchens marked "demo" are sample listings, not '
                'real businesses.',
          ),
        ],
      ),
    );
  }
}

/// Permanently delete the customer's account, after a clear explanation.
class DeleteAccountPage extends ConsumerStatefulWidget {
  const DeleteAccountPage({super.key});

  @override
  ConsumerState<DeleteAccountPage> createState() => _DeleteAccountPageState();
}

class _DeleteAccountPageState extends ConsumerState<DeleteAccountPage> {
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      ref.read(cartProvider.notifier).clear();
      await ref.read(authRepositoryProvider).deleteAccount();
      // Signed out: the router returns to the sign-in screen.
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final muted = t.bodyMedium?.copyWith(color: AppColors.textSecondary);
    final ready = _confirm.text.trim().toUpperCase() == 'DELETE';
    return Scaffold(
      appBar: AppBar(title: const Text('Delete account')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          Text('This cannot be undone', style: t.headlineSmall),
          const SizedBox(height: 12),
          Text('Deleted straight away:', style: t.titleSmall),
          const SizedBox(height: 4),
          Text(
            '• Your login, name and phone number\n• Saved addresses\n• Favourite kitchens',
            style: muted,
          ),
          const SizedBox(height: 12),
          Text(
            'Kept by the kitchen, without your name or account:',
            style: t.titleSmall,
          ),
          const SizedBox(height: 4),
          Text(
            '• Past orders and any feedback you gave (for their records)',
            style: muted,
          ),
          const SizedBox(height: 12),
          Text(
            'You cannot delete your account while an order is in progress.',
            style: muted,
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _confirm,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Type DELETE to confirm',
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: t.bodyMedium?.copyWith(color: AppColors.danger),
            ),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.danger,
                ),
                onPressed: ready && !_busy ? _delete : null,
                child: Text(_busy ? 'Deleting…' : 'Delete my account'),
              ),
              TextButton(
                onPressed: () => context.go(Routes.profile),
                child: const Text('Keep my account'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
