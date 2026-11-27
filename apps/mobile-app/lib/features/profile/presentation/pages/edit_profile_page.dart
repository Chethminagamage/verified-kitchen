import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/errors.dart';
import '../../../../core/supabase/supabase_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../auth/domain/validators.dart';
import '../../domain/address.dart';
import '../account_providers.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _filled = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(accountRepositoryProvider).updateProfile(fullName: _name.text, phone: _phone.text);
      ref.invalidate(profileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
        context.pop();
      }
    } on UserFacingError catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Personal information')),
      body: AsyncView<CustomerProfile>(
        value: profile,
        onRetry: () => ref.invalidate(profileProvider),
        data: (p) {
          if (!_filled) {
            _name.text = p.fullName ?? '';
            _phone.text = p.phone ?? '';
            _filled = true;
          }
          return Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                TextFormField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  validator: Validators.name,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Mobile number'),
                  validator: Validators.phone,
                ),
                const SizedBox(height: 12),
                _EmailRow(email: p.email),
                const SizedBox(height: 8),
                Text(
                  'Kitchens see your name and number only on orders you place.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.colors.textMuted),
                ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save')),
        ),
      ),
    );
  }
}

/// The sign-in email with a "Change" action, and a note while a change
/// is waiting for the customer to open the confirmation link.
class _EmailRow extends ConsumerWidget {
  const _EmailRow({required this.email});

  final String email;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final pending = ref.watch(currentUserProvider)?.newEmail;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
      decoration: BoxDecoration(color: context.colors.fill, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Email (used to sign in)', style: t.bodySmall?.copyWith(color: context.colors.textSecondary)),
                    const SizedBox(height: 2),
                    Text(email, style: t.bodyLarge),
                  ],
                ),
              ),
              TextButton(onPressed: () => context.push(Routes.changeEmail), child: const Text('Change')),
            ],
          ),
          if (pending != null && pending.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Waiting for you to confirm $pending. Open the link we emailed you.',
              style: t.bodySmall?.copyWith(color: context.colors.warning),
            ),
          ],
        ],
      ),
    );
  }
}
