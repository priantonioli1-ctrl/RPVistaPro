// Diagnóstico Avançado: Gestão 360º — Perguntas e análises

export const INTRO_AVANCADO = `Para desenharmos o plano de implementação completo e garantir que todos os setores da farmácia sejam otimizados, precisamos aprofundar em alguns indicadores de performance.

Suas respostas aqui servirão para calcularmos o potencial de economia real do projeto.`;

export const PERGUNTAS_AVANCADO = [
  // Bloco 1: Gestão Financeira e Blindagem de Lucro
  {
    id: "av1",
    secao: 1,
    secaoLabel: "Gestão Financeira e Blindagem de Lucro",
    pergunta: "Como é feita a conferência (conciliação) dos recebimentos de cartões e convênios?",
    tipo: "radio",
    opcoes: [
      { valor: "manual", label: "Manual (conferindo comprovante por comprovante)." },
      { valor: "sistema_divergencias", label: "O sistema de gestão faz, mas ocorrem divergências frequentes." },
      { valor: "plataforma_paga", label: "Utilizo uma plataforma de conciliação paga à parte." },
    ],
  },
  {
    id: "av2",
    secao: 1,
    secaoLabel: "Gestão Financeira e Blindagem de Lucro",
    pergunta: "Qual o custo mensal dessa ferramenta de conciliação (se houver)?",
    tipo: "radio",
    opcoes: [
      { valor: "nao_tenho", label: "Não tenho." },
      { valor: "sim", label: "Sim. Custo mensal: R$", complemento: "valor" },
    ],
  },
  {
    id: "av3",
    secao: 1,
    secaoLabel: "Gestão Financeira e Blindagem de Lucro",
    pergunta: "Hoje, você consegue visualizar o seu lucro líquido real (sobra de caixa após taxas, impostos e custos) de forma automática pelo sistema?",
    tipo: "radio",
    opcoes: [
      { valor: "sim", label: "Sim, tenho visão clara do lucro real." },
      { valor: "nao", label: "Não, preciso fazer cálculos externos ou planilhas." },
    ],
  },
  // Bloco 2: Inteligência de Estoque e Compras
  {
    id: "av4",
    secao: 2,
    secaoLabel: "Inteligência de Estoque e Compras (Giro e Ruptura)",
    pergunta: "Com que frequência você lida com a \"Ruptura\" (cliente pede um produto, mas ele está em falta no estoque)?",
    tipo: "radio",
    opcoes: [
      { valor: "diariamente", label: "Diariamente." },
      { valor: "semanalmente", label: "Semanalmente." },
      { valor: "raramente", label: "Raramente." },
    ],
  },
  {
    id: "av5",
    secao: 2,
    secaoLabel: "Inteligência de Estoque e Compras (Giro e Ruptura)",
    pergunta: "Na hora de comprar, o sistema te mostra o histórico de saída (giro) para evitar que você compre produtos que ficarão parados na prateleira?",
    tipo: "radio",
    opcoes: [
      { valor: "sim", label: "Sim, a compra é baseada em dados de giro." },
      { valor: "nao", label: "Não, a decisão é baseada em intuição ou \"olhômetro\"." },
    ],
  },
  {
    id: "av6",
    secao: 2,
    secaoLabel: "Inteligência de Estoque e Compras (Giro e Ruptura)",
    pergunta: "Você utiliza algum sistema de CRM ou programa de fidelidade para reter clientes e evitar que eles comprem no concorrente?",
    tipo: "radio",
    opcoes: [
      { valor: "nao", label: "Não." },
      { valor: "sim", label: "Sim. Custo mensal: R$", complemento: "valor" },
    ],
  },
  // Bloco 3: Produtividade e Gestão de Pessoas
  {
    id: "av7",
    secao: 3,
    secaoLabel: "Produtividade e Gestão de Pessoas",
    pergunta: "Se você precisasse agora de um relatório de desempenho de vendas por funcionário (mostrando quem traz mais lucro e não apenas volume), quanto tempo levaria?",
    tipo: "radio",
    opcoes: [
      { valor: "instantaneo", label: "É instantâneo." },
      { valor: "horas", label: "Levaria horas ou precisaria cruzar dados manualmente." },
      { valor: "nao_consigo", label: "Não consigo extrair essa informação com precisão." },
    ],
  },
  {
    id: "av8",
    secao: 3,
    secaoLabel: "Produtividade e Gestão de Pessoas",
    pergunta: "Existe algum processo vital na farmácia que hoje depende 100% da sua presença física na loja para acontecer?",
    tipo: "radio",
    opcoes: [
      { valor: "sim", label: "Sim, sou o \"gargalo\" em alguns processos." },
      { valor: "nao", label: "Não, a operação roda sozinha sem mim." },
    ],
  },
  // Bloco 4: Prevenção de Perdas e Segurança
  {
    id: "av9",
    secao: 4,
    secaoLabel: "Prevenção de Perdas e Segurança",
    pergunta: "Como é feito o controle de validade dos produtos hoje?",
    tipo: "radio",
    opcoes: [
      { valor: "olho", label: "\"No olho\" e vistorias manuais nas prateleiras." },
      { valor: "caderno", label: "Através de caderno ou planilha." },
      { valor: "sistema", label: "Sistema com alertas automáticos de vencimento." },
    ],
  },
  {
    id: "av10",
    secao: 4,
    secaoLabel: "Prevenção de Perdas e Segurança",
    pergunta: "Qual foi o valor aproximado de perda por vencimento/avaria nos últimos 12 meses?",
    tipo: "radio",
    opcoes: [
      { valor: "ate1k", label: "Até R$ 1.000." },
      { valor: "1k_a_5k", label: "Entre R$ 1.000 e R$ 5.000." },
      { valor: "acima5k", label: "Acima de R$ 5.000 ou Não tenho esse dado." },
    ],
  },
];

