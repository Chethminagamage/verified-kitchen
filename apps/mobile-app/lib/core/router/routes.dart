abstract final class Routes {
  static const String signIn = '/sign-in';
  static const String signUp = '/sign-up';
  static const String welcome = '/welcome';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String home = '/home';
  static const String search = '/search';
  static const String orders = '/orders';
  static const String profile = '/profile';
  static const String cart = '/cart';
  static const String checkout = '/checkout';
  static const String editProfile = '/profile/edit';
  static const String changePassword = '/profile/password';
  static const String changeEmail = '/profile/email';
  static const String notifications = '/notifications';
  static const String notificationSettings = '/profile/notifications';
  static const String addresses = '/profile/addresses';
  static const String newAddress = '/profile/addresses/new';
  static const String favourites = '/profile/favourites';
  static const String about = '/profile/about';
  static const String help = '/profile/help';
  static const String legal = '/profile/legal';
  static const String deleteAccount = '/profile/delete';

  static String kitchen(String id) => '/kitchen/$id';
  static String order(String id) => '/orders/$id';
  static String editAddress(String id) => '/profile/addresses/$id';

  /// Screens reachable without an account.
  static const Set<String> public = {signIn, signUp, welcome, forgotPassword};
}
