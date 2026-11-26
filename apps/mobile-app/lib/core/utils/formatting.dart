import 'package:intl/intl.dart';

final NumberFormat _lkr = NumberFormat.decimalPattern('en_US');

/// "LKR 1,250" (no decimals for whole rupees).
String formatLkr(num amount) {
  final whole = amount == amount.roundToDouble();
  return 'LKR ${whole ? _lkr.format(amount.round()) : NumberFormat('#,##0.00', 'en_US').format(amount)}';
}

/// "just now", "4 min ago", "3 h ago", "2 days ago".
String formatAgo(DateTime then, DateTime now) {
  final d = now.difference(then);
  if (d.inSeconds < 60) return 'just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} h ago';
  final days = d.inDays;
  return days == 1 ? '1 day ago' : '$days days ago';
}

/// "08:00" from a Postgres time ("08:00:00").
String formatClock(String pgTime) =>
    pgTime.length >= 5 ? pgTime.substring(0, 5) : pgTime;
