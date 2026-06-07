// C2 + D3 — Disparo agendado dos lembretes por tempo.
// Chama a função SQL run_time_based_reminders() (todas as empresas) com a service_role.
// Serve como agendador externo (ex.: cron-job.org / Supabase Scheduled) quando pg_cron
// não estiver disponível. Protegido por um segredo opcional REMINDERS_CRON_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Se um segredo estiver configurado, exige bater com o header x-cron-secret.
  const secret = Deno.env.get("REMINDERS_CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc("run_time_based_reminders", { p_company: null });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true, created: data ?? 0 });
});
