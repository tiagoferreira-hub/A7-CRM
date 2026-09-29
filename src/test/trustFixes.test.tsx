// "Bugs de confiança" da interface, testados renderizando e interagindo.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import React from "react";
import type { Lead, LeadStage } from "@/types/lead";

afterEach(cleanup);

// ── Dependências simuladas ───────────────────────────────────────────────────
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    signOut: vi.fn(), displayName: "Tiago", user: { email: "t@x.com" }, role: "owner",
    viewAsCompany: null, setViewAsCompany: vi.fn(),
  }),
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));

const lead = (id: string, name: string, stage: LeadStage): Lead => ({
  id, name, phone: "11999990000", origin: "manual", stage, service: "", value: 0,
  lastMessage: "", lastInteraction: "", observations: "", createdAt: "",
});
let kanbanLeads: Lead[] = [];
vi.mock("@/context/LeadsContext", () => ({ useLeads: () => ({ leads: kanbanLeads, moveLead: vi.fn() }) }));
vi.mock("@/context/TagsContext", () => ({ useTags: () => ({ tags: [], assignments: [] }) }));
vi.mock("@/context/FollowUpsContext", () => ({ useFollowUps: () => ({ followUps: [] }) }));
vi.mock("@/hooks/useCompanyMembers", () => ({ useCompanyMembers: () => [] }));
// Filhos pesados do Kanban viram stubs: o teste é sobre quais colunas existem.
vi.mock("@/components/crm/LeadCard", () => ({
  default: ({ lead: l }: { lead: Lead }) => <div data-testid="card">{l.name}</div>,
}));
vi.mock("@/components/crm/LeadDetailModal", () => ({ default: () => null }));
vi.mock("@/components/crm/NewLeadModal", () => ({ default: () => null }));
vi.mock("@/components/crm/LossReasonModal", () => ({ default: () => null }));

vi.mock("@/components/crm/Dashboard", () => ({ default: () => <div>dashboard</div> }));
vi.mock("@/components/crm/ConversationsReport", () => ({ default: () => <div>conversas</div> }));
vi.mock("@/components/crm/ConversionReport", () => ({ default: () => <div>conversao</div> }));
vi.mock("@/components/crm/MetasReport", () => ({ default: () => <div>metas</div> }));

import AppSidebar from "@/components/AppSidebar";
import KanbanBoard from "@/components/crm/KanbanBoard";
import Reports from "@/pages/Reports";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { STAGE_ALL, STAGE_LABELS } from "@/types/lead";

/**
 * O React monta onPointerEnter/Leave a partir de pointerover/pointerout e lê
 * `pointerType` do evento nativo. O jsdom 20 não tem PointerEvent, então o
 * evento é montado à mão com o campo que importa.
 */
function pointer(el: Element, type: "pointerover" | "pointerout", pointerType: string, related: Element | null = null) {
  const ev = new MouseEvent(type, { bubbles: true, relatedTarget: related });
  Object.defineProperty(ev, "pointerType", { value: pointerType });
  // act(): pointerover é evento "contínuo"; sem act o React 18 aplica o estado depois.
  act(() => { el.dispatchEvent(ev); });
}

describe("Sidebar", () => {
  const setup = () => {
    const setTab = vi.fn();
    const { container } = render(<AppSidebar tab="lifecycle" setTab={setTab} />);
    const aside = container.querySelector("aside") as HTMLElement;
    return { setTab, aside, shell: aside.parentElement as HTMLElement };
  };

  it("toque: o 1º toque NAVEGA (não fica só expandindo)", () => {
    const { setTab, aside } = setup();
    const contatos = screen.getByTitle("Contatos");
    pointer(contatos, "pointerover", "touch");
    expect(aside.dataset.expanded).toBe("false");
    fireEvent.click(contatos);
    expect(setTab).toHaveBeenCalledTimes(1);
    expect(setTab).toHaveBeenCalledWith("contacts");
  });

  it("mouse: passa por cima e expande; sai e recolhe", () => {
    const { aside } = setup();
    pointer(screen.getByTitle("Agenda"), "pointerover", "mouse");
    expect(aside.dataset.expanded).toBe("true");
    pointer(aside, "pointerout", "mouse", document.body);
    expect(aside.dataset.expanded).toBe("false");
  });

  it("expandir não empurra a página: a casca fica fixa em 60px e a barra abre por cima", () => {
    const { aside, shell } = setup();
    pointer(screen.getByTitle("Agenda"), "pointerover", "mouse");
    expect(shell.className).toContain("w-[60px]");
    expect(shell.className).not.toContain("220px");
    expect(aside.className).toContain("absolute");
    expect(aside.className).toContain("w-[220px]");
  });
});

describe("Kanban", () => {
  it("tem as 7 etapas do funil, incluindo Perdido", () => {
    kanbanLeads = [];
    render(<KanbanBoard />);
    for (const s of STAGE_ALL) expect(screen.getAllByText(STAGE_LABELS[s]).length).toBeGreaterThan(0);
    expect(STAGE_ALL).toHaveLength(7);
  });

  it("lead perdido aparece no Kanban (antes sumia)", () => {
    kanbanLeads = [lead("1", "Ana Ativa", "hot_lead"), lead("2", "Paula Perdida", "perdido")];
    render(<KanbanBoard />);
    const cards = screen.getAllByTestId("card").map(c => c.textContent);
    expect(cards).toContain("Paula Perdida");
    expect(cards).toContain("Ana Ativa");
  });
});

describe("Relatórios", () => {
  it("só mostra abas que existem — sem 'Em breve'", () => {
    render(<Reports />);
    expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Respostas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Atendimento/ })).not.toBeInTheDocument();
    for (const tab of ["Lifecycle", "Conversas", "Usuários", "Conversão"]) {
      expect(screen.getByRole("button", { name: new RegExp(tab) })).toBeInTheDocument();
    }
  });

  it("cada aba abre o seu relatório", () => {
    render(<Reports />);
    fireEvent.click(screen.getByRole("button", { name: /Usuários/ }));
    expect(screen.getByText("metas")).toBeInTheDocument();
  });
});

describe("Modais", () => {
  it("nunca passam da altura da tela: altura máxima + rolagem interna", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Novo Lead</DialogTitle>
          <p>conteúdo</p>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[calc(100vh-2rem)]");
    expect(dialog.className).toContain("overflow-y-auto");
    expect(within(dialog).getByText("Novo Lead")).toBeInTheDocument();
  });
});
