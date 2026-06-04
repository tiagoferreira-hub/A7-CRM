// FASE 1.2 — Parser (puro, testável) dos parâmetros de captação de lead.
// Lê uma query string (?utm_source=...&channel=...) e devolve os campos de origem
// que serão gravados no lead. Não depende de React/Supabase.
import { LeadChannel, CHANNEL_OPTIONS } from "@/types/lead";

export interface LeadCaptureParams {
  channel?: LeadChannel;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  adId?: string;
  referrer?: string;
}

const clean = (v: string | null): string | undefined => {
  const t = (v ?? "").trim();
  return t === "" ? undefined : t;
};

// Aceita "?a=1&b=2", "a=1&b=2" ou um objeto/URLSearchParams.
function toParams(input: string | URLSearchParams | Record<string, string>): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input.replace(/^\?/, ""));
  return new URLSearchParams(input);
}

export function parseLeadCaptureParams(
  input: string | URLSearchParams | Record<string, string>,
): LeadCaptureParams {
  const p = toParams(input);
  const rawChannel = clean(p.get("channel"))?.toLowerCase();
  const channel = (CHANNEL_OPTIONS as string[]).includes(rawChannel ?? "")
    ? (rawChannel as LeadChannel)
    : undefined;

  const result: LeadCaptureParams = {
    channel,
    // 'source' explícito ou cai no utm_source como atalho.
    source: clean(p.get("source")) ?? clean(p.get("utm_source")),
    utmSource: clean(p.get("utm_source")),
    utmMedium: clean(p.get("utm_medium")),
    utmCampaign: clean(p.get("utm_campaign")),
    utmContent: clean(p.get("utm_content")),
    utmTerm: clean(p.get("utm_term")),
    adId: clean(p.get("ad_id")) ?? clean(p.get("adid")),
    referrer: clean(p.get("referrer")),
  };

  // Remove chaves indefinidas para um objeto enxuto.
  (Object.keys(result) as (keyof LeadCaptureParams)[]).forEach((k) => {
    if (result[k] === undefined) delete result[k];
  });
  return result;
}

// Mantém os params de captação ao propagar um link (ex.: convite → captação).
export function buildCaptureQuery(params: LeadCaptureParams): string {
  const map: Record<string, string | undefined> = {
    channel: params.channel,
    source: params.source,
    utm_source: params.utmSource,
    utm_medium: params.utmMedium,
    utm_campaign: params.utmCampaign,
    utm_content: params.utmContent,
    utm_term: params.utmTerm,
    ad_id: params.adId,
    referrer: params.referrer,
  };
  const sp = new URLSearchParams();
  Object.entries(map).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  return sp.toString();
}
