import 'dart:async';

import 'package:http/http.dart' as http;

/// Every request to Supabase gives up after [timeout] instead of waiting
/// forever on a connection that is "up" but not working (weak signal, captive
/// Wi-Fi). Screens then show "Check your internet connection" with Try again,
/// rather than loading without end. Uploads get longer than ordinary reads.
class TimeoutClient extends http.BaseClient {
  TimeoutClient({http.Client? inner, this.timeout = const Duration(seconds: 15)}) : _inner = inner ?? http.Client();

  final http.Client _inner;
  final Duration timeout;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    final isUpload = (request.contentLength ?? 0) > 512 * 1024;
    return _inner.send(request).timeout(isUpload ? timeout * 4 : timeout);
  }

  @override
  void close() => _inner.close();
}
