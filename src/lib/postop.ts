// D1 — helpers puros do pós-operatório (espelham o gatilho SQL; testáveis e reusáveis
// caso a lógica seja movida para o cliente / Edge Function no futuro).

// Substitui {nome} e {procedimento} (e variações) num template de mensagem.
export function fillTemplate(text: string, vars: { nome?: string; procedimento?: string }): string {
  return (text || "")
    .replace(/\{nome\}/g, vars.nome ?? "")
    .replace(/\{procedimento\}/g, vars.procedimento ?? "");
}

// Data do toque pós-op: data do procedimento + N dias (preserva o horário).
export function postopDate(appointmentISO: string, offsetDays: number): string {
  const d = new Date(appointmentISO);
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString();
}
