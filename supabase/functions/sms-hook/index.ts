import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retired: this dev-era hook wrote unauthenticated request bodies into test_otps using
// the service-role key (verify_jwt was false). Twilio is the live OTP delivery path and
// test_otps no longer exists, so this was already dead, but it sat at a public URL
// accepting untrusted input on trust. Neutralized rather than left callable.
Deno.serve(async () => {
  return new Response(JSON.stringify({ error: "retired" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });
});
