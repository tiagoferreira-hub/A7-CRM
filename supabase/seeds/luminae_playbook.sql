-- Seed: Playbook Comercial Luminae + Scripts em PASSOS por momento do atendimento.
-- Fonte do conteúdo: SCRIPTS_PRIMEIRA_RESPOSTA_LUMINAE.md (documento oficial da clínica).
--
-- PRÉ-REQUISITO: migrations 20260929120000_script_moments.sql e
--                20260930120000_script_steps.sql aplicadas.
-- Como rodar: Supabase → SQL Editor → cole tudo → Run.
-- Seguro rodar de novo: atualiza por nome (empresa + nome do passo); nada é apagado.
--
-- Modelo (ver src/lib/scriptMoments.ts):
--   - Cada PASSO é um script: pertence a um MOMENTO e tem uma ORDEM (position).
--     Todos os ativos do momento aparecem no painel, na ordem.
--   - Passo com TRILHA (ex.: 'Botox') só aparece para paciente desse procedimento;
--     trilha vazia = passo geral. 'Genérico' = lead sem procedimento.
--   - Mensagens do passo separadas por linha em branco; cada uma tem botão Enviar.
--   - Objeções: momento 'objecao', valem em qualquer etapa, destacadas pelos `triggers`.
--   - {dia1}/{dia2}/{parcela} ficam destacados: o painel não envia sem preencher.
--
-- Passos por momento: primeira_resposta 42 · agendamento 8 · pre_comparecimento 6 · no_show 3 · pos_atendimento 1 · reativacao 1 · objecao 4

