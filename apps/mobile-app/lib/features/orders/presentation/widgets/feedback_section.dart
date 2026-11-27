import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/supabase/errors.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/order.dart';
import '../order_providers.dart';

/// "How was your order?" on a delivered order. Private to the kitchen; it
/// never changes the public hygiene grade (that comes only from evidence).
class FeedbackSection extends ConsumerWidget {
  const FeedbackSection({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = Theme.of(context).textTheme;
    final feedback = ref.watch(orderFeedbackProvider(orderId));
    return feedback.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (f) {
        if (f != null) {
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: context.colors.fill, borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                Icon(Icons.check_circle_rounded, color: context.colors.success),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Thanks for your feedback', style: t.titleSmall),
                      Text(
                        [
                          if (f.rating != null) 'You rated it ${f.rating}/5',
                          if (f.problem != null) f.problem!.label,
                        ].join(' · '),
                        style: t.bodySmall?.copyWith(color: context.colors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.colors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('How was your order?', style: t.titleMedium),
              const SizedBox(height: 4),
              Text(
                'Your feedback goes privately to the kitchen.',
                style: t.bodySmall?.copyWith(color: context.colors.textSecondary),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
                      onPressed: () => _open(context, ref),
                      icon: const Icon(Icons.star_outline_rounded),
                      label: const Text('Rate'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
                      onPressed: () => _open(context, ref, reportProblem: true),
                      icon: const Icon(Icons.flag_outlined),
                      label: const Text('Report a problem'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _open(BuildContext context, WidgetRef ref, {bool reportProblem = false}) async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FeedbackSheet(orderId: orderId, reportProblem: reportProblem),
    );
    if (sent == true) {
      ref.invalidate(orderFeedbackProvider(orderId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback sent to the kitchen')));
      }
    }
  }
}

class _FeedbackSheet extends ConsumerStatefulWidget {
  const _FeedbackSheet({required this.orderId, required this.reportProblem});

  final String orderId;
  final bool reportProblem;

  @override
  ConsumerState<_FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends ConsumerState<_FeedbackSheet> {
  final _comment = TextEditingController();
  int? _rating;
  OrderProblem? _problem;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  bool get _valid => widget.reportProblem ? _problem != null : _rating != null;

  Future<void> _send() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(orderRepositoryProvider)
          .submitFeedback(widget.orderId, rating: _rating, problem: _problem?.value, comment: _comment.text);
      if (mounted) Navigator.pop(context, true);
    } on UserFacingError catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.reportProblem ? 'Report a problem' : 'Rate your order', style: t.headlineSmall),
          const SizedBox(height: 16),
          if (!widget.reportProblem) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 1; i <= 5; i++)
                  IconButton(
                    tooltip: '$i star${i == 1 ? '' : 's'}',
                    iconSize: 40,
                    onPressed: () => setState(() => _rating = i),
                    icon: Icon(
                      (_rating ?? 0) >= i ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: (_rating ?? 0) >= i ? AppColors.star : context.colors.textMuted,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text('Anything wrong? (optional)', style: t.titleSmall),
            const SizedBox(height: 8),
          ],
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in OrderProblem.values)
                ChoiceChip(
                  label: Text(p.label),
                  selected: _problem == p,
                  onSelected: (on) => setState(() => _problem = on ? p : null),
                ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _comment,
            maxLength: 500,
            maxLines: 3,
            minLines: 2,
            decoration: const InputDecoration(hintText: 'Tell the kitchen more (optional)'),
          ),
          if (_problem == OrderProblem.hygieneConcern)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                'Hygiene concerns are flagged to the kitchen so it can act on them.',
                style: t.bodySmall?.copyWith(color: context.colors.textSecondary),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: t.bodyMedium?.copyWith(color: context.colors.danger)),
            ),
          FilledButton(onPressed: _valid && !_busy ? _send : null, child: Text(_busy ? 'Sending…' : 'Send')),
        ],
      ),
    );
  }
}
