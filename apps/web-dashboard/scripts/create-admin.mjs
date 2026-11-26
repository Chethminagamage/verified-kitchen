#!/usr/bin/env node
/**
 * Creates the FIRST platform administrator (later admins are invited from
 * the admin site). Run it yourself, once:
 *
 *   cd apps/web-dashboard && npm run create-admin
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
 * The password is typed here (hidden) and sent only to Supabase Auth; it is
 * never stored or printed.
 */
import { createInterface } from "node:readline";
import { stdin, stdout, exit } from "node:process";

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Variables may come from the environment instead.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret || secret.startsWith("sb_publishable_")) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (sb_secret_...) in apps/web-dashboard/.env.local first.");
  exit(1);
}

function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

/** Reads a line without echoing it. */
function askHidden(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        stdout.write("\n");
        exit(130);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

if (!stdin.isTTY) {
  console.error("Run this in a terminal (it asks for a password).");
  exit(1);
}

console.log("Create the first Verified Kitchen administrator\n");
const email = (await ask("Email: ")).toLowerCase();
const fullName = await ask("Full name: ");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || fullName.length < 2) {
  console.error("Enter a valid email address and a full name.");
  exit(1);
}
const password = await askHidden("Password (at least 10 characters, hidden): ");
const repeat = await askHidden("Repeat the password: ");
if (password.length < 10 || /^(.)\1*$/.test(password) || Buffer.byteLength(password) > 72) {
  console.error("Use a password of at least 10 characters (at most 72 bytes) that is not one repeated character.");
  exit(1);
}
if (password !== repeat) {
  console.error("The passwords do not match.");
  exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (createError || !created.user) {
  if (createError?.code === "email_exists" || createError?.status === 422) {
    console.error("An account with this email already exists. Use a separate address for the administrator account.");
  } else {
    console.error("Supabase refused to create the login:", createError?.message);
  }
  exit(1);
}
const userId = created.user.id;

// Promote it (the service key bypasses the role guard), and record it in the admin activity log.
const { error: roleError } = await supabase.from("profiles").update({ role: "admin", full_name: fullName }).eq("id", userId);
if (roleError) {
  await supabase.auth.admin.deleteUser(userId); // leave no half-made account behind
  console.error("Could not make the account an administrator:", roleError.message);
  console.error("Has migration 20261119000000_platform_admin.sql been run in Supabase?");
  exit(1);
}
const { error: logError } = await supabase.from("admin_audit_log").insert({
  actor_email: "create-admin script",
  action: "account.bootstrap_admin",
  target_type: "account",
  target_id: userId,
  target_label: email,
});
if (logError) console.warn("Note: could not write the activity log entry:", logError.message);

console.log(`\nDone. ${fullName} <${email}> is an administrator.`);
console.log("Sign in at http://localhost:3000/admin/login (or your site's /admin/login).");
