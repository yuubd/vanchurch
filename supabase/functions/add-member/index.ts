import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return digits;
  return "1" + digits;
}

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the caller's own JWT — RLS still applies here.
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    const { data: callerProfile } = await callerClient
      .from("users")
      .select("roles, church_id, cell_id")
      .eq("id", caller.id)
      .single();

    const roles: string[] = callerProfile?.roles ?? [];
    const isAdminOrPastor = roles.includes("admin") || roles.includes("pastor");
    const isCellLeader = roles.includes("cell_leader");
    if (!callerProfile?.church_id || (!isAdminOrPastor && !isCellLeader)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors });
    }

    const { name, phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone" }), { status: 400, headers: cors });
    }
    const e164 = "+" + toE164(phone);

    // Cell leaders can only add into their own cell; admins/pastors add church-wide (no cell).
    const churchId = callerProfile.church_id;
    const cellId = isAdminOrPastor ? null : callerProfile.cell_id;
    if (!isAdminOrPastor && !cellId) {
      return new Response(JSON.stringify({ error: "No cell assigned" }), { status: 400, headers: cors });
    }

    const admin = createClient(url, serviceKey);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone: e164,
      phone_confirm: true,
    });
    if (createErr || !created.user) {
      const msg = createErr?.message?.includes("already been registered")
        ? "이미 등록된 번호입니다"
        : createErr?.message ?? "Failed to create member";
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: cors });
    }

    // handle_new_user() trigger already inserted a default public.users row for created.user.id.
    const { error: updateErr } = await admin
      .from("users")
      .update({ name: name?.trim() ?? "", church_id: churchId, cell_id: cellId, roles: ["member"] })
      .eq("id", created.user.id);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
