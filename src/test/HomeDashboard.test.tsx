// Dashboard renderizado e clicado, com os contextos simulados.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import React from "react";
import type { Lead, LeadStage } from "@/types/lead";
import type { ConvLike } from "@/lib/homeDashboard";

afterEach(cleanup);

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const lead = (id: string, name: string, stage: LeadStage, assignedTo: string | null = null): Lead => ({
  id, name, phone: "", origin: "manual", stage, service: "", value: 0, lastMessage: "",
  lastInteraction: "", observations: "", createdAt: "", assignedTo,
});
const conv = (id: string, leadId: string, over: Partial<ConvLike> = {}) => ({
  id, leadId, channel: "whatsapp", externalId: null, assignedTo: null, lastMessage: "Oi, quero saber do botox",
  lastMessageAt: ago(10), unreadCount: 0, awaitingReply: false, isUnread: false, status: "open", createdAt: "", ...over,
});

let leads: Lead[] = [];
let conversations: ReturnType<typeof conv>[] = [];

vi.mock("@/context/LeadsContext", () => ({ useLeads: () => ({ leads }) }));
vi.mock("@/context/ConversationsContext", () => ({ useConversations: () => ({ conversations }) }));
vi.mock("@/context/FollowUpsContext", () => ({ useFollowUps: () => ({ followUps: [] }) }));
vi.mock("@/hooks/useCompanyMembers", () => ({
  useCompanyMembers: () => [{ userId: "u1", displayName: "Carolina" }, { userId: "u2", displayName: "Beatriz" }],
}));
vi.mock("@/components/crm/NewLeadModal", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>modal novo lead</div> : null),
}));

import HomeDashboard from "@/components/crm/HomeDashboard";

beforeEach(() => {
  leads = [
    lead("1", "Ana Espera Muito", "lead_entrou"),
    lead("2", "Bia Espera Pouco", "hot_lead", "u1"),
    lead("3", "Cris Respondida", "hot_lead", "u2"),
  ];
  conversations = [
    conv("c1", "1", { lastMessageAt: ago(26 * 60) }),                       // clínica deve há 26h
    conv("c2", "2", { lastMessageAt: ago(15), assignedTo: "u1" }),          // clínica deve há 15m
    conv("c3", "3", { awaitingReply: true, assignedTo: "u2" }),             // clínica espera a paciente
  ];
});

describe("HomeDashboard", () => {
  it("mostra um cartão por etapa do funil, com o total", () => {
    render(<HomeDashboard />);
    const card = screen.getByRole("button", { name: /Lead Quente/ });
    expect(within(card).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Perdido/ })).toBeInTheDocument();
  });

  it("abre em 'Sem resposta': só quem a clínica deve, quem espera há mais tempo primeiro", () => {
    render(<HomeDashboard />);
    expect(screen.getByRole("tab", { name: /Sem resposta/ })).toHaveAttribute("aria-selected", "true");
    const names = screen.getAllByText(/Espera|Respondida/).map(n => n.textContent);
    expect(names).toEqual(["Ana Espera Muito", "Bia Espera Pouco"]);
    expect(screen.getByText(/1d 2h/)).toBeInTheDocument();
  });

  it("clicar no contato abre a conversa dele", () => {
    const opened: string[] = [];
    const h = (e: Event) => opened.push((e as CustomEvent<{ leadId: string }>).detail.leadId);
    window.addEventListener("crm:openConversationByLead", h);
    render(<HomeDashboard />);
    fireEvent.click(screen.getByText("Bia Espera Pouco"));
    expect(opened).toEqual(["2"]);
    window.removeEventListener("crm:openConversationByLead", h);
  });

  it("clicar no cartão da etapa filtra a lista; clicar de novo limpa", () => {
    render(<HomeDashboard />);
    const quente = screen.getByRole("button", { name: /Lead Quente/ });
    fireEvent.click(quente);
    expect(screen.queryByText("Ana Espera Muito")).not.toBeInTheDocument();
    expect(screen.getByText("Bia Espera Pouco")).toBeInTheDocument();
    fireEvent.click(quente);
    expect(screen.getByText("Ana Espera Muito")).toBeInTheDocument();
  });

  it("aba 'Abertas' inclui quem está esperando a paciente", () => {
    render(<HomeDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: /Abertas/ }));
    expect(screen.getByText("Cris Respondida")).toBeInTheDocument();
  });

  it("equipe: quem tem paciente esperando aparece com o alerta", () => {
    render(<HomeDashboard />);
    expect(screen.getByText("1 sem resposta")).toBeInTheDocument();
    expect(screen.getByText("em dia")).toBeInTheDocument();
  });

  it("'Quadro' leva ao Kanban e 'Novo Lead' abre o cadastro", () => {
    const onShowBoard = vi.fn();
    render(<HomeDashboard onShowBoard={onShowBoard} />);
    fireEvent.click(screen.getByRole("button", { name: /Quadro/ }));
    expect(onShowBoard).toHaveBeenCalledTimes(1);
    // Nome exato: o cartão da etapa "🆕 Novo Lead" também contém "Novo Lead".
    fireEvent.click(screen.getByRole("button", { name: "Novo Lead" }));
    expect(screen.getByText("modal novo lead")).toBeInTheDocument();
  });
});
