
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const iss = url.searchParams.get("iss");
  const login_hint = url.searchParams.get("login_hint");
  const target_link_uri = url.searchParams.get("target_link_uri");
  const lti_message_hint = url.searchParams.get("lti_message_hint");

  if (!iss || !login_hint || !target_link_uri) {
    return new Response("Missing required parameters", { status: 400 });
  }

  // Configuration from Environment Variables
  const platformAuthUrl = Deno.env.get("MOODLE_OIDC_AUTH_URL"); // e.g. https://moodle.example.com/mod/lti/auth.php
  const clientId = Deno.env.get("MOODLE_CLIENT_ID");
  // The Redirect URI should point to our lti-launch function
  // e.g. https://<project_ref>.supabase.co/functions/v1/lti-launch
  const redirectUri = Deno.env.get("LTI_REDIRECT_URI");

  if (!platformAuthUrl || !clientId || !redirectUri) {
    return new Response("Server Misconfiguration", { status: 500 });
  }

  // Generate State and Nonce
  // In a production app, State should be signed or stored to prevent CSRF.
  // We will sign it purely for validation in lti-launch without DB storage.
  const statePayload = {
    nonce: crypto.randomUUID(),
    created_at: Date.now()
  };
  // Ideally, sign this with a secret. For now, simple base64, 
  // BUT TODO: Add signature verification in production.
  const state = btoa(JSON.stringify(statePayload));
  const nonce = crypto.randomUUID();

  const authUrl = new URL(platformAuthUrl);
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("login_hint", login_hint);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("lti_message_hint", lti_message_hint || "");
  authUrl.searchParams.set("response_mode", "form_post"); // LTI 1.3 uses form_post

  return Response.redirect(authUrl.toString(), 302);
});
