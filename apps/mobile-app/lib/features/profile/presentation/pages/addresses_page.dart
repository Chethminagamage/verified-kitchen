import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../domain/address.dart';
import '../account_providers.dart';

class AddressesPage extends ConsumerWidget {
  const AddressesPage({super.key});

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() action) async {
    try {
      await action();
      ref.invalidate(addressesProvider);
    } on UserFacingError catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final addresses = ref.watch(addressesProvider);
    final repo = ref.read(accountRepositoryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved addresses')),
      body: AsyncView<List<SavedAddress>>(
        value: addresses,
        onRetry: () => ref.invalidate(addressesProvider),
        data: (list) => list.isEmpty
            ? const EmptyState(
                icon: Icons.location_on_outlined,
                title: 'No saved addresses',
                message: 'Save your home or work address for faster checkout.',
              )
            : ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: list.length,
                separatorBuilder: (_, _) => const Divider(indent: 64),
                itemBuilder: (_, i) {
                  final a = list[i];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    leading: Icon(a.label.toLowerCase() == 'work' ? Icons.work_outline : Icons.home_outlined),
                    title: Row(
                      children: [
                        Flexible(child: Text(a.label, style: t.titleMedium)),
                        if (a.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: context.colors.primarySoft,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text('Default', style: t.labelSmall?.copyWith(color: context.colors.primaryDark)),
                          ),
                        ],
                      ],
                    ),
                    subtitle: Text(a.forDelivery, style: t.bodySmall?.copyWith(color: context.colors.textSecondary)),
                    onTap: () => context.push(Routes.editAddress(a.id), extra: a),
                    trailing: PopupMenuButton<String>(
                      tooltip: 'More',
                      onSelected: (v) => switch (v) {
                        'default' => _run(context, ref, () => repo.setDefaultAddress(a.id)),
                        'delete' => _run(context, ref, () => repo.deleteAddress(a.id)),
                        _ => null,
                      },
                      itemBuilder: (_) => [
                        if (!a.isDefault) const PopupMenuItem(value: 'default', child: Text('Make default')),
                        const PopupMenuItem(value: 'delete', child: Text('Delete')),
                      ],
                    ),
                  );
                },
              ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton.icon(
            onPressed: () => context.push(Routes.newAddress),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Add address'),
          ),
        ),
      ),
    );
  }
}

class AddressFormPage extends ConsumerStatefulWidget {
  const AddressFormPage({super.key, this.address});

  /// Null = new address.
  final SavedAddress? address;

  @override
  ConsumerState<AddressFormPage> createState() => _AddressFormPageState();
}

class _AddressFormPageState extends ConsumerState<AddressFormPage> {
  final _form = GlobalKey<FormState>();
  late final _label = TextEditingController(text: widget.address?.label ?? 'Home');
  late final _line = TextEditingController(text: widget.address?.addressLine ?? '');
  late final _instructions = TextEditingController(text: widget.address?.instructions ?? '');
  late bool _default = widget.address?.isDefault ?? false;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_label, _line, _instructions]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final existing = ref.read(addressesProvider).value ?? const <SavedAddress>[];
      await ref
          .read(accountRepositoryProvider)
          .saveAddress(
            id: widget.address?.id,
            label: _label.text,
            addressLine: _line.text,
            instructions: _instructions.text,
            // The first address becomes the default automatically.
            makeDefault: _default || existing.isEmpty,
          );
      ref.invalidate(addressesProvider);
      if (mounted) context.pop();
    } on UserFacingError catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.address == null ? 'New address' : 'Edit address')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Wrap(
              spacing: 8,
              children: [
                for (final l in ['Home', 'Work', 'Other'])
                  ChoiceChip(
                    label: Text(l),
                    selected: _label.text == l,
                    onSelected: (_) => setState(() => _label.text = l),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _label,
              maxLength: 30,
              decoration: const InputDecoration(labelText: 'Label'),
              onChanged: (_) => setState(() {}),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Give this address a name' : null,
            ),
            TextFormField(
              controller: _line,
              maxLines: 3,
              minLines: 2,
              maxLength: 300,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Address', hintText: 'House no., street, area, city'),
              validator: (v) => (v == null || v.trim().length < 5) ? 'Enter the full address' : null,
            ),
            TextFormField(
              controller: _instructions,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: 'Instructions for the rider (optional)',
                hintText: 'e.g. Blue gate, call when outside',
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Use as default address'),
              value: _default,
              onChanged: (v) => setState(() => _default = v),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save address')),
        ),
      ),
    );
  }
}
