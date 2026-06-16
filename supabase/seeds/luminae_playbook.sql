-- Seed: Playbook Comercial Luminae + Scripts por etapa
-- Cole no SQL Editor do Supabase (projeto A7 CRM) e clique Run.
-- Insere na empresa demo "Clínica Bella Pelle (Demo)".
-- Seguro: usa ON CONFLICT para não duplicar.

DO $$
DECLARE
  v_company uuid;
  v_pb      uuid;
BEGIN
  SELECT id INTO v_company FROM public.companies
  WHERE name ILIKE '%bella pelle%' OR name ILIKE '%demo%' LIMIT 1;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Empresa demo não encontrada. Verifique se está no projeto A7 CRM.';
  END IF;

  -- ================================================================
  -- PLAYBOOK COMPLETO (modo documento, 7 seções)
  -- ================================================================
  INSERT INTO public.playbooks
    (company_id, title, description, view_mode, sections, flow_nodes)
  VALUES (
    v_company,
    'Playbook Comercial — Método SC30',
    'Manual de atendimento de alta conversão para clínica estética. Define filosofia, perfis de paciente (P1-P7), objeções e KPIs.',
    'document',
    '[
      {"id":"s1","title":"As 8 Regras do Atendimento","content":"1. Responde rápido — em menos de 5 minutos. Demora perde o lead.\n2. Pergunta a queixa primeiro — nunca vende antes de ouvir.\n3. Reconecta com o que ela disse — quando some, volta com algo útil pra ela.\n4. Chama pelo nome e lembra dela — nada de tratar como número.\n5. Conduz o agendamento — sempre 2 opções, nunca ''quando você pode?''.\n6. Cria urgência de verdade — nunca pressão falsa.\n7. Acolhe e se importa — estética é autoestima, o tom importa.\n8. Pensa no retorno dela — venda certa, não qualquer venda.\n\nA régua: a paciente sai sentindo que cuidaram dela, não que venderam algo a ela."},
      {"id":"s2","title":"O Funil (etapas)","content":"NOVO CONTATO → QUALIFICADA → AGENDADA → COMPARECEU → FECHOU → RECORRENTE\n\nNovo Contato: responde em <5 min + pergunta a queixa → ela sente: fui atendida rápido.\nQualificada: prova social da queixa + quebra objeção → ela entende o que vai acontecer.\nAgendada: confirma horário + cobra taxa → ela se compromete, não vai faltar.\nCompareceu: pós-avaliação imediato + D+2 → tem condição especial agora.\nFechou: garantir experiência + plantar recorrência → me cuidei bem aqui, vou voltar.\nLead Frio: reativar com queixa + urgência real → ainda lembram de mim com algo útil."},
      {"id":"s3","title":"Perfis de Paciente","content":"P1 — A RESOLVIDA: já decidiu, quer confirmar data. Agilidade acima de tudo.\nP2 — A PESQUISADORA: criteriosa, compara clínicas. Precisão técnica + diferencial.\nP3 — A COM MEDO: medo de dor/resultado artificial. Valida o medo ANTES de argumentar.\nP4 — A OLHO NO PREÇO: preço é filtro. P4A (orçamento real) → parcelamento. P4B (valor não construído) → diferencial primeiro.\nP5 — A INDICADA: veio por indicação. Reconhece a conexão imediatamente.\nP6 — A ENROLA: sem urgência real. Follow-up com âncora nova a cada 24/48/72h.\nP7 — FORA DE PERFIL: qualificar em 3 turnos e encerrar com elegância."},
      {"id":"s4","title":"Biblioteca de Objeções","content":"PREÇO\n''Tá caro'' → Não viu valor. Construa o valor antes de ceder.\n''Vi mais barato'' → ''Pode ser produto/protocolo diferente. Quer ver um resultado com nosso método?''\n''Tem desconto?'' → Nunca desconto direto. A taxa de reserva já vira desconto.\n''Não tenho agora'' → Parcela em até 10x no cartão.\n\nMEDO\n''Medo de dor'' → ''A anestesia tópica torna tudo muito mais tranquilo. Posso te mostrar depoimento?''\n''E se ficar artificial?'' → ''O foco é resultado natural. Deixa eu te mostrar casos da queixa dela.''\n\nTEMPO\n''Vou pensar'' → ''Ficou alguma dúvida ou é mais questão de momento?''\n''Tô muito ocupada'' → ''Temos horários no sábado de manhã.''"},
      {"id":"s5","title":"KPIs","content":"1ª resposta ao lead: meta <5 min (horário comercial)\nNovo contato → Agendada: meta 35%\nAgendada → Compareceu: meta 70%\nCompareceu → Fechou: meta 55%\nNo-show → Remarcou: meta 40%\nLead Frio reativado/mês: meta 15%\n\nAlertas:\n- Resposta >5min em >20% → problema de processo\n- Novo contato → Agendada <25% → problema no diagnóstico\n- Compareceu → Fechou <40% → problema no pós-avaliação\n- No-show >35% → taxa de reserva não está sendo cobrada"},
      {"id":"s6","title":"Regras: Sempre / Nunca","content":"SEMPRE FAZER\n✅ Responder em menos de 5 minutos no horário de atendimento\n✅ Perguntar a queixa antes de qualquer coisa\n✅ Usar o nome em pelo menos 2 momentos\n✅ Oferecer 2 opções de horário — nunca ''quando você pode?''\n✅ Recuperar no-show no mesmo dia\n\nNUNCA FAZER\n❌ Dar preço sem ter construído valor\n❌ Mandar tudo por mensagem para a Pesquisadora\n❌ Apressar a Com Medo\n❌ Follow-up sem âncora nova (''oi, viu minha mensagem?'')\n❌ Inventar urgência que não existe"},
      {"id":"s7","title":"Fluxos Automáticos no A7","content":"Boas-vindas → Novo lead → msg recepção + tarefa ''qualificar em 15 min''\nFollow-up frio 24h → Lead Quente sem resposta → msg com antes/depois\nFollow-up frio 48h → Sem resposta 24h → urgência suave\nFollow-up frio 72h → Âncora de fechamento de janela\nConfirmação D-1 → Agendada → endereço + nome da Dra.\nLembrete 3h antes → Lembrete curto + endereço\nRecuperação no-show → mesmo dia sem culpa\nPós-procedimento D+1 → ''Como você está se sentindo?''\nPedido de indicação D+7 → msg do programa\nRecall botox 6 meses → renovação\nAniversário — presente de limpeza de pele"}
    ]'::jsonb,
    '[]'::jsonb
  )
  RETURNING id INTO v_pb;

  RAISE NOTICE 'Playbook criado: %', v_pb;

  -- ================================================================
  -- SCRIPTS POR ETAPA (is_active = true)
  -- ON CONFLICT: atualiza se já existir script ativo para a etapa
  -- ================================================================

  -- ETAPA: lead_entrou — Primeira resposta + diagnóstico
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, '1ª Resposta — Diagnóstico', 'lead_entrou',
  $txt$Oi, {nome}! 🤍 Sou a Carolina, da clínica.

