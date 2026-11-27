// =====================================================================
// send-push: delivers a customer notification to their phones.
//
// Called by a Supabase Database Webhook on INSERT into
// public.customer_notifications. Looks up the customer's push tokens and
// sends each one through Firebase Cloud Messaging (HTTP v1), the delivery
// channel every Android app uses. Firebase is used only for delivery: all
// data stays in Supabase.
//
// Secrets (Supabase -> Edge Functions -> Secrets), never in git or the app:
//   FCM_SERVICE_ACCOUNT   the Firebase service-account key (whole JSON)
//   PUSH_WEBHOOK_SECRET   a random string; the webhook sends it in x-webhook-secret
// Provided by Supabase automatically: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Deploy with "Verify JWT" turned OFF: the webhook proves itself with the
// shared secret instead. Single file, so it can be pasted into the dashboard.
// =====================================================================

interface NotificationRecord {
  id: string;
  user_id: string;
  kind: "grade_changed" | "order_hygiene_changed" | "verification_changed" | "weekly_summary";
  title: string;
  body: string;
  kitchen_id: string | null;
  order_id: string | null;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing secret ${name}`);
  return value;
};

// ---------------------------------------------------------------- the message
/** The FCM message for one phone. Data keys let the app open the right screen. */
export function fcmMessage(token: string, n: NotificationRecord) {
  return {
    message: {
      token,
      notification: { title: n.title, body: n.body },
      data: {
        notification_id: n.id,
        kind: n.kind,
        kitchen_id: n.kitchen_id ?? "",
        order_id: n.order_id ?? "",
      },
      android: {
        priority: n.kind === "order_hygiene_changed" ? "HIGH" : "NORMAL",
        notification: {
          channel_id: n.kind === "weekly_summary" ? "weekly_summary" : "hygiene_alerts",
          // A newer alert about the same kitchen replaces the older one in the tray.
          tag: n.kitchen_id ?? n.kind,
        },
      },
    },
  };
}

// ---------------------------------------------------------------- Google access token
const base64url = (data: ArrayBuffer | string): string => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth token for FCM, signed with the service account (cached for its lifetime). */
async function googleAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: now + Number(json.expires_in ?? 3600) };
  return cachedToken.value;
}

// ---------------------------------------------------------------- Supabase REST (service role)
async function supabase(path: string, init: RequestInit = {}): Promise<Response> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
}

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (req.headers.get("x-webhook-secret") !== env("PUSH_WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const n = payload?.record as NotificationRecord | undefined;
  if (payload?.type !== "INSERT" || payload?.table !== "customer_notifications" || !n?.id) {
    return Response.json({ skipped: "not a new customer notification" });
  }

  const tokensRes = await supabase(`push_tokens?select=token&user_id=eq.${encodeURIComponent(n.user_id)}`);
  const tokens: string[] = tokensRes.ok ? (await tokensRes.json()).map((t: { token: string }) => t.token) : [];
  if (tokens.length === 0) return Response.json({ sent: 0, reason: "no registered phone (inbox only)" });

  const account: ServiceAccount = JSON.parse(env("FCM_SERVICE_ACCOUNT"));
  const accessToken = await googleAccessToken(account);
  let sent = 0;
  const stale: string[] = [];

  for (const token of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(fcmMessage(token, n)),
    });
    if (res.ok) {
      sent++;
    } else {
      const error = await res.text();
      // The app was uninstalled or the token expired: forget it.
      if (res.status === 404 || error.includes("UNREGISTERED") || error.includes("INVALID_ARGUMENT")) stale.push(token);
      else console.error(`FCM send failed (${res.status}): ${error.slice(0, 300)}`);
    }
  }

  if (stale.length > 0) {
    await supabase(`push_tokens?token=in.(${stale.map((t) => `"${t}"`).join(",")})`, { method: "DELETE" });
  }
  if (sent > 0) {
    await supabase(`customer_notifications?id=eq.${n.id}`, {
      method: "PATCH",
      body: JSON.stringify({ pushed_at: new Date().toISOString() }),
    });
  }
  return Response.json({ sent, removedStaleTokens: stale.length });
});
