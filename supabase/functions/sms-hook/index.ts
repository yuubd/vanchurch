import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();
    const phone: string | undefined = body?.user?.phone;
    const otp: string | undefined = body?.sms?.otp;

    if (phone && otp) {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      // Normalize to E.164 with leading +
      const normalized = phone.startsWith("+") ? phone : `+${phone}`;
      await fetch(`${url}/rest/v1/test_otps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key!,
          "Authorization": `Bearer ${key}`,
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({ phone: normalized, otp, created_at: new Date().toISOString() }),
      });
    }
  } catch (_) {
    // Non-JSON or unexpected payload — still return 200
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
