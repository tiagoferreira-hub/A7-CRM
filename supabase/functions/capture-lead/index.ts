// F1 — Captação pública de lead por indicação (sem login).
// Recebe { ref, name, phone, channel? } e cria o lead na company do indicador,
// já marcado como origin='indicacao' e referred_by_lead_id = ref.
// Usa a service_role key (disponível no runtime) para contornar a RLS com segurança.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const ref = (payload.ref || "").toString().trim();
  const name = (payload.name || "").toString().trim();
  const phone = (payload.phone || "").toString().trim();
  const channel = (payload.channel || "whatsapp").toString().trim();
  if (!ref || !name || !phone) return json({ error: "missing_fields" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Localiza o indicador para descobrir a company.
  const { data: referrer, error: refErr } = await supabase
    .from("leads").select("id, company_id, name").eq("id", ref).maybeSingle();
  if (refErr) return json({ error: "lookup_failed" }, 500);
  if (!referrer) return json({ error: "invalid_ref" }, 404);

  // 2) Dedupe por telefone na mesma company.
  const target = onlyDigits(phone);
  const { data: existing } = await supabase
    .from("leads").select("id, phone").eq("company_id", referrer.company_id);
  if ((existing ?? []).some((l: any) => onlyDigits(l.phone) === target)) {
    return json({ ok: true, deduped: true });
  }

  // 3) Cria o lead indicado.
  const { error: insErr } = await supabase.from("leads").insert({
    company_id: referrer.company_id,
    name,
    phone,
    origin: "indicacao",
    channel,
    stage: "lead_entrou",
    referred_by_lead_id: referrer.id,
    last_message: `Indicado(a) por ${referrer.name ?? "cliente"} (link de indicação).`,
    last_interaction: new Date().toISOString(),
    observations: "",
  });
  if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

  return json({ ok: true });
});
