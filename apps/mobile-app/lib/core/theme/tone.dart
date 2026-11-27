/// What a colour means, independent of light or dark mode. Domain values
/// (grades, hygiene levels, order states) carry a tone; the active palette
/// turns it into an actual colour (see AppColors.tone).
enum Tone {
  /// Good news: grade A, delivered.
  positive,

  /// Fine but not the best: grade B.
  good,

  /// Needs attention: grade C.
  warning,

  /// Bad news: grade D, cancelled.
  critical,

  /// Normal primary text (an order in progress).
  ink,

  /// No information (an area without evidence).
  muted,
}
