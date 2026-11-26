/// Where Supabase email links (confirm account, reset password) send the user.
/// Must be allowed in Supabase -> Authentication -> URL Configuration -> Redirect URLs,
/// and matches the intent filter in android/app/src/main/AndroidManifest.xml.
const String authRedirectUrl = 'lk.verifiedkitchen://login-callback';