// Análises para cada resposta do diagnóstico avançado
export function gerarDiagnosticoAvancado(respostas) {
  const r = respostas || {};
  const itens = [];
  const val = (id) => r[id]?.valor ?? "";
  const comp = (id) => r[id]?.complemento ?? "";

  // Bloco 1
  const av1 = val("av1");
  if (av1 === "manual") {
    itens.push({
      titulo: "1. Conferência de Cartões e Convênios",
      pergunta: PERGUNTAS_AVANCADO[0].pergunta,
      resposta: "Manual (conferindo comprovante por comprovante).",
      analise:
        "Vazamento financeiro crítico. A conferência manual é humanamente impossível de ser 100% precisa. Sem automação, a farmácia fica exposta a erros de taxas das operadoras, cancelamentos não identificados e fraudes. Você está perdendo margem de lucro de forma invisível.",
    });
  } else if (av1 === "sistema_divergencias") {
    itens.push({
      titulo: "1. Conferência de Cartões e Convênios",
      pergunta: PERGUNTAS_AVANCADO[0].pergunta,
      resposta: "O sistema de gestão faz, mas ocorrem divergências frequentes.",
      analise:
        "Divergências frequentes indicam que o sistema não está integrado corretamente ou que os processos de conciliação precisam de revisão. Cada divergência não resolvida pode representar perda de capital.",
    });
  } else if (av1 === "plataforma_paga") {
    const custoAv2 = val("av2") === "sim" ? comp("av2") : "";
    const custo = custoAv2 ? custoAv2 : "—";
    itens.push({
      titulo: "1. Conferência de Cartões e Convênios",
      pergunta: PERGUNTAS_AVANCADO[0].pergunta,
      resposta: `Utilizo plataforma de conciliação paga. Custo: R$ ${custo}/mês`,
      analise:
        "Você já investe em conciliação, mas sistemas fragmentados aumentam o custo total. Uma solução integrada pode consolidar essa função.",
    });
  }

  const av3 = val("av3");
  if (av3 === "nao") {
    itens.push({
      titulo: "2. Visão do Lucro Líquido Real",
      pergunta: PERGUNTAS_AVANCADO[2].pergunta,
      resposta: "Não, preciso fazer cálculos externos ou planilhas.",
      analise:
        "Gestão cega. Faturamento não é lucro. Sem saber o lucro líquido real pelo sistema, você corre o risco de focar em produtos que vendem muito, mas que têm margem negativa após impostos e taxas, corroendo o patrimônio da empresa.",
    });
  } else if (av3 === "sim") {
    itens.push({
      titulo: "2. Visão do Lucro Líquido Real",
      pergunta: PERGUNTAS_AVANCADO[2].pergunta,
      resposta: "Sim, tenho visão clara do lucro real.",
      analise:
        "Excelente. Ter visão clara do lucro real é fundamental para decisões estratégicas. Mantenha essa disciplina.",
    });
  }

  // Bloco 2
  const av4 = val("av4");
  if (av4 === "diariamente" || av4 === "semanalmente") {
    itens.push({
      titulo: "3. Frequência de Ruptura",
      pergunta: PERGUNTAS_AVANCADO[3].pergunta,
      resposta: av4 === "diariamente" ? "Diariamente." : "Semanalmente.",
      analise:
        "Prejuízo de faturamento e de imagem. A ruptura expulsa o cliente para o concorrente. Se o cliente não encontra o básico hoje, ele não volta amanhã. O custo de recuperar um cliente perdido é muito maior do que o custo de manter o estoque inteligente.",
    });
  }

  const av5 = val("av5");
  if (av5 === "nao") {
    itens.push({
      titulo: "4. Decisão de Compra Baseada em Giro",
      pergunta: PERGUNTAS_AVANCADO[4].pergunta,
      resposta: "Não, a decisão é baseada em intuição ou \"olhômetro\".",
      analise:
        "Capital de giro imobilizado. Comprar por intuição gera excesso de produtos que não giram e falta dos que vendem. Dinheiro parado na prateleira é dinheiro que não paga boletos. O sistema deve ser o cérebro que decide a compra baseada em dados reais.",
    });
  } else if (av5 === "sim") {
    itens.push({
      titulo: "4. Decisão de Compra Baseada em Giro",
      pergunta: PERGUNTAS_AVANCADO[4].pergunta,
      resposta: "Sim, a compra é baseada em dados de giro.",
      analise:
        "Ótimo. Comprar com base em dados de giro reduz imobilização e ruptura. Continue refinando os indicadores.",
    });
  }

  const av6 = val("av6");
  if (av6 === "nao") {
    itens.push({
      titulo: "5. CRM / Programa de Fidelidade",
      pergunta: PERGUNTAS_AVANCADO[5].pergunta,
      resposta: "Não.",
      analise:
        "Sua farmácia é um balcão de passagens. Sem fidelização, você depende da sorte de o cliente passar na porta. Reter um cliente custa 5x menos do que atrair um novo; sem CRM, você está desperdiçando sua base de dados.",
    });
  } else if (av6 === "sim") {
    const custo = comp("av6") || "—";
    itens.push({
      titulo: "5. CRM / Programa de Fidelidade",
      pergunta: PERGUNTAS_AVANCADO[5].pergunta,
      resposta: `Sim. Custo mensal: R$ ${custo}`,
      analise:
        "Você já investe em fidelização. O próximo passo é integrar esses dados ao fluxo de vendas e compras para maximizar o retorno.",
    });
  }

  // Bloco 3
  const av7 = val("av7");
  if (av7 === "horas" || av7 === "nao_consigo") {
    itens.push({
      titulo: "6. Relatório de Desempenho por Funcionário",
      pergunta: PERGUNTAS_AVANCADO[6].pergunta,
      resposta: av7 === "horas" ? "Levaria horas ou precisaria cruzar dados manualmente." : "Não consigo extrair essa informação com precisão.",
      analise:
        "Equipe sem mérito. Se você não sabe quem traz mais lucro (e não apenas volume), você pode estar premiando o funcionário errado. A falta de dados impede treinamentos assertivos e correções de postura de vendas.",
    });
  } else if (av7 === "instantaneo") {
    itens.push({
      titulo: "6. Relatório de Desempenho por Funcionário",
      pergunta: PERGUNTAS_AVANCADO[6].pergunta,
      resposta: "É instantâneo.",
      analise:
        "Excelente. Ter dados de desempenho à mão permite gestão baseada em mérito e desenvolvimento da equipe.",
    });
  }

  const av8 = val("av8");
  if (av8 === "sim") {
    itens.push({
      titulo: "7. Presença Física do Gestor",
      pergunta: PERGUNTAS_AVANCADO[7].pergunta,
      resposta: "Sim, sou o \"gargalo\" em alguns processos.",
      analise:
        "A farmácia possui um 'Dono' e não um 'Gestor'. Se o negócio para sem você, ele não é um ativo, é um autoemprego sobrecarregado. O método centralizado visa criar autonomia para que a loja lucre mesmo com você à distância.",
    });
  } else if (av8 === "nao") {
    itens.push({
      titulo: "7. Presença Física do Gestor",
      pergunta: PERGUNTAS_AVANCADO[7].pergunta,
      resposta: "Não, a operação roda sozinha sem mim.",
      analise:
        "Parabéns. Ter uma operação que roda sem sua presença física é um grande diferencial competitivo e permite escalar o negócio.",
    });
  }

  // Bloco 4
  const av9 = val("av9");
  if (av9 === "olho" || av9 === "caderno") {
    itens.push({
      titulo: "8. Controle de Validade",
      pergunta: PERGUNTAS_AVANCADO[8].pergunta,
      resposta: av9 === "olho" ? "\"No olho\" e vistorias manuais nas prateleiras." : "Através de caderno ou planilha.",
      analise:
        "Risco de prejuízo direto e multas. O controle manual falha por cansaço ou esquecimento. Quando você encontra um produto vencido, o prejuízo é de 100% do custo. O sistema deve ser o vigia proativo que antecipa promoções e trocas.",
    });
  } else if (av9 === "sistema") {
    itens.push({
      titulo: "8. Controle de Validade",
      pergunta: PERGUNTAS_AVANCADO[8].pergunta,
      resposta: "Sistema com alertas automáticos de vencimento.",
      analise:
        "Ótimo. Alertas automáticos reduzem perdas por vencimento. Garanta que o sistema esteja integrado ao processo de vendas para \"queimar\" itens próximos do vencimento.",
    });
  }

  const av10 = val("av10");
  if (av10 === "1k_a_5k" || av10 === "acima5k") {
    itens.push({
      titulo: "9. Perdas por Vencimento nos Últimos 12 Meses",
      pergunta: PERGUNTAS_AVANCADO[9].pergunta,
      resposta: av10 === "1k_a_5k" ? "Entre R$ 1.000 e R$ 5.000." : "Acima de R$ 5.000 ou Não tenho esse dado.",
      analise:
        "Vazamento de capital. Não saber o valor das perdas é um sinal de descontrole de estoque. Cada real perdido em vencimento exige que você venda 5x mais apenas para empatar o prejuízo. Estancar essa sangria é lucro imediato.",
    });
  } else if (av10 === "ate1k") {
    itens.push({
      titulo: "9. Perdas por Vencimento nos Últimos 12 Meses",
      pergunta: PERGUNTAS_AVANCADO[9].pergunta,
      resposta: "Até R$ 1.000.",
      analise:
        "Perdas controladas. Manter esse nível requer disciplina contínua no controle de validade e giro.",
    });
  }

  return itens;
}