Que bom que você chamou! Que ótimo te ver por aqui!

Você já fez algum procedimento estético antes, ou seria sua primeira vez?

O que você gostaria de melhorar? Pode ser bem sincera comigo — é isso que me ajuda a te indicar o melhor caminho.

Entendi perfeitamente, {nome}. Posso te mostrar um resultado parecido com o que você quer — deixa eu te enviar um caso da mesma queixa.

Quer que eu já veja um horário pra você?$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  -- ETAPA: hot_lead — Conduzir agendamento
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, 'Agendamento — Condução', 'hot_lead',
  $txt$Tenho {dia1} ou {dia2} disponíveis com a Dra. Ana. Qual fica melhor pra você?

Perfeito! 👏 Vou reservar {dia/hora} pra você.

Pra garantir seu horário, a gente faz uma taxa de agendamento de R$100. Ela não é um custo a mais — entra como parte do pagamento do seu procedimento. 🤍

Posso te mandar o PIX?

Recebido! 👏 Obrigada, {nome}. Pra organizar seu atendimento, preciso de alguns dados:
Nome completo:
Data de nascimento:
CPF:$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  -- ETAPA: agendado — Confirmação D-1 e lembrete
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, 'Confirmação D-1 + Lembrete', 'agendado',
  $txt$Oi, {nome}! 🤍 Passando pra confirmar seu horário de amanhã, {dia}, às {hora}, com a Dra. Ana.

Endereço: Rua das Acácias, 412 — Moema. Referência: portaria amarela, em frente ao Ibirapuera.

Posso confirmar sua presença? Só me responder "confirmado" 👇

Maravilha! 👏 Tá tudo certo então. Te espero amanhã, {nome}!

Oi, {nome}! Passando pra lembrar do seu horário hoje às {hora}, com a Dra. Ana 🤍$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  -- ETAPA: compareceu — Pós-procedimento
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, 'Pós-procedimento D+1', 'compareceu',
  $txt$Oi, {nome}! 🤍 Como você está se sentindo depois do procedimento de ontem?

Qualquer dúvida sobre os cuidados pós-procedimento, pode me chamar à vontade!

Que incrível que ficou! Quando quiser renovar ou conhecer outros procedimentos, pode contar comigo. 🤍

Aliás, {nome} — a cada amiga que você indicar que fizer um procedimento com a gente, você ganha um crédito especial. Quer que eu te explique como funciona?$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  -- ETAPA: lead_frio — Reativação
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, 'Reativação — Lead Frio', 'lead_frio',
  $txt$Oi, {nome}! 💚 Vi que você se interessou por {procedimento}. Tenho uma condição especial só pra você retornar — posso te mandar os detalhes?

Nossos clientes estão adorando os resultados com {procedimento} 🌟 Quer agendar uma avaliação sem compromisso?

{nome}, temos uma novidade que você vai gostar! Posso te explicar em 2 minutinhos? 💬

Vou deixar seu atendimento em aberto aqui, {nome} 🤍 Quando quiser retomar, é só me chamar que a gente cuida de você.$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  -- ETAPA: perdido / no-show — Recuperação
  INSERT INTO public.scripts (company_id, name, stage, content, is_active)
  VALUES (v_company, 'Recuperação No-show', 'perdido',
  $txt$Oi, {nome}! Sentimos sua falta hoje 🤍 Sei que a rotina às vezes aperta, sem problema.

Tenho {dia1} ou {dia2} pra remarcar com a Dra. Ana. Qual fica melhor pra você?

{nome}, ainda estou com um horário reservado pra você 🤍 Me avisa se ainda faz sentido marcar — a Dra. vai adorar te receber.

Vou deixar seu atendimento em aberto aqui, {nome} 🤍 Quando quiser retomar, é só me chamar.$txt$,
  true)
  ON CONFLICT ON CONSTRAINT scripts_company_id_stage_is_active_key
  DO UPDATE SET name = EXCLUDED.name, content = EXCLUDED.content;

  RAISE NOTICE 'Scripts inseridos com sucesso para company_id=%', v_company;
END $$;
