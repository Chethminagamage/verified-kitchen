import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/async_view.dart';
import '../../../auth/domain/validators.dart';
import '../../../kitchens/domain/hygiene.dart';
import '../../../kitchens/presentation/kitchen_providers.dart';
import '../../../kitchens/presentation/widgets/hygiene_badge.dart';
import '../../../orders/presentation/order_providers.dart';
import '../../../profile/domain/address.dart';
import '../../../profile/presentation/account_providers.dart';
import '../cart_providers.dart';
import '../widgets/cart_widgets.dart';

class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key});

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _note = TextEditingController();
  String? _addressId;
  bool _phoneFilled = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _note.dispose();
    super.dispose();
  }

  SavedAddress? _selected(List<SavedAddress> addresses) {
    if (addresses.isEmpty) return null;
    return addresses.where((a) => a.id == _addressId).firstOrNull ??
        addresses.where((a) => a.isDefault).firstOrNull ??
        addresses.first;
  }

  Future<void> _placeOrder(SavedAddress address) async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final cart = ref.read(cartProvider);
      final id = await ref
          .read(orderRepositoryProvider)
          .place(
            cart: cart,
            deliveryAddress: address.forDelivery,
            contactPhone: _phone.text,
            note: _note.text,
          );
      ref.read(cartProvider.notifier).clear();
      ref.invalidate(myOrdersProvider);
      if (mounted) context.go(Routes.order(id));
    } on UserFacingError catch (e) {
      setState(() => _error = e.message);
      // A changed menu or price: show the latest before the customer retries.
      ref.invalidate(menuProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final cart = ref.watch(cartProvider);
    final addresses = ref.watch(addressesProvider);
    final profile = ref.watch(profileProvider).value;
    final kitchen = cart.kitchenId == null
        ? null
        : ref.watch(kitchenProvider(cart.kitchenId!)).value;

    if (!_phoneFilled && profile?.phone != null) {
      _phone.text = profile!.phone!;
      _phoneFilled = true;
    }
    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(),
        body: const EmptyState(
          icon: Icons.shopping_bag_outlined,
          title: 'Your cart is empty',
          message: '',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: AsyncView<List<SavedAddress>>(
        value: addresses,
        onRetry: () => ref.invalidate(addressesProvider),
        data: (list) {
          final selected = _selected(list);
          return Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              children: [
                Text('Deliver to', style: t.titleLarge),
                const SizedBox(height: 8),
                if (list.isEmpty)
                  Text(
                    'Add a delivery address to continue.',
                    style: t.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                RadioGroup<String>(
                  groupValue: selected?.id,
                  onChanged: (id) => setState(() => _addressId = id),
                  child: Column(
                    children: [
                      for (final a in list)
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          value: a.id,
                          title: Text(a.label, style: t.titleSmall),
                          subtitle: Text(
                            a.forDelivery,
                            style: t.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    onPressed: () => context.push(Routes.newAddress),
                    icon: const Icon(Icons.add_location_alt_outlined),
                    label: const Text('Add a new address'),
                  ),
                ),
                const Divider(height: 28),
                Text('Contact', style: t.titleLarge),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: 'Mobile number for the rider',
                  ),
                  validator: Validators.phone,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _note,
                  maxLength: 300,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Note for the kitchen (optional)',
                  ),
                ),
                const Divider(height: 28),
                Text('Payment', style: t.titleLarge),
                const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.payments_outlined),
                  title: Text('Cash on delivery'),
                  subtitle: Text('Pay the rider when your order arrives.'),
                ),
                if (kitchen != null) ...[
                  const Divider(height: 28),
                  Row(
                    children: [
                      Expanded(
                        child: Text('Kitchen hygiene', style: t.titleLarge),
                      ),
                      HygieneBadge(
                        status: kitchen.status,
                        grade: kitchen.grade,
                        dense: true,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    kitchen.grade?.needsAlert == true
                        ? 'Hygiene alert: this kitchen has been below standard over the past week.'
                        : kitchen.status == HygieneStatus.notMonitored
                        ? 'This kitchen is not hygiene-verified.'
                        : 'This kitchen’s hygiene is monitored by sensors and AI.',
                    style: t.bodySmall?.copyWith(
                      color: kitchen.grade?.needsAlert == true
                          ? AppColors.danger
                          : AppColors.textSecondary,
                    ),
                  ),
                ],
                const Divider(height: 28),
                PriceRow(
                  label: 'Subtotal (${cart.itemCount} items)',
                  amount: cart.subtotal,
                ),
                PriceRow(label: 'Delivery fee', amount: cart.deliveryFeeLkr),
                PriceRow(label: 'Total', amount: cart.total, bold: true),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.dangerSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: t.bodyMedium?.copyWith(color: AppColors.danger),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Builder(
            builder: (context) {
              final selected = _selected(addresses.value ?? const []);
              final closed = kitchen != null && !kitchen.isOpen;
              return FilledButton(
                onPressed: _busy || selected == null || closed
                    ? null
                    : () => _placeOrder(selected),
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Text(closed ? 'Kitchen is closed now' : 'Place order'),
              );
            },
          ),
        ),
      ),
    );
  }
}
