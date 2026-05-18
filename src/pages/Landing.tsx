import React from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, Workflow, Calendar, BarChart3, Zap, Users,
  ArrowRight, Check,
} from "lucide-react";
import Logo from "@/components/Logo";

const features = [
  { icon: Workflow, title: "Lifecycle Visual", desc: "Pipeline Kanban com etapas claras: do primeiro contato ao fechamento." },
  { icon: MessageSquare, title: "Conversas Omnichannel", desc: "WhatsApp, Instagram e mais — tudo em um inbox unificado." },
  { icon: Calendar, title: "Agenda & Follow-ups", desc: "Nunca perca um agendamento ou retorno importante." },
  { icon: Zap, title: "Automações", desc: "Disparos, fluxos de trabalho e follow-ups automáticos." },
  { icon: Users, title: "Multiempresa", desc: "Equipes, permissões e isolamento de dados por clínica." },
  { icon: BarChart3, title: "Relatórios", desc: "Conversão, atendimento e performance dos vendedores." },
];

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Logo withText size={32} />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#benefits" className="hover:text-foreground transition-colors">Benefícios</a>
            <a href="#cta" className="hover:text-foreground transition-colors">Começar</a>
          </nav>
          <Link
            to="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-40 right-10 w-[400px] h-[400px] rounded-full bg-crm-purple/15 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
            <Zap className="w-3.5 h-3.5" /> CRM operacional para clínicas
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            O CRM que organiza sua clínica
            <br />
            <span className="bg-gradient-to-r from-primary to-crm-purple bg-clip-text text-transparent">
              do primeiro contato ao retorno
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Conversas, lifecycle, agenda e automações em um único lugar.
            Feito para o ritmo de quem atende em saúde &amp; estética.
          </p>

          <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Acessar o sistema <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Ver recursos
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Tudo o que sua operação precisa</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Módulos integrados, sem ferramentas avulsas. Foco em produtividade real.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="max-w-5xl mx-auto px-6 py-20">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-crm-purple/5 p-10 sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Por que clínicas escolhem o CRM A7?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Resposta mais rápida aos leads",
              "Equipe alinhada em tempo real",
              "Mais agendamentos confirmados",
              "Visão clara de conversão",
              "Follow-ups que não escapam",
              "Multiempresa com isolamento total",
            ].map((b) => (
              <div key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Pronto para organizar sua operação?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Faça login e comece a usar agora mesmo.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 mt-8 text-sm font-semibold px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Entrar no CRM A7 <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo withText size={28} />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CRM A7. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
