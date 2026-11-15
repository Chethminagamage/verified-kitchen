import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();

    super.dispose();
  }

  void _createAccount() {
    FocusScope.of(context).unfocus();

    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) return;

    // Temporary navigation while authentication is UI-only.
    // Supabase registration will replace this later.
    context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final keyboardHeight = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      backgroundColor: AppColors.navyDark,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const BouncingScrollPhysics(),
              padding: EdgeInsets.only(bottom: keyboardHeight > 0 ? 20 : 0),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const _RegisterHero(),

                        _RegisterForm(
                          formKey: _formKey,
                          nameController: _nameController,
                          emailController: _emailController,
                          passwordController: _passwordController,
                          confirmPasswordController: _confirmPasswordController,
                          obscurePassword: _obscurePassword,
                          obscureConfirmPassword: _obscureConfirmPassword,
                          onTogglePassword: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                          onToggleConfirmPassword: () {
                            setState(() {
                              _obscureConfirmPassword =
                                  !_obscureConfirmPassword;
                            });
                          },
                          onCreateAccount: _createAccount,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RegisterHero extends StatelessWidget {
  const _RegisterHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.navyDark,
      padding: const EdgeInsets.fromLTRB(24, 26, 24, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          //
          // BRAND
          //
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.verified_outlined,
                  color: Colors.white,
                  size: 28,
                ),
              ),

              const SizedBox(width: 14),

              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Verified Kitchen',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Hygiene Intelligence Platform',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 30),

          //
          // HERO LABEL
          //
          const Text(
            'JOIN VERIFIED KITCHEN',
            style: TextStyle(
              color: AppColors.primaryLight,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            ),
          ),

          const SizedBox(height: 12),

          //
          // HERO TITLE
          //
          const Text(
            'Better food choices start with transparency.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 29,
              fontWeight: FontWeight.w700,
              height: 1.15,
              letterSpacing: -0.6,
            ),
          ),

          const SizedBox(height: 14),

          //
          // DESCRIPTION
          //
          Text(
            'Create your account to order food and view hygiene trust information from monitored kitchens.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.70),
              fontSize: 14,
              height: 1.55,
            ),
          ),

          const SizedBox(height: 22),

          //
          // BENEFITS
          //
          const Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _RegisterChip(
                icon: Icons.restaurant_outlined,
                text: 'Order food',
              ),
              _RegisterChip(icon: Icons.shield_outlined, text: 'Check hygiene'),
              _RegisterChip(
                icon: Icons.verified_user_outlined,
                text: 'Choose confidently',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RegisterChip extends StatelessWidget {
  final IconData icon;
  final String text;

  const _RegisterChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.primaryLight),
          const SizedBox(width: 7),
          Text(
            text,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _RegisterForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;

  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;

  final bool obscurePassword;
  final bool obscureConfirmPassword;

  final VoidCallback onTogglePassword;
  final VoidCallback onToggleConfirmPassword;
  final VoidCallback onCreateAccount;

  const _RegisterForm({
    required this.formKey,
    required this.nameController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.obscurePassword,
    required this.obscureConfirmPassword,
    required this.onTogglePassword,
    required this.onToggleConfirmPassword,
    required this.onCreateAccount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 48),
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            //
            // HEADER
            //
            const Text(
              'Create account',
              style: TextStyle(
                color: AppColors.primaryDark,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 6),

            const Text(
              'Join Verified Kitchen',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 27,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),

            const SizedBox(height: 8),

            const Text(
              'Set up your account to start exploring restaurants and hygiene trust information.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 26),

            //
            // FULL NAME
            //
            const _FormLabel(text: 'Full name'),

            const SizedBox(height: 8),

            TextFormField(
              controller: nameController,
              keyboardType: TextInputType.name,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.name],
              scrollPadding: const EdgeInsets.only(bottom: 140),
              decoration: const InputDecoration(
                hintText: 'Enter your full name',
                prefixIcon: Icon(Icons.person_outline_rounded),
              ),
              validator: (value) {
                final name = value?.trim() ?? '';

                if (name.isEmpty) {
                  return 'Full name is required.';
                }

                if (name.length < 2) {
                  return 'Enter a valid name.';
                }

                return null;
              },
            ),

            const SizedBox(height: 18),

            //
            // EMAIL
            //
            const _FormLabel(text: 'Email address'),

            const SizedBox(height: 8),

            TextFormField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              scrollPadding: const EdgeInsets.only(bottom: 150),
              decoration: const InputDecoration(
                hintText: 'example@email.com',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
              validator: (value) {
                final email = value?.trim() ?? '';

                if (email.isEmpty) {
                  return 'Email address is required.';
                }

                final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

                if (!emailPattern.hasMatch(email)) {
                  return 'Enter a valid email address.';
                }

                return null;
              },
            ),

            const SizedBox(height: 18),

            //
            // PASSWORD
            //
            const _FormLabel(text: 'Password'),

            const SizedBox(height: 8),

            TextFormField(
              controller: passwordController,
              obscureText: obscurePassword,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.newPassword],
              scrollPadding: const EdgeInsets.only(bottom: 170),
              decoration: InputDecoration(
                hintText: 'Create a password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  onPressed: onTogglePassword,
                  tooltip: obscurePassword ? 'Show password' : 'Hide password',
                  icon: Icon(
                    obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Password is required.';
                }

                if (value.length < 6) {
                  return 'Password must contain at least 6 characters.';
                }

                return null;
              },
            ),

            const SizedBox(height: 18),

            //
            // CONFIRM PASSWORD
            //
            const _FormLabel(text: 'Confirm password'),

            const SizedBox(height: 8),

            TextFormField(
              controller: confirmPasswordController,
              obscureText: obscureConfirmPassword,
              textInputAction: TextInputAction.done,
              scrollPadding: const EdgeInsets.only(bottom: 190),
              onFieldSubmitted: (_) => onCreateAccount(),
              decoration: InputDecoration(
                hintText: 'Re-enter your password',
                prefixIcon: const Icon(Icons.lock_reset_outlined),
                suffixIcon: IconButton(
                  onPressed: onToggleConfirmPassword,
                  tooltip: obscureConfirmPassword
                      ? 'Show password'
                      : 'Hide password',
                  icon: Icon(
                    obscureConfirmPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please confirm your password.';
                }

                if (value != passwordController.text) {
                  return 'Passwords do not match.';
                }

                return null;
              },
            ),

            const SizedBox(height: 26),

            //
            // CREATE ACCOUNT BUTTON
            //
            ElevatedButton(
              onPressed: onCreateAccount,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.person_add_alt_1_rounded, size: 18),
                  SizedBox(width: 8),
                  Text('Create Account'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            //
            // LOGIN LINK
            //
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'Already have an account?',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go(AppRoutes.login);
                    }
                  },
                  child: const Text(
                    'Sign in',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            //
            // TRUST NOTE
            //
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.shield_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Your account gives you access to food ordering and transparent kitchen hygiene trust information.',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12.5,
                        height: 1.45,
                      ),
                    ),
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

class _FormLabel extends StatelessWidget {
  final String text;

  const _FormLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 13.5,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
