import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/supabase/supabase_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../auth/domain/validators.dart';
import '../../../auth/presentation/widgets/auth_scaffold.dart' show AuthError;

/// Change the sign-in email. Nothing changes until the customer opens the
/// confirmation link sent to the new address.
class ChangeEmailPage extends ConsumerStatefulWidget {
  const ChangeEmailPage({super.key});

  @override
  ConsumerState<ChangeEmailPage> createState() => _ChangeEmailPageState();
}

class _ChangeEmailPageState extends ConsumerState<ChangeEmailPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _hidden = true;
  bool _busy = false;
  String? _error;

  /// The address a link was sent to; the screen then explains the next step.
  String? _sentTo;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).changeEmail(newEmail: _email.text, currentPassword: _password.text);
      if (mounted) setState(() => _sentTo = _email.text.trim().toLowerCase());
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final current = ref.watch(currentUserProvider)?.email ?? '';
    final sentTo = _sentTo;

    if (sentTo != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Change email')),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Icon(Icons.mark_email_read_outlined, size: 56, color: context.colors.primary),
            const SizedBox(height: 16),
            Text('Check your inbox', style: t.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'We sent a confirmation link to $sentTo. Your email changes when you open it. '
              'Until then, keep signing in with $current.',
              style: t.bodyLarge?.copyWith(color: context.colors.textSecondary),
            ),
            const SizedBox(height: 12),
            Text(
              'For your security, we may also send a link to $current. If you receive one, open it too.',
              style: t.bodyMedium?.copyWith(color: context.colors.textMuted),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: FilledButton(onPressed: () => context.pop(), child: const Text('Done')),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Change email')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Current email', style: t.bodySmall?.copyWith(color: context.colors.textMuted)),
            const SizedBox(height: 2),
            Text(current, style: t.titleMedium),
            const SizedBox(height: 20),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'New email'),
              validator: (v) {
                final problem = Validators.email(v);
                if (problem != null) return problem;
                return v!.trim().toLowerCase() == current.toLowerCase() ? 'That is already your email' : null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              obscureText: _hidden,
              keyboardType: TextInputType.visiblePassword,
              autocorrect: false,
              enableSuggestions: false,
              autofillHints: const [AutofillHints.password],
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _busy ? null : _send(),
              decoration: InputDecoration(
                labelText: 'Current password',
                helperText: 'To confirm it is you',
                suffixIcon: IconButton(
                  tooltip: _hidden ? 'Show password' : 'Hide password',
                  icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _hidden = !_hidden),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
            ),
            if (_error != null) ...[const SizedBox(height: 12), AuthError(message: _error!)],
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton(
            onPressed: _busy ? null : _send,
            child: Text(_busy ? 'Sending…' : 'Send confirmation link'),
          ),
        ),
      ),
    );
  }
}