DO $$
DECLARE
  -- ⚙️ AJUSTE AQUI: nome (ou parte do nome) da empresa que recebe o conteúdo.
  v_company_name text := 'bella pelle';
  v_company      uuid;
  v_matches      int;
  v_pb           uuid;
  v_script_id    uuid;
  r              record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scripts' AND column_name = 'trilha'
  ) THEN
    RAISE EXCEPTION 'Rode antes a migration 20260930120000_script_steps.sql.';
  END IF;

  SELECT count(*) INTO v_matches FROM public.companies WHERE name ILIKE '%' || v_company_name || '%';
  IF v_matches = 0 THEN
    RAISE EXCEPTION 'Nenhuma empresa com "%" no nome. Ajuste v_company_name.', v_company_name;
  ELSIF v_matches > 1 THEN
    RAISE EXCEPTION '% empresas com "%" no nome. Deixe v_company_name mais específico.', v_matches, v_company_name;
  END IF;
  SELECT id INTO v_company FROM public.companies WHERE name ILIKE '%' || v_company_name || '%';

  -- ================================================================
  -- PLAYBOOK — cria se não existir; reescreve só a seção "O Funil" (s2).
  -- ================================================================
  SELECT id INTO v_pb FROM public.playbooks
  WHERE company_id = v_company AND title = 'Playbook Comercial — Método SC30'
  ORDER BY created_at LIMIT 1;

  IF v_pb IS NULL THEN
    INSERT INTO public.playbooks (company_id, title, description, view_mode, sections, flow_nodes)
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
  END IF;

  UPDATE public.playbooks
  SET sections = (
    SELECT jsonb_agg(
      CASE WHEN t.elem->>'id' = 's2'
        THEN jsonb_build_object(
          'id', 's2',
          'title', $t$O Funil (etapas do sistema) e os momentos do script$t$,
          'content', $c$O FUNIL mede ONDE a clínica perde paciente. São as etapas do sistema:
Novo Lead → Lead Quente → Agendado → Compareceu → Fechou
Perdas: Lead Frio e Perdido.

O SCRIPT segue o MOMENTO do atendimento, que o painel descobre sozinho:
• Novo Lead → Primeira resposta + diagnóstico
• Lead Quente → Agendamento (localização, dia, 2 opções, taxa, dados)
• Agendado → Pré-comparecimento (D-1, lembrete)
• Agendado + agendamento marcado "Não compareceu" → No-show
• Compareceu → Pós-atendimento
• Fechou → Pós-venda
• Lead Frio → Reativação

Cada momento tem vários PASSOS, em ordem. Na primeira resposta, os passos de diagnóstico variam por procedimento (trilha: Botox, Labial, Harmonização...). O painel mostra os passos gerais + os da trilha da paciente.

No-show NÃO é perda: o lead continua em Agendado e a falta fica registrada no agendamento (Agenda → status "Não compareceu"). Remarcar também é status do agendamento, não etapa.

Objeções ("vou pensar", "tá caro", "vou ver com meu marido", "medo") NÃO mudam a etapa. Têm script próprio, disponível em qualquer momento, e o painel destaca a objeção quando a paciente usa a frase.$c$)
        ELSE t.elem
      END
      ORDER BY t.ord)
    FROM jsonb_array_elements(sections) WITH ORDINALITY AS t(elem, ord)
  )
  WHERE id = v_pb;

  -- ================================================================
  -- PASSOS — upsert por nome. `replace(..., chr(13))`: o SQL Editor no Windows
  -- cola quebras de linha com \r\n; guardamos só \n.
  -- ================================================================
  FOR r IN SELECT * FROM (VALUES
    ('Saudação — com nome', 'primeira_resposta', 'lead_entrou', NULL::text, 10, '{}'::text[],
$txt$Oi, {nome}! 🤍$txt$),
    ('Saudação — sem nome', 'primeira_resposta', 'lead_entrou', NULL::text, 20, '{}'::text[],
$txt$Oi! 🤍 Sou a Carolina, da Luminae.

Qual é seu nome?

Prazer, {nome}!$txt$),
    ('Reconhece o interesse', 'primeira_resposta', 'lead_entrou', NULL::text, 30, '{}'::text[],
$txt$Que bom que você chamou! Sou a Carolina, da Luminae.

Que ótimo te ver por aqui!

Perfeito, você veio no lugar certo 🤍$txt$),
    ('Pergunta se já fez', 'primeira_resposta', 'lead_entrou', NULL::text, 40, '{}'::text[],
$txt$Você já fez {procedimento} antes, ou essa seria a primeira vez?

Você já fez algum procedimento facial antes, ou seria seu primeiro?$txt$),
    ('Resposta — se já fez / primeira vez', 'primeira_resposta', 'lead_entrou', NULL::text, 50, '{}'::text[],
$txt$Que ótimo, então você já conhece o procedimento!

Que bom que você decidiu começar — vou te explicar tudo.

Perfeito, vou te explicar como funciona aqui na Luminae.$txt$),
    ('Botox — reconhece', 'primeira_resposta', 'lead_entrou', 'Botox', 110, '{}'::text[],
$txt$O botox é um dos queridinhos aqui — você vai entender o porquê!

Você escolheu um dos nossos queridinhos.

O botox é campeão de pedidos aqui na clínica!$txt$),
    ('Botox — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Botox', 120, '{}'::text[],
$txt$O que você gostaria de suavizar no seu rosto?

Você quer prevenir as marquinhas ou já tem alguma linha no rosto que te incomoda?

Você quer o botox pra suavizar a testa, a região dos olhos, ou aquele vinco da sobrancelha?$txt$),
    ('Botox — queixa: testa / cara cansada', 'primeira_resposta', 'lead_entrou', 'Botox', 130, '{}'::text[],
$txt$O botox suaviza essa marca da testa e te dá um ar mais descansado, sem travar o rosto — continua sendo você, só que mais leve. ✨$txt$),
    ('Botox — queixa: vinco / cara de brava', 'primeira_resposta', 'lead_entrou', 'Botox', 140, '{}'::text[],
$txt$Esse vinco é o que mais passa a impressão de "cara fechada" — o botox relaxa exatamente esse músculo e deixa a expressão mais leve e natural. ✨$txt$),
    ('Botox — queixa: pezinhos de galinha', 'primeira_resposta', 'lead_entrou', 'Botox', 150, '{}'::text[],
$txt$Os pezinhos de galinha aparecem bastante no sorriso mesmo — o botox suaviza essas linhas sem tirar a naturalidade da sua expressão.$txt$),
    ('Botox — queixa: prevenção', 'primeira_resposta', 'lead_entrou', 'Botox', 160, '{}'::text[],
$txt$Que ótimo que você já pensa em prevenir, {nome}!

Começar cedo é o melhor caminho — o botox preventivo evita que as marcas se formem com o tempo, mantendo o rosto liso e descansado por mais tempo. ✨$txt$),
    ('Botox — explicação do procedimento', 'primeira_resposta', 'lead_entrou', 'Botox', 170, '{}'::text[],
$txt$O botox relaxa suavemente os músculos que causam as marcas de expressão — tipo a testa e o vinco da sobrancelha. É rápido, feito com uma agulha bem fininha, e você volta pra sua rotina no mesmo dia.

O resultado aparece em poucos dias e deixa o rosto mais descansado e leve, sem perder a naturalidade da sua expressão. ✨$txt$),
    ('Labial — reconhece', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 210, '{}'::text[],
$txt$O preenchimento labial é um dos queridinhos aqui — você vai amar o resultado natural. ✨

Você escolheu um dos nossos campeões de pedidos!$txt$),
    ('Labial — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 220, '{}'::text[],
$txt$O que você gostaria de melhorar nos seus lábios?

Você procura mais volume, ou é mais uma questão de definir melhor o contorno?

Você sente que o lábio é fino e quer dar um volume, ou quer trabalhar mais o formato/as bordas?$txt$),
    ('Labial — queixa: volume (lábio fino)', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 230, '{}'::text[],
$txt$Dá pra dar esse volume mantendo tudo natural e proporcional ao seu rosto — sem aquele exagero. O foco da Dra. Ana é exatamente isso.$txt$),
    ('Labial — queixa: medo de ficar artificial', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 240, '{}'::text[],
$txt$A Dra. Ana trabalha sempre na medida certa do seu rosto — o resultado fica harmônico, e não "preenchido demais". Volume bonito que valoriza, sem chamar atenção por estar exagerado.

Esse medo é super comum, e é exatamente por isso que a avaliação importa: a Dra. Ana define o volume junto com você, com calma, pra ficar do jeito que você se sente confortável.$txt$),
    ('Labial — queixa: contorno / definição', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 250, '{}'::text[],
$txt$O preenchimento de contorno define as bordas e dá um desenho mais bonito ao lábio, sem necessariamente aumentar o volume — fica mais delineado e natural. ✨$txt$),
    ('Labial — queixa: lábio some ao sorrir', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 260, '{}'::text[],
$txt$Isso é bem comum e tem solução — o preenchimento devolve a estrutura do lábio, então ele continua bonito e visível mesmo quando você sorri.$txt$),
    ('Labial — explicação do procedimento', 'primeira_resposta', 'lead_entrou', 'Preenchimento labial', 270, '{}'::text[],
$txt$O preenchimento labial usa ácido hialurônico — uma substância que o seu corpo já produz — pra dar volume ou definir o contorno dos lábios. É feito com anestésico, então é bem tranquilo, e o resultado já aparece na hora.

Dá pra deixar tudo natural e proporcional ao seu rosto, do jeitinho que você quer, sem exagero. ✨$txt$),
    ('Harmonização — reconhece', 'primeira_resposta', 'lead_entrou', 'Harmonização', 310, '{}'::text[],
$txt$A harmonização é um dos nossos carros-chefe — entregamos um resultado natural e sob medida pro seu rosto.

Você escolheu um dos procedimentos mais procurados pelos pacientes.$txt$),
    ('Harmonização — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Harmonização', 320, '{}'::text[],
$txt$O que você mais gostaria de melhorar no seu rosto? Pode ser sincera comigo.

Você tem algo específico que te incomoda, ou é mais uma vontade de equilibrar o rosto como um todo?

O que você mais gostaria de mudar — o contorno, o queixo, as maçãs do rosto?$txt$),
    ('Harmonização — explicação do procedimento', 'primeira_resposta', 'lead_entrou', 'Harmonização', 330, '{}'::text[],
$txt$A harmonização combina alguns procedimentos pra equilibrar os traços do seu rosto — contorno, queixo, maçãs — de forma personalizada. A Dra. Ana monta um plano sob medida pra valorizar o que você já tem de bonito.

O foco é sempre o resultado natural. ✨$txt$),
    ('Bioestimulador — reconhece', 'primeira_resposta', 'lead_entrou', 'Bioestimulador', 410, '{}'::text[],
$txt$O bioestimulador é perfeito pra rejuvenescer e devolver firmeza à pele. ✨

Ótima escolha, é um dos procedimentos que melhor estimula a qualidade da pele.$txt$),
    ('Bioestimulador — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Bioestimulador', 420, '{}'::text[],
$txt$O que mais te incomoda hoje — flacidez, perda de firmeza, ou aquele aspecto mais "caído"?

Você sente que a pele perdeu sustentação, ou é mais a textura/qualidade que te incomoda?

Tem alguma região específica que você quer firmar, ou é mais para o rosto, pescoço?$txt$),
    ('Bioestimulador — explicação do procedimento', 'primeira_resposta', 'lead_entrou', 'Bioestimulador', 430, '{}'::text[],
$txt$O bioestimulador estimula o seu corpo a produzir colágeno de novo — aquele que a gente vai perdendo com o tempo. Ele melhora a firmeza, a qualidade e o viço da pele de dentro pra fora.

Pele mais firme e bonita ao longo das semanas. ✨$txt$),
    ('Fios — reconhece', 'primeira_resposta', 'lead_entrou', 'Fios de sustentação', 510, '{}'::text[],
$txt$Os fios são uma ótima opção pra quem quer um efeito lifting sem cirurgia. ✨

Ótima escolha pra dar aquele "up" no contorno do rosto.$txt$),
    ('Fios — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Fios de sustentação', 520, '{}'::text[],
$txt$O que mais te incomoda hoje — é a flacidez, o contorno do rosto mais caído, ou a papada?

Você sente que o rosto "caiu" um pouco e quer levantar, ou é uma região específica?

É mais a parte do rosto (maçãs, mandíbula) ou o pescoço/papada que te incomoda?$txt$),
    ('Fios — explicação do procedimento', 'primeira_resposta', 'lead_entrou', 'Fios de sustentação', 530, '{}'::text[],
$txt$Os fios de sustentação dão um efeito lifting sem cirurgia — eles levantam e reposicionam a pele, melhorando o contorno do rosto e a flacidez. É feito com anestésico e a recuperação é rápida.

O resultado é um rosto mais firme e contornado, de forma natural e sem precisar de cirurgia. ✨$txt$),
    ('Corporal — reconhece (acolher, nunca julgar)', 'primeira_resposta', 'lead_entrou', 'Corporal', 610, '{}'::text[],
$txt$Que bom que você decidiu cuidar disso — vamos juntas. 🤍

Esse é um dos nossos focos aqui na clínica.$txt$),
    ('Corporal — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Corporal', 620, '{}'::text[],
$txt$Me conta: o que mais te incomoda hoje no seu corpo?

O que você mais gostaria de melhorar — é flacidez, aquele inchaço/retenção, ou gordurinha localizada?

É mais a barriga, o culote, ou a parte de trás das pernas que te incomoda?

Tem algum momento que você sente mais esse incômodo — tipo numa roupa específica?$txt$),
    ('Corporal — queixa: flacidez pós-parto', 'primeira_resposta', 'lead_entrou', 'Corporal', 630, '{}'::text[],
$txt$Essa flacidez pós-gestação é super comum e tem solução de verdade. A Dra. Ana costuma combinar a radiofrequência com outros recursos pra firmar a pele aos poucos.$txt$),
    ('Corporal — queixa: gordura localizada', 'primeira_resposta', 'lead_entrou', 'Corporal', 640, '{}'::text[],
$txt$Tem aquelas gordurinhas que realmente resistem à dieta e ao exercício — e é justamente nelas que os nossos procedimentos atuam, pra afinar essa região específica.$txt$),
    ('Corporal — queixa: retenção / inchaço', 'primeira_resposta', 'lead_entrou', 'Corporal', 650, '{}'::text[],
$txt$Essa sensação de inchaço incomoda bastante mesmo. A drenagem e a radiofrequência ajudam a reduzir a retenção e dão uma sensação de leveza no corpo.$txt$),
    ('Corporal — queixa: celulite', 'primeira_resposta', 'lead_entrou', 'Corporal', 660, '{}'::text[],
$txt$A celulite tem tratamento sim — a gente trabalha a textura e a firmeza da pele pra suavizar bastante esse aspecto, de forma gradual e natural.$txt$),
    ('Genérico — reconhece', 'primeira_resposta', 'lead_entrou', 'Genérico', 710, '{}'::text[],
$txt$Que bom ter você por aqui!

Que ótimo te ver por aqui — vou te ajudar a encontrar o caminho certo. 🤍

Seja bem-vinda à Luminae!$txt$),
    ('Genérico — diagnóstico', 'primeira_resposta', 'lead_entrou', 'Genérico', 720, '{}'::text[],
$txt$O que você gostaria de melhorar? Pode ser bem sincera comigo — é isso que me ajuda a te indicar o melhor caminho.

Me conta o que te trouxe até aqui: tem algo específico que você quer cuidar?

É algo mais no rosto, ou mais no corpo que você quer trabalhar?$txt$),
    ('Genérico — réplica: "rosto cansado"', 'primeira_resposta', 'lead_entrou', 'Genérico', 730, '{}'::text[],
$txt$Sei exatamente o que você quer dizer, {nome}.

Esse "rosto cansado" tem solução — às vezes é suavizar marcas, às vezes repor o que o tempo levou. A Dra. Ana avalia e te mostra as opções.$txt$),
    ('Genérico — réplica: "não me sinto bem" (corpo)', 'primeira_resposta', 'lead_entrou', 'Genérico', 740, '{}'::text[],
$txt$Entendo, {nome}, e que bom que você decidiu cuidar disso. 🤍

A gente consegue trabalhar isso com calma. Me conta o que mais te incomoda — é flacidez, retenção, ou gordurinha localizada?$txt$),
    ('Genérico — réplica: "só quero me cuidar"', 'primeira_resposta', 'lead_entrou', 'Genérico', 750, '{}'::text[],
$txt$Adorei, {nome} — e esse é o melhor primeiro passo. 🤍

Na avaliação a Dra. Ana olha seu rosto e seu corpo com calma e te mostra o que faz mais sentido pra você, sem nenhum compromisso.

Que tal eu já ver um horário pra você conversar com ela?$txt$),
    ('Réplica — validação', 'primeira_resposta', 'lead_entrou', NULL::text, 910, '{}'::text[],
$txt$Entendi perfeitamente, {nome}.

Entendi, {nome}.$txt$),
    ('Réplica — valor parcelado', 'primeira_resposta', 'lead_entrou', NULL::text, 920, '{}'::text[],
$txt$Aqui na Luminae o {procedimento} fica a partir de 10x R${parcela}. O valor exato a Dra. Ana confirma quando te ver, porque depende do que o seu caso pede — mas já fica dentro dessa condição.$txt$),
    ('Réplica — puxa o agendamento', 'primeira_resposta', 'lead_entrou', NULL::text, 930, '{}'::text[],
$txt$Quer que eu já veja um horário pra você?$txt$),
    ('1. Localização (antes de ela perguntar)', 'agendamento', 'hot_lead', NULL::text, 10, '{}'::text[],
$txt$A gente fica na Rua das Acácias, 412 — Moema, bem em frente ao Parque Ibirapuera. 🤍

Você tem fácil acesso a essa região?$txt$),
    ('2. Preferência de dia', 'agendamento', 'hot_lead', NULL::text, 20, '{}'::text[],
$txt$Pra eu já ver o melhor horário pra você: tem preferência por dia de semana ou prefere aos sábados?$txt$),
    ('3. Duas opções de horário', 'agendamento', 'hot_lead', NULL::text, 30, '{}'::text[],
$txt$Perfeito! Tenho {dia1} ou {dia2} disponíveis com a Dra. Ana. Qual fica melhor pra você?$txt$),
    ('4. Ela escolheu o horário', 'agendamento', 'hot_lead', NULL::text, 40, '{}'::text[],
$txt$Perfeito! 👏 Vou reservar {data} às {hora} pra você.$txt$),
    ('5. Taxa de agendamento (R$100)', 'agendamento', 'hot_lead', NULL::text, 50, '{}'::text[],
$txt$Pra garantir seu horário, a gente faz uma taxa de agendamento de R$100.

Ela não é um custo a mais — entra como parte do pagamento do seu procedimento. 🤍

Posso te mandar o PIX?$txt$),
    ('6. PIX', 'agendamento', 'hot_lead', NULL::text, 60, '{}'::text[],
$txt$Chave PIX: luminae@clinica.com (CNPJ)
Valor: R$100 · Favorecido: Luminae Estética LTDA

Assim que você me mandar o comprovante, já sigo com seu agendamento.$txt$),
    ('7. Dados (depois do comprovante)', 'agendamento', 'hot_lead', NULL::text, 70, '{}'::text[],
$txt$Recebido! 👏 Obrigada, {nome}.

Pra organizar seu atendimento, preciso de alguns dados:

Nome completo:
Data de nascimento:
CPF:$txt$),
    ('8. Agendamento confirmado', 'agendamento', 'hot_lead', NULL::text, 80, '{}'::text[],
$txt$Prontinho, {nome}! Seu agendamento está confirmado. 🤍

{data}, às {hora}, com a Dra. Ana.

Rua das Acácias, 412 — Moema. Referência: portaria amarela, em frente ao Ibirapuera.

Qualquer dúvida até lá, é só me chamar!$txt$),
    ('1. Confirmação D-1 (véspera)', 'pre_comparecimento', 'agendado', NULL::text, 10, '{}'::text[],
$txt$Oi, {nome}! 🤍 Passando pra confirmar seu horário de amanhã, {data}, às {hora}, com a Dra. Ana.

Endereço: Rua das Acácias, 412 — Moema. Referência: portaria amarela, em frente ao Ibirapuera.

Posso confirmar sua presença? Só me responder "confirmado" 👇$txt$),
    ('2. Ela confirmou', 'pre_comparecimento', 'agendado', NULL::text, 20, '{}'::text[],
$txt$Maravilha! 👏 Tá tudo certo então. Te espero amanhã, {nome}!$txt$),
    ('3. Ela pediu para remarcar', 'pre_comparecimento', 'agendado', NULL::text, 30, '{}'::text[],
$txt$Sem problema! Tenho {dia1} ou {dia2}. Qual fica melhor pra você?$txt$),
    ('4. Não confirmou até a noite', 'pre_comparecimento', 'agendado', NULL::text, 40, '{}'::text[],
$txt${nome}, ainda não consegui confirmar seu horário de amanhã 🤍 Está tudo certo pra você vir às {hora}?

Se precisar mudar, me avisa que a gente ajeita.$txt$),
    ('5. Lembrete no dia (3h antes)', 'pre_comparecimento', 'agendado', NULL::text, 50, '{}'::text[],
$txt$Oi, {nome}! Passando pra lembrar do seu horário hoje às {hora}, com a Dra. Ana 🤍

Rua das Acácias, 412 — Moema (portaria amarela). Qualquer imprevisto, é só me chamar!$txt$),
    ('6. Sem resposta ao lembrete (~2h antes)', 'pre_comparecimento', 'agendado', NULL::text, 60, '{}'::text[],
$txt${nome}, tudo bem? Seu horário com a Dra. Ana é hoje às {hora}. Consigo te confirmar? Estou segurando sua vaga 🤍$txt$),
    ('1. Mesmo dia (até 1h depois)', 'no_show', 'agendado', NULL::text, 10, '{}'::text[],
$txt$Oi, {nome}! Sentimos sua falta hoje 🤍 Sei que a rotina às vezes aperta, sem problema.

Tenho {dia1} ou {dia2} pra remarcar com a Dra. Ana. Qual fica melhor pra você?$txt$),
    ('2. Sem resposta em 24h', 'no_show', 'agendado', NULL::text, 20, '{}'::text[],
$txt${nome}, ainda estou com um horário reservado pra você 🤍 Me avisa se ainda faz sentido marcar — a Dra. Ana vai adorar te receber.$txt$),
    ('3. Sem resposta em 48h (encerra)', 'no_show', 'agendado', NULL::text, 30, '{}'::text[],
$txt$Vou deixar seu atendimento em aberto aqui, {nome} 🤍 Quando quiser retomar, é só me chamar que a gente cuida de você.$txt$),
    ('Pós-procedimento D+1', 'pos_atendimento', 'compareceu', NULL::text, 10, '{}'::text[],
$txt$Oi, {nome}! 🤍 Como você está se sentindo depois do procedimento de ontem?

Qualquer dúvida sobre os cuidados pós-procedimento, pode me chamar à vontade!

Que incrível que ficou! Quando quiser renovar ou conhecer outros procedimentos, pode contar comigo. 🤍

Aliás, {nome} — a cada amiga que você indicar que fizer um procedimento com a gente, você ganha um crédito especial. Quer que eu te explique como funciona?$txt$),
    ('Reativação — Lead Frio', 'reativacao', 'lead_frio', NULL::text, 10, '{}'::text[],
$txt$Oi, {nome}! 💚 Vi que você se interessou por {procedimento}. Tenho uma condição especial só pra você retornar — posso te mandar os detalhes?

Nossos clientes estão adorando os resultados com {procedimento} 🌟 Quer agendar uma avaliação sem compromisso?

{nome}, temos uma novidade que você vai gostar! Posso te explicar em 2 minutinhos? 💬

Vou deixar seu atendimento em aberto aqui, {nome} 🤍 Quando quiser retomar, é só me chamar que a gente cuida de você.$txt$),
    ('Objeção — "Vou pensar"', 'objecao', NULL::text, NULL::text, 10, ARRAY['vou pensar', 'vou ver', 'depois eu vejo', 'depois te falo', 'agora nao', 'vou analisar']::text[],
$txt$Claro, fica à vontade! Só me conta: ficou alguma dúvida sobre o procedimento, ou é mais uma questão de momento? Te ajudo nos dois.$txt$),
    ('Objeção — "Tá caro"', 'objecao', NULL::text, NULL::text, 20, ARRAY['ta caro', 'esta caro', 'muito caro', 'achei caro', 'caro demais', 'meio caro', 'sem dinheiro', 'nao tenho dinheiro', 'fora do orcamento']::text[],
$txt$Entendo! E é por isso que a gente parcela em até 10x, justamente pra caber tranquilo no seu mês.

Quer que eu já veja um horário pra você garantir esse valor?$txt$),
    ('Objeção — "Vou ver com meu marido / minha agenda"', 'objecao', NULL::text, NULL::text, 30, ARRAY['meu marido', 'meu esposo', 'meu namorado', 'minha agenda', 'ver minha agenda', 'ver com ele']::text[],
$txt$Sem problema! Posso deixar um horário pré-reservado pra você por 24h, sem compromisso. Aí você confirma com calma. Pode ser?$txt$),
    ('Objeção — "Medo de doer / do resultado"', 'objecao', NULL::text, NULL::text, 40, ARRAY['medo', 'vai doer', 'doer', 'doi', 'artificial', 'exagerado', 'receio']::text[],
$txt$Super normal esse receio, a maioria das pacientes chega assim. 🤍 A Dra. Ana te explica tudo no dia e você se sente muito mais segura. Quer que eu já veja um horário?$txt$)
  ) AS v(name, moment, stage, trilha, position, triggers, content)
  LOOP
    SELECT id INTO v_script_id FROM public.scripts
    WHERE company_id = v_company AND name = r.name
    ORDER BY updated_at DESC LIMIT 1;

    IF v_script_id IS NULL THEN
      INSERT INTO public.scripts (company_id, name, moment, stage, trilha, position, triggers, content, is_active)
      VALUES (v_company, r.name, r.moment, r.stage, r.trilha, r.position, r.triggers,
              replace(r.content, chr(13), ''), true);
    ELSE
      UPDATE public.scripts
      SET moment = r.moment, stage = r.stage, trilha = r.trilha, position = r.position,
          triggers = r.triggers, content = replace(r.content, chr(13), ''), is_active = true
      WHERE id = v_script_id;
    END IF;
  END LOOP;

  -- Scripts antigos de "tudo num bloco só": saem do painel (inativos, não apagados).
  UPDATE public.scripts SET is_active = false
  WHERE company_id = v_company
    AND name IN ('1ª Resposta — Diagnóstico', 'Agendamento — Condução', 'Confirmação D-1 + Lembrete', 'Recuperação No-show');

  -- Limpa \r de qualquer outro script da empresa (colados antes desta correção).
  UPDATE public.scripts SET content = replace(content, chr(13), '')
  WHERE company_id = v_company AND strpos(content, chr(13)) > 0;

  -- ================================================================
  -- PALAVRA-CHAVE — a única frase do documento que é mudança real de etapa.
  -- ================================================================
  INSERT INTO public.keyword_rules (company_id, keyword, match_type, target_stage, priority, active)
  VALUES (v_company, 'seu agendamento está confirmado', 'contains', 'agendado', 5, true)
  ON CONFLICT (company_id, keyword, match_type) DO NOTHING;

  RAISE NOTICE 'Playbook % e % passos gravados para a empresa %.', v_pb, 65, v_company;
END $$;
