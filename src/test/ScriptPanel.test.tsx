// Painel de script renderizado de verdade, com os contextos simulados.
// Cobre o que a atendente vê e clica: passos separados, trilha do procedimento,
// "Enviar" em 1 clique e a trava que impede enviar mensagem com {dia1}.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import React from "react";
import type { Script } from "@/context/PlaybooksContext";
import type { Lead } from "@/types/lead";
import type { Conversation } from "@/context/ConversationsContext";

const recordUsage = vi.fn();
let scripts: Script[] = [];

vi.mock("@/context/PlaybooksContext", () => ({
  usePlaybooks: () => ({ scripts, recordUsage }),
}));
vi.mock("@/context/ProceduresContext", () => ({ useProcedures: () => ({ procedures: [] }) }));
vi.mock("@/context/AppointmentsContext", () => ({ useAppointments: () => ({ appointments: [] }) }));
vi.mock("@/hooks/useCompanyMembers", () => ({ useCompanyMembers: () => [] }));

import ScriptPanel from "@/components/crm/ScriptPanel";
import { SCRIPT_INSERT_EVENT, SCRIPT_SEND_EVENT } from "@/hooks/useScriptPanel";

const step = (name: string, position: number, content: string, over: Partial<Script> = {}): Script => ({
  id: name, name, moment: "primeira_resposta", stage: "lead_entrou", triggers: [], content,
  isActive: true, position, trilha: null, createdAt: "", ...over,
});

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: "lead-1", name: "Cliente Teste", phone: "11999990000", origin: "manual", stage: "lead_entrou",
  service: "Botox", value: 0, lastMessage: "", lastInteraction: "", observations: "", createdAt: "", ...over,
});

const conversation = { id: "conv-1", leadId: "lead-1", assignedTo: null } as unknown as Conversation;

/** Captura o que o painel manda para a tela de Conversas. */
function listen() {
  const sent: string[] = [];
  const inserted: string[] = [];
  const onSend = (e: Event) => sent.push((e as CustomEvent<{ text: string }>).detail.text);
  const onInsert = (e: Event) => inserted.push((e as CustomEvent<{ text: string }>).detail.text);
  window.addEventListener(SCRIPT_SEND_EVENT, onSend);
  window.addEventListener(SCRIPT_INSERT_EVENT, onInsert);
  return {
    sent, inserted,
    stop: () => {
      window.removeEventListener(SCRIPT_SEND_EVENT, onSend);
      window.removeEventListener(SCRIPT_INSERT_EVENT, onInsert);
    },
  };
}

beforeEach(() => {
  recordUsage.mockClear();
  scripts = [
    step("Saudação — com nome", 10, "Oi, {nome}! 🤍"),
    // \r\n de propósito: é como o conteúdo chegou ao banco pelo SQL Editor do Windows.
    step("Saudação — sem nome", 20, "Oi! 🤍 Sou a Carolina, da Luminae.\r\n\r\nQual é seu nome?"),
    step("Botox — diagnóstico", 110, "O que você gostaria de suavizar no seu rosto?", { trilha: "Botox" }),
    step("Labial — diagnóstico", 210, "O que você gostaria de melhorar nos seus lábios?", { trilha: "Preenchimento labial" }),
    step("Duas opções de horário", 30, "Tenho {dia1} ou {dia2} disponíveis. Qual fica melhor?",
      { moment: "agendamento", stage: "hot_lead" }),
  ];
});
afterEach(cleanup);

describe("ScriptPanel", () => {
  it("mostra cada passo separado, e cada mensagem separada (mesmo com \\r\\n)", () => {
    render(<ScriptPanel lead={lead()} conversation={conversation} messages={[]} />);
    expect(screen.getByText("Saudação — com nome")).toBeInTheDocument();
    expect(screen.getByText("Saudação — sem nome")).toBeInTheDocument();
    // As duas mensagens do passo "sem nome" viram dois cartões, não um bloco só.
    expect(screen.getByText("Oi! 🤍 Sou a Carolina, da Luminae.")).toBeInTheDocument();
    expect(screen.getByText("Qual é seu nome?")).toBeInTheDocument();
  });

  it("mostra só a trilha do procedimento da paciente (Botox), não a dos outros", () => {
    render(<ScriptPanel lead={lead({ service: "Botox" })} conversation={conversation} messages={[]} />);
    expect(screen.getByText("Botox — diagnóstico")).toBeInTheDocument();
    expect(screen.queryByText("Labial — diagnóstico")).not.toBeInTheDocument();
  });

  it("'Enviar' manda a mensagem já com o nome da paciente, em 1 clique, e conta o uso", () => {
    const bus = listen();
    render(<ScriptPanel lead={lead()} conversation={conversation} messages={[]} />);
    const card = screen.getByText("Oi, Cliente Teste! 🤍").closest("li") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /Enviar/ }));
    expect(bus.sent).toEqual(["Oi, Cliente Teste! 🤍"]);
    expect(bus.inserted).toEqual([]);
    expect(recordUsage).toHaveBeenCalledWith("Saudação — com nome", "conv-1", "lead-1", "lead_entrou");
    bus.stop();
  });

  it("mensagem com {dia1} NÃO é enviada: vai para o campo para completar", () => {
    const bus = listen();
    render(<ScriptPanel lead={lead({ stage: "hot_lead" })} conversation={conversation} messages={[]} />);
    const card = screen.getByText(/disponíveis\. Qual fica melhor\?/).closest("li") as HTMLElement;
    expect(within(card).queryByRole("button", { name: /^Enviar$/ })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: /Preencher e enviar/ }));
    expect(bus.sent).toEqual([]);
    expect(bus.inserted).toEqual(["Tenho {dia1} ou {dia2} disponíveis. Qual fica melhor?"]);
    bus.stop();
  });

  it("'Editar' coloca no campo em vez de enviar", () => {
    const bus = listen();
    render(<ScriptPanel lead={lead()} conversation={conversation} messages={[]} />);
    const card = screen.getByText("Oi, Cliente Teste! 🤍").closest("li") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /Editar/ }));
    expect(bus.inserted).toEqual(["Oi, Cliente Teste! 🤍"]);
    expect(bus.sent).toEqual([]);
    bus.stop();
  });

  it("trocar o procedimento no seletor troca os passos da trilha", () => {
    render(<ScriptPanel lead={lead({ service: "Botox" })} conversation={conversation} messages={[]} />);
    fireEvent.change(screen.getByDisplayValue("Botox"), { target: { value: "Preenchimento labial" } });
    expect(screen.getByText("Labial — diagnóstico")).toBeInTheDocument();
    expect(screen.queryByText("Botox — diagnóstico")).not.toBeInTheDocument();
  });
});
