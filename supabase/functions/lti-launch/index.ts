
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const id_token = formData.get("id_token") as string;
  const state = formData.get("state") as string;

  if (!id_token || !state) {
    return new Response("Missing id_token or state", { status: 400 });
  }

  // Validate State (Basic check)
  try {
    const statePayload = JSON.parse(atob(state));
    // Check if state is expired (e.g. 5 mins)
    if (Date.now() - statePayload.created_at > 300000) {
      return new Response("State expired", { status: 400 });
    }
  } catch (e) {
    return new Response("Invalid state", { status: 400 });
  }

  // Configuration
  // MOODLE_JWKS_URL: The URL where Moodle publishes its public keys
  const moodleJwksUrl = Deno.env.get("MOODLE_JWKS_URL");
  const clientId = Deno.env.get("MOODLE_CLIENT_ID");
  const supabaseJwtSecret = Deno.env.get("JWT_SECRET"); // Used to sign our own tokens
  const frontendUrl = Deno.env.get("FRONTEND_URL"); // Where to redirect the user

  if (!moodleJwksUrl || !clientId || !supabaseJwtSecret || !frontendUrl) {
    return new Response("Server Misconfiguration", { status: 500 });
  }

  try {
    // Verify Moodle's Token
    const JWKS = createRemoteJWKSet(new URL(moodleJwksUrl));
    const { payload } = await jwtVerify(id_token, JWKS, {
      audience: clientId,
    });

    // Extract User Info
    const sub = payload.sub; // Moodle User ID
    // const email = payload.email; // Optional, might be in payload

    // Create a Supabase Session Token
    // We create a token that looks like a Supabase User Token
    // In a real app, you might want check/create a user in auth.users first via Admin API
    // checking if 'sub' already matches an existing user.
    // For now, we will mint a token with a custom claim 'lti_user_id'

    const token = await new SignJWT({
      aud: "authenticated", // Standard Supabase role
      role: "authenticated",
      sub: sub, // Use Moodle ID as Supabase ID (ensure it's UUID compatible or handle mapping)
      app_metadata: {
        provider: "moodle_lti",
        moodle_user_id: sub
      },
      user_metadata: {
        // ... any other info from payload
      }
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(supabaseJwtSecret));

    // Redirect to Frontend with Token
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.hash = `access_token=${token}&refresh_token=${token}&type=recovery`; // simplistic, better to use just verify in frontend

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error) {
    console.error("LTI Verification Failed:", error);
    return new Response("Unauthorized: " + error.message, { status: 401 });
  }
});
