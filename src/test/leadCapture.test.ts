import { describe, it, expect } from "vitest";
import { parseLeadCaptureParams, buildCaptureQuery } from "@/lib/leadCapture";

describe("parseLeadCaptureParams", () => {
  it("lê utm + channel de uma query string", () => {
    const r = parseLeadCaptureParams(
      "?utm_source=instagram&utm_medium=cpc&utm_campaign=verao&channel=instagram&ad_id=123",
    );
    expect(r.channel).toBe("instagram");
    expect(r.utmSource).toBe("instagram");
    expect(r.utmMedium).toBe("cpc");
    expect(r.utmCampaign).toBe("verao");
    expect(r.adId).toBe("123");
    // source cai no utm_source quando não há 'source' explícito
    expect(r.source).toBe("instagram");
  });

  it("ignora channel inválido", () => {
    expect(parseLeadCaptureParams("channel=orkut").channel).toBeUndefined();
  });

  it("aceita os canais novos do brief", () => {
    expect(parseLeadCaptureParams("channel=tiktok").channel).toBe("tiktok");
    expect(parseLeadCaptureParams("channel=messenger").channel).toBe("messenger");
    expect(parseLeadCaptureParams("channel=site").channel).toBe("site");
  });

  it("não inclui chaves vazias", () => {
    const r = parseLeadCaptureParams("utm_source=&channel=whatsapp");
    expect(r.channel).toBe("whatsapp");
    expect("utmSource" in r).toBe(false);
  });

  it("source explícito tem prioridade sobre utm_source", () => {
    const r = parseLeadCaptureParams("source=indicacao&utm_source=instagram");
    expect(r.source).toBe("indicacao");
  });
});

describe("buildCaptureQuery (round-trip)", () => {
  it("reconstrói a query a partir dos params", () => {
    const original = "channel=ads&utm_source=meta&utm_campaign=black";
    const parsed = parseLeadCaptureParams(original);
    const rebuilt = parseLeadCaptureParams(buildCaptureQuery(parsed));
    expect(rebuilt.channel).toBe("ads");
    expect(rebuilt.utmSource).toBe("meta");
    expect(rebuilt.utmCampaign).toBe("black");
  });
});
