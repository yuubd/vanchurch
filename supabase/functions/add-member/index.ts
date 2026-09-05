import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function toE164Digits(raw: string): string {
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

    const { name, phone, cellId: requestedCellId, dateOfBirth } = await req.json();
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return new Response(JSON.stringify({ error: "Invalid date of birth" }), { status: 400, headers: cors });
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone" }), { status: 400, headers: cors });
    }
    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: "Missing name" }), { status: 400, headers: cors });
    }
    const phoneDigits = toE164Digits(phone);

    const churchId = callerProfile.church_id;
    let cellId: string | null;
    if (isAdminOrPastor) {
      // Admins/pastors add church-wide by default, or into a specific cell if one is
      // requested (e.g. adding from the Cells screen) — verify it belongs to their church.
      if (requestedCellId) {
        const { data: targetCell } = await callerClient.from("cells").select("id").eq("id", requestedCellId).eq("church_id", churchId).single();
        if (!targetCell) {
          return new Response(JSON.stringify({ error: "Invalid cell" }), { status: 400, headers: cors });
        }
        cellId = requestedCellId;
      } else {
        cellId = null;
      }
    } else {
      // Cell leaders can only add into their own cell.
      cellId = callerProfile.cell_id;
      if (!cellId) {
        return new Response(JSON.stringify({ error: "No cell assigned" }), { status: 400, headers: cors });
      }
    }

    const admin = createClient(url, serviceKey);

    // Don't create a real account here — that would let anyone enroll a phone number they
    // don't control. Instead, queue an invite the phone's actual owner must accept by
    // verifying their own number via normal OTP signup (see get_my_pending_invite /
    // accept_invite). If they already have an account elsewhere, block the invite.
    const { data: existing } = await admin.from("users").select("church_id").eq("phone", phoneDigits).maybeSingle();
    if (existing?.church_id) {
      return new Response(JSON.stringify({ error: "이미 다른 커뮤니티에 속해 있습니다" }), { status: 400, headers: cors });
    }

    const { error: inviteErr } = await admin.from("pending_invites").upsert({
      phone: phoneDigits,
      name: name.trim(),
      date_of_birth: dateOfBirth || null,
      church_id: churchId,
      cell_id: cellId,
      invited_by: caller.id,
    }, { onConflict: "phone,church_id" });
    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ invited: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
