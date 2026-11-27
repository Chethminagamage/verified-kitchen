import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../auth/domain/validators.dart';
import '../../../auth/presentation/widgets/auth_scaffold.dart' show AuthError;

/// Change the password while signed in. The current password is asked for
/// first, and other devices can be signed out in the same step.
class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _hidden = true;
  bool _signOutOthers = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .changePassword(currentPassword: _current.text, newPassword: _new.text, signOutOtherDevices: _signOutOthers);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_signOutOthers ? 'Password changed. Other devices were signed out.' : 'Password changed'),
        ),
      );
      context.pop();
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final eye = IconButton(
      tooltip: _hidden ? 'Show passwords' : 'Hide passwords',
      icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
      onPressed: () => setState(() => _hidden = !_hidden),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: Form(
        key: _form,
        child: AutofillGroup(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'You stay signed in on this phone.',
                style: t.bodyMedium?.copyWith(color: context.colors.textSecondary),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _current,
                obscureText: _hidden,
                // No suggestions or autocorrect, even when shown: a keyboard must not add spaces.
                keyboardType: TextInputType.visiblePassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: 'Current password', suffixIcon: eye),
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _new,
                obscureText: _hidden,
                // No suggestions or autocorrect, even when shown: a keyboard must not add spaces.
                keyboardType: TextInputType.visiblePassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'New password', helperText: 'At least 8 characters'),
                validator: (v) => Validators.newPassword(v, current: _current.text),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _confirm,
                obscureText: _hidden,
                // No suggestions or autocorrect, even when shown: a keyboard must not add spaces.
                keyboardType: TextInputType.visiblePassword,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _busy ? null : _save(),
                decoration: const InputDecoration(labelText: 'Repeat new password'),
                validator: (v) => v != _new.text ? 'The passwords do not match' : null,
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                value: _signOutOthers,
                onChanged: (v) => setState(() => _signOutOthers = v ?? true),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: Text('Sign out of other devices', style: t.bodyLarge),
                subtitle: Text(
                  'Recommended if you think someone else knows your password.',
                  style: t.bodySmall?.copyWith(color: context.colors.textMuted),
                ),
              ),
              if (_error != null) ...[const SizedBox(height: 8), AuthError(message: _error!)],
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Changing…' : 'Change password')),
        ),
      ),
    );
  }
}
