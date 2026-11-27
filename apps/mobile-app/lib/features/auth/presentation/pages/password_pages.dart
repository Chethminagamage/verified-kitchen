import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/auth_repository.dart';
import '../../domain/validators.dart';
import '../auth_flow_providers.dart';
import '../widgets/auth_scaffold.dart';

/// Step 1: request a reset link by email.
class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).sendPasswordReset(_email.text);
      setState(() => _sent = true);
    } on AuthFailure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_sent) {
      return AuthScaffold(
        title: 'Check your email',
        subtitle:
            'If an account exists for ${_email.text.trim()}, we sent a link to reset your password. '
            'Open it on this phone.',
        onBack: () => context.go(Routes.signIn),
        child: FilledButton(onPressed: () => context.go(Routes.signIn), child: const Text('Back to sign in')),
      );
    }
    return AuthScaffold(
      title: 'Reset password',
      subtitle: 'Enter your account email and we will send you a reset link.',
      onBack: () => context.go(Routes.signIn),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.send,
              onFieldSubmitted: (_) => _send(),
              decoration: const InputDecoration(hintText: 'Email'),
              validator: Validators.email,
            ),
            if (_error != null) ...[const SizedBox(height: 12), AuthError(message: _error!)],
            const SizedBox(height: 20),
            FilledButton(onPressed: _busy ? null : _send, child: Text(_busy ? 'Sending…' : 'Send reset link')),
          ],
        ),
      ),
    );
  }
}

/// Step 2: shown after opening the email link (the app holds a recovery session).
class ResetPasswordPage extends ConsumerStatefulWidget {
  const ResetPasswordPage({super.key});

  @override
  ConsumerState<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends ConsumerState<ResetPasswordPage> {
  final _form = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _hidden = true;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).updatePassword(_password.text);
      ref.read(passwordRecoveryProvider.notifier).done();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed')));
        context.go(Routes.home);
      }
    } on AuthFailure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Set a new password',
      subtitle: 'Choose a password you have not used before.',
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _password,
              obscureText: _hidden,
              keyboardType: TextInputType.visiblePassword,
              autocorrect: false,
              enableSuggestions: false,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                hintText: 'New password (8+ characters)',
                suffixIcon: IconButton(
                  tooltip: _hidden ? 'Show password' : 'Hide password',
                  icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _hidden = !_hidden),
                ),
              ),
              validator: Validators.password,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirm,
              obscureText: _hidden,
              keyboardType: TextInputType.visiblePassword,
              autocorrect: false,
              enableSuggestions: false,
              decoration: const InputDecoration(hintText: 'Repeat new password'),
              validator: (v) => v != _password.text ? 'The passwords do not match' : null,
            ),
            if (_error != null) ...[const SizedBox(height: 12), AuthError(message: _error!)],
            const SizedBox(height: 20),
            FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save new password')),
            const SizedBox(height: 12),
            Text(
              'For your security, other devices stay signed in until their session expires.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.colors.textMuted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
