import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:verified_kitchen_app/core/supabase/errors.dart';
import 'package:verified_kitchen_app/core/supabase/timeout_client.dart';

void main() {
  test('a stalled request gives up and becomes a "no internet" message', () async {
    final stalled = MockClient((_) => Completer<http.Response>().future); // never answers
    final client = TimeoutClient(inner: stalled, timeout: const Duration(milliseconds: 50));
    final error = await client
        .get(Uri.parse('https://example.supabase.co/rest/v1/x'))
        .then<Object?>((_) => null, onError: (Object e) => e);
    expect(error, isA<TimeoutException>());
    expect(toUserFacing(error!).message, 'No internet connection. Check your connection and try again.');
  });

  test('a normal request passes straight through', () async {
    final ok = MockClient((_) async => http.Response('[]', 200));
    final res = await TimeoutClient(inner: ok).get(Uri.parse('https://example.supabase.co/rest/v1/x'));
    expect(res.statusCode, 200);
  });
}
