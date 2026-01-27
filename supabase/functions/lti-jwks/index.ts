
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function serves the Public JWKS (JSON Web Key Set) for the LTI Tool.
// Moodle uses this to verify messages signed by this Tool (e.g. for Deep Linking or Grades).
// The public key should be stored in a Supabase Secret named LTI_PUBLIC_JWK.

serve(async (req) => {
  try {
    const jwkString = Deno.env.get("LTI_PUBLIC_JWK");

    if (!jwkString) {
      console.error("Missing LTI_PUBLIC_JWK environment variable");
      return new Response("Internal Server Error", { status: 500 });
    }

    const jwk = JSON.parse(jwkString);

    // Ensure it's wrapped in a 'keys' array as required by JWKS spec
    const jwks = {
      keys: [jwk],
    };

    return new Response(JSON.stringify(jwks), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error serving JWKS:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
