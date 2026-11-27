import '../config/env.dart';

/// The public Storage bucket holding kitchen banners and dish photos.
const String mediaBucket = 'kitchen-media';

/// Public URL of a file in [mediaBucket], or null when there is no file.
///
/// The database stores only the path (e.g. `<kitchen id>/dishes/<id>-<ts>.jpg`),
/// so the URL is always built from the project the app is connected to.
String? mediaUrl(String? path, {String baseUrl = Env.supabaseUrl}) {
  final p = path?.trim();
  if (p == null || p.isEmpty) return null;
  final encoded = p.split('/').map(Uri.encodeComponent).join('/');
  return '$baseUrl/storage/v1/object/public/$mediaBucket/$encoded';
}
