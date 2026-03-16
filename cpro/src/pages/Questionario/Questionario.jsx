// Questionario.jsx — Diagnóstico de Gestão e Custos Operacionais
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { INTRO_AVANCADO, PERGUNTAS_AVANCADO, gerarDiagnosticoAvancado } from "./perguntasAvancado";
import { getApiUrl } from "../../utils/apiUrl";

const API_URL = getApiUrl();
const BORDER = "1px solid rgba(255,255,255,0.08)";

const INTRO = `Você sabia que a gestão ineficiente de estoque e compras é responsável pela maior parte do desperdício de capital em farmácias independentes?

Este formulário foi desenhado para identificar onde o seu capital está ficando 'preso' hoje. Minha intenção é utilizar estas informações para configurar o meu sistema de forma personalizada para a sua realidade, focando inicialmente em reduzir seus custos fixos com softwares e otimizar seu tempo de compra.

Vamos começar?`;

const PERGUNTAS = [
  // Seção 1
  {
    id: "q1",
    secao: 1,
    secaoLabel: "Ecossistema de Softwares e Gastos Fixos",
    pergunta: "Você utiliza atualmente alguma plataforma específica para cotação de preços?",
    tipo: "radio",
    opcoes: [
      { valor: "sim", label: "Sim. Qual?", complemento: "texto" },
      { valor: "nao", label: "Não." },
    ],
  },
  {
    id: "q2",
    secao: 1,
    secaoLabel: "Ecossistema de Softwares e Gastos Fixos",
    pergunta: "Qual o custo mensal (assinatura) exclusivo dessa plataforma de cotação?",
    tipo: "radio",
    opcoes: [
      { valor: "nao_tenho", label: "Não tenho." },
      { valor: "sim", label: "Sim. Custo mensal: R$", complemento: "valor" },
    ],
  },
  {
    id: "q3",
    secao: 1,
    secaoLabel: "Ecossistema de Softwares e Gastos Fixos",
    pergunta: "Qual o valor da mensalidade do seu atual Sistema de Gestão (ERP/Software de Vendas)?",
    tipo: "radio",
    opcoes: [
      { valor: "nao_tenho", label: "Não tenho." },
      { valor: "sim", label: "Sim. Mensalidade: R$", complemento: "valor" },
    ],
  },
  {
    id: "q4",
    secao: 1,
    secaoLabel: "Ecossistema de Softwares e Gastos Fixos",
    pergunta: "Além desses, você mantém alguma outra assinatura (ex: sistemas de fidelidade, controle de validade, programas de benefícios/PBM)?",
    tipo: "radio",
    opcoes: [
      { valor: "nao", label: "Não." },
      { valor: "sim", label: "Sim. Custo somado: R$", complemento: "valor" },
    ],
  },
  // Seção 2
  {
    id: "q5",
    secao: 2,
    secaoLabel: "Logística de Compras e Capital Humano",
    pergunta: "Hoje, existe um funcionário (ou você mesmo) com tempo dedicado para a função de compras?",
    tipo: "radio",
    opcoes: [
      { valor: "exclusiva", label: "Sim, dedicação exclusiva." },
      { valor: "divide", label: "Sim, mas divide com outras funções." },
      { valor: "nao", label: "Não." },
    ],
  },
  {
    id: "q6",
    secao: 2,
    secaoLabel: "Logística de Compras e Capital Humano",
    pergunta: "Após a plataforma mostrar o menor preço, como os pedidos são finalizados?",
    tipo: "radio",
    opcoes: [
      { valor: "nao_se_aplica", label: "Não utilizo plataforma de cotação." },
      { valor: "automatico", label: "O sistema envia tudo automaticamente." },
      { valor: "manual", label: "É necessário entrar em contato/finalizar manualmente com cada fornecedor." },
    ],
  },
  {
    id: "q7",
    secao: 2,
    secaoLabel: "Logística de Compras e Capital Humano",
    pergunta: "Quanto tempo da equipe é gasto, em média, por dia para fechar todos os pedidos da loja?",
    tipo: "radio",
    opcoes: [
      { valor: "menos1h", label: "Menos de 1 hora." },
      { valor: "1a3h", label: "De 1 a 3 horas." },
      { valor: "mais3h", label: "Mais de 3 horas." },
    ],
  },
  // Seção 3
  {
    id: "q8",
    secao: 3,
    secaoLabel: "Saúde do Estoque e Inteligência",
    pergunta: "Você considera que seu sistema de gestão atual resolve todos os seus problemas de controle de estoque e perdas?",
    tipo: "radio",
    opcoes: [
      { valor: "sim", label: "Sim, plenamente." },
      { valor: "basico", label: "Atende apenas o básico (venda/fiscal)." },
      { valor: "nao", label: "Não, ainda tenho muitos furos e perdas." },
    ],
  },
  {
    id: "q9",
    secao: 3,
    secaoLabel: "Saúde do Estoque e Inteligência",
    pergunta: "Qual a sua maior dificuldade hoje na gestão? (Pode marcar mais de uma)",
    tipo: "checkbox",
    opcoes: [
      { valor: "parados", label: "Produtos parados (dinheiro imobilizado)." },
      { valor: "vencimento", label: "Perda de produtos por vencimento." },
      { valor: "ruptura", label: "Falta de produtos no balcão (ruptura)." },
      { valor: "burocracia", label: "Tempo excessivo em tarefas burocráticas/manuais.", complemento: "texto" },
    ],
  },
];

// Análises do diagnóstico — cada resposta gera um insight personalizado
function gerarDiagnostico(respostas) {
  const r = respostas || {};
  const itens = [];

  const valorCotacao = r.q2?.valor === "sim" ? (r.q2?.complemento || "") : "";
  const valorERP = r.q3?.valor === "sim" ? (r.q3?.complemento || "") : "";
  const valorOutras = r.q4?.valor === "sim" ? (r.q4?.complemento || "") : "";

  // 1. Plataforma de Cotação (q1 + q2)
  const q1Val = r.q1?.valor || "";
  if (q1Val === "nao") {
    itens.push({
      titulo: "1. Sobre a Plataforma de Cotação",
      pergunta: PERGUNTAS[0].pergunta,
      resposta: "Não.",
      analise:
        "Você está operando \"no escuro\". Sem comparar preços de forma automatizada, sua margem de lucro fica totalmente dependente da sorte ou da fidelidade a poucos fornecedores, o que pode custar caro no final do mês.",
    });
  } else if (q1Val === "sim") {
    const custo = valorCotacao ? ` R$ ${valorCotacao}` : "";
    itens.push({
      titulo: "1. Sobre a Plataforma de Cotação",
      pergunta: PERGUNTAS[0].pergunta,
      resposta: `Sim.${custo ? ` Custo mensal:${custo}` : ""}`,
      analise: valorCotacao
        ? `Você já entende a importância de cotar, mas hoje tem um custo fixo de R$ ${valorCotacao} apenas para ter a informação. O desafio é que essa plataforma é um "custo isolado" que não executa a compra nem conversa com seu estoque.`
        : "Você já entende a importância de cotar. O desafio é que essa plataforma é um \"custo isolado\" que não executa a compra nem conversa com seu estoque.",
    });
  }

  // 2. Outras assinaturas (q4)
  const q4Val = r.q4?.valor || "";
  if (q4Val === "sim" && valorOutras) {
    itens.push({
      titulo: "2. Sobre Outras Assinaturas",
      pergunta: PERGUNTAS[3].pergunta,
      resposta: `Sim. Custo somado: R$ ${valorOutras}`,
      analise: `Você mantém custos adicionais de R$ ${valorOutras} com outras assinaturas. Esses sistemas fragmentados aumentam a complexidade operacional e o custo total de tecnologia.`,
    });
  }

  // 3. Processo de Compra (q6)
  const q6Val = r.q6?.valor || "";
  if (q6Val === "nao_se_aplica") {
    itens.push({
      titulo: "3. Sobre o Processo de Compra",
      pergunta: PERGUNTAS[5].pergunta,
      resposta: "Não utilizo plataforma de cotação.",
      analise:
        "Sem plataforma de cotação, você não tem essa etapa automatizada. O próximo passo é adotar uma solução que compare preços e otimize suas compras.",
    });
  } else if (q6Val === "manual") {
    itens.push({
      titulo: "3. Sobre o Processo de Compra",
      pergunta: PERGUNTAS[5].pergunta,
      resposta: "É necessário entrar em contato/finalizar manualmente com cada fornecedor.",
      analise:
        "Este é o seu maior ralo de produtividade. Ter que entrar em contato com cada fornecedor após cotar é um trabalho braçal que gera erros e toma tempo que sua equipe deveria usar para vender. O custo do tempo humano aqui costuma ser maior que o valor do software.",
    });
  } else if (q6Val === "automatico") {
    itens.push({
      titulo: "3. Sobre o Processo de Compra",
      pergunta: PERGUNTAS[5].pergunta,
      resposta: "O sistema envia tudo automaticamente.",
      analise:
        "Excelente, você já automatizou a saída do pedido. O próximo nível de eficiência é garantir que esse pedido seja baseado na inteligência de giro real, e não apenas no preço baixo, para não estocar o que não vende.",
    });
  }

  // 4. Sistema de Gestão / ERP (q8 + q3)
  const q8Val = r.q8?.valor || "";
  if (q8Val) {
    const valorERPStr = valorERP ? ` R$ ${valorERP}` : "";
    let analiseERP = "";
    if (q8Val === "sim") {
      analiseERP =
        "Seu sistema atende plenamente às suas necessidades. Aproveite para integrar ainda mais os processos e reduzir retrabalho.";
    } else if (q8Val === "basico" || q8Val === "nao") {
      analiseERP = valorERP
        ? `O seu ERP atual custa R$ ${valorERP}, mas pelo seu relato, ele atua mais como um "emissor de notas somente". Manter sistemas separados (ERP + Cotação + Validade) cria "ilhas de informação", onde os dados se perdem e as decisões demoram a ser tomadas.`
        : "O seu ERP atual, pelo seu relato, atua mais como um \"emissor de notas somente\". Manter sistemas separados (ERP + Cotação + Validade) cria \"ilhas de informação\", onde os dados se perdem e as decisões demoram a ser tomadas.";
    }
    if (analiseERP) {
      itens.push({
        titulo: "4. Sobre o Sistema de Gestão (ERP)",
        pergunta: PERGUNTAS[7].pergunta,
        resposta: PERGUNTAS[7].opcoes.find((o) => o.valor === q8Val)?.label || q8Val,
        analise: analiseERP,
      });
    }
  }

  // 5. Controle de Estoque e Perdas (q9 - checkbox)
  const q9Valores = r.q9?.valores || [];
  const analisesEstoque = {
    parados:
      "Dinheiro parado na prateleira é lucro que não circula. Se o seu sistema não sugere compras baseadas no giro médio, você continuará imobilizando capital em itens de baixa saída enquanto falta o que o cliente realmente quer.",
    vencimento:
      "O vencimento é o prejuízo mais doloroso, pois é 100% de perda. Isso indica que a gestão de validade não está integrada ao processo de vendas e compras. O sistema deveria te alertar para \"queimar\" esse item meses antes.",
    ruptura:
      "Falta de produtos no balcão significa vendas perdidas e clientes insatisfeitos. A ruptura geralmente ocorre quando o sistema não prevê a demanda com base no histórico de vendas.",
    burocracia:
      "Tempo excessivo em tarefas manuais desvia sua equipe do que realmente gera valor: atender o cliente e vender. A automação de processos repetitivos pode liberar horas por semana.",
  };
  const labelsEstoque = {
    parados: "Produtos parados (dinheiro imobilizado)",
    vencimento: "Perda de produtos por vencimento",
    ruptura: "Falta de produtos no balcão (ruptura)",
    burocracia: "Tempo excessivo em tarefas burocráticas/manuais",
  };
  q9Valores.forEach((v) => {
    if (analisesEstoque[v]) {
      itens.push({
        titulo: "5. Sobre Controle de Estoque e Perdas",
        pergunta: PERGUNTAS[8].pergunta,
        resposta: labelsEstoque[v] || v,
        analise: analisesEstoque[v],
      });
    }
  });

  return itens;
}

function capitalizarNome(nome) {
  if (!nome || typeof nome !== "string") return nome || "";
  return nome.trim().split(/\s+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

/** Valida se todas as perguntas obrigatórias foram respondidas. Retorna { ok, faltando } */
function validarRespostas(respostas) {
  const faltando = [];
  const r = respostas || {};

  for (const p of PERGUNTAS) {
    if (p.tipo === "radio") {
      const val = r[p.id]?.valor;
      if (val === undefined || val === "") {
        faltando.push(p.pergunta);
        continue;
      }
      if (val === "sim" && p.opcoes?.find((o) => o.valor === "sim")?.complemento) {
        const comp = (r[p.id]?.complemento || "").toString().trim();
        if (!comp) faltando.push(p.pergunta);
      }
    } else if (p.tipo === "checkbox") {
      const vals = r[p.id]?.valores || [];
      if (!Array.isArray(vals) || vals.length === 0) {
        faltando.push(p.pergunta);
      }
    }
  }
  return { ok: faltando.length === 0, faltando };
}

/** Valida respostas do questionário avançado */
function validarRespostasAvancado(respostas) {
  const faltando = [];
  const r = respostas || {};
  for (const p of PERGUNTAS_AVANCADO) {
    if (p.tipo === "radio") {
      const val = r[p.id]?.valor;
      if (val === undefined || val === "") {
        faltando.push(p.pergunta);
        continue;
      }
      const opSim = p.opcoes?.find((o) => o.valor === "sim");
      if (val === "sim" && opSim?.complemento) {
        const comp = (r[p.id]?.complemento || "").toString().trim();
        if (!comp) faltando.push(p.pergunta);
      }
    }
  }
  return { ok: faltando.length === 0, faltando };
}

/** Sanitiza respostas para JSON seguro (evita erros em mobile) */
function sanitizarRespostas(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v) && v !== null) {
      const clean = {};
      if (typeof v.valor === "string" || typeof v.valor === "number") clean.valor = v.valor;
      if (typeof v.complemento === "string" || typeof v.complemento === "number") clean.complemento = String(v.complemento);
      if (Array.isArray(v.valores)) clean.valores = v.valores.filter((x) => typeof x === "string");
      if (Object.keys(clean).length > 0) out[k] = clean;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function Questionario() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [diagnosticoItens, setDiagnosticoItens] = useState([]);
  const [diagnosticoAvancadoItens, setDiagnosticoAvancadoItens] = useState([]);
  const [modoAvancado, setModoAvancado] = useState(false);
  const [passoAvancado, setPassoAvancado] = useState(0);
  const [respostasAvancado, setRespostasAvancado] = useState({});
  const [enviandoAvancado, setEnviandoAvancado] = useState(false);
  const [diagnosticosSalvos, setDiagnosticosSalvos] = useState([]);
  const [diagnosticoSelecionado, setDiagnosticoSelecionado] = useState(null);
  const [carregandoDiagnosticos, setCarregandoDiagnosticos] = useState(false);

  const STORAGE_KEY = "diagnosticoQuestionario";
  const STORAGE_AVANCADO_KEY = "diagnosticoAvancadoQuestionario";
  const baseUrl = typeof getApiUrl === "function" ? getApiUrl() : (process.env.REACT_APP_API_URL || "http://localhost:4001");
  const apiUrl = typeof baseUrl === "string" ? baseUrl.replace(/\/+$/, "") : "http://localhost:4001";

  async function carregarDiagnosticosSalvos(mostrarLoading = true) {
    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) return;
    if (mostrarLoading) setCarregandoDiagnosticos(true);
    try {
      const res = await fetch(`${apiUrl}/api/questionario/diagnosticos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const lista = await res.json();
        setDiagnosticosSalvos(Array.isArray(lista) ? lista : []);
      }
    } catch (_) {}
    finally {
      if (mostrarLoading) setCarregandoDiagnosticos(false);
    }
  }

  async function salvarDiagnosticoNoBackend(itens, itensAvancado, resp) {
    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) return;
    try {
      const body = { diagnosticoItens: itens || [], diagnosticoAvancadoItens: itensAvancado || [], respostas: sanitizarRespostas(resp || {}) };
      await fetchComRetry(`${apiUrl}/api/questionario/diagnosticos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      carregarDiagnosticosSalvos(false);
    } catch (_) {}
  }

  useEffect(() => {
    let u = null;
    try {
      u = JSON.parse(typeof sessionStorage !== "undefined" ? sessionStorage.getItem("usuario") || "{}" : "{}");
    } catch (_) {}
    if (!u?._id) {
      navigate("/");
      return;
    }
    if ((u.tipo || "").toLowerCase() !== "questionario") {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    if (usuario?._id) carregarDiagnosticosSalvos();
  }, [usuario?._id]);

  const totalPassos = 1 + PERGUNTAS.length;
  const passoAtual = passo + 1;
  const percentual = Math.round((passoAtual / totalPassos) * 100);
  const perguntaAtual = passo > 0 ? PERGUNTAS[passo - 1] : null;

  function atualizarResposta(id, valor, complemento) {
    setRespostas((prev) => {
      const next = { ...prev };
      if (complemento !== undefined) {
        next[id] = { ...(next[id] || {}), valor, complemento: String(complemento || "") };
      } else {
        next[id] = typeof valor === "object" ? valor : { valor };
      }
      return next;
    });
  }

  function handleRadioChange(id, opcao) {
    const r = { valor: opcao.valor };
    if (opcao.complemento) r.complemento = respostas[id]?.complemento || "";
    setRespostas((prev) => ({ ...prev, [id]: r }));
  }

  function handleCheckboxChange(id, opcaoValor, checked) {
    const atual = respostas[id]?.valores || [];
    const next = checked ? [...atual, opcaoValor] : atual.filter((v) => v !== opcaoValor);
    const opcao = PERGUNTAS.find((p) => p.id === id)?.opcoes?.find((o) => o.valor === opcaoValor);
    const r = { valores: next };
    if (opcao?.complemento) r.complemento = respostas[id]?.complemento || "";
    setRespostas((prev) => ({ ...prev, [id]: r }));
  }

  function proximo() {
    if (passo < PERGUNTAS.length) setPasso((p) => p + 1);
  }

  function anterior() {
    if (passo > 0) setPasso((p) => p - 1);
  }

  async function fetchComRetry(url, opts, tentativas = 3) {
    const timeout = 120000; // 2 min (Render cold start pode demorar ~60s)
    for (let i = 0; i < tentativas; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (e) {
        clearTimeout(id);
        if (i === tentativas - 1) throw e;
        await new Promise((r) => setTimeout(r, 3000)); // espera 3s antes de tentar de novo
      }
    }
  }

  async function enviar() {
    const validacao = validarRespostas(respostas);
    if (!validacao.ok) {
      const msg = validacao.faltando.length === 1
        ? `Ainda falta responder:\n\n• ${validacao.faltando[0]}`
        : `Ainda faltam ${validacao.faltando.length} perguntas:\n\n• ${validacao.faltando.slice(0, 5).join("\n• ")}${validacao.faltando.length > 5 ? `\n... e mais ${validacao.faltando.length - 5}` : ""}`;
      Swal.fire({ title: "Perguntas incompletas", text: msg, icon: "warning", confirmButtonText: "Entendi" });
      return;
    }
    if (enviando) return;
    setEnviando(true);
    try {
      const respSanit = sanitizarRespostas(respostas);
      let itens = [];
      try {
        itens = gerarDiagnostico(respostas);
      } catch (errDiag) {
        console.error("Erro ao gerar diagnóstico:", errDiag);
        throw new Error("Erro ao processar suas respostas. Tente novamente.");
      }
      setDiagnosticoItens(itens);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
      setMostrarDiagnostico(true);

      const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
      try {
        const res = await fetchComRetry(`${apiUrl}/api/questionario/enviar-respostas`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ respostas: respSanit }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401 && /token inválido|token não fornecido|não fornecido/i.test(data.error || "")) {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("usuario");
          }
        }
      } catch (_) {}
      try {
        await salvarDiagnosticoNoBackend(itens, [], respSanit);
      } catch (_) {}
      carregarDiagnosticosSalvos(false);
    } catch (err) {
      const msg = String(err?.message || "");
      const ehTokenInvalido = /token inválido|token expirado|sessão expirou|não fornecido/i.test(msg);
      const ehRede = !ehTokenInvalido && (err?.name === "AbortError" || /failed to fetch|network/i.test(msg));
      let texto = msg;
      if (ehTokenInvalido) {
        texto = "Sua sessão expirou ou é inválida. Faça login novamente para continuar.";
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
      } else if (ehRede) {
        texto = "O servidor demorou para responder (pode estar acordando). Tente novamente em alguns segundos.\n\nVerifique também sua conexão com a internet.";
      } else if (!msg) {
        texto = "Não foi possível enviar. Tente novamente.";
      }
      Swal.fire({
        title: "Erro",
        text: texto,
        icon: "error",
        confirmButtonText: ehTokenInvalido ? "Ir para login" : "Entendi",
      }).then((r) => {
        if (ehTokenInvalido && r.isConfirmed) navigate("/");
      });
    } finally {
      setEnviando(false);
    }
  }

  function concluir() {
    setMostrarDiagnostico(false);
    setDiagnosticoSelecionado(null);
    carregarDiagnosticosSalvos();
  }

  function formatarData(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function fazerNovoDiagnostico() {
    setMostrarDiagnostico(false);
    setDiagnosticoItens([]);
    setDiagnosticoAvancadoItens([]);
    setModoAvancado(false);
    setRespostas({});
    setRespostasAvancado({});
    setPasso(0);
    setPassoAvancado(0);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_AVANCADO_KEY);
    }
  }

  if (!usuario) return null;

  if (diagnosticoSelecionado) {
    const d = diagnosticoSelecionado;
    const itensB = d.diagnosticoItens || [];
    const itensA = d.diagnosticoAvancadoItens || [];
    return (
      <div className="layout-content-inner" style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px", color: "#e6edf3" }}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>Diagnóstico — {capitalizarNome(d.nomeUsuario || usuario.nome)}</h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>Realizado em {formatarData(d.data)}</p>
        <p style={{ color: "#8b949e", marginBottom: 28, lineHeight: 1.6 }}>Análise do seu cenário na data do diagnóstico:</p>
        {itensB.length === 0 && itensA.length === 0 ? (
          <div style={card}><p style={{ color: "#8b949e" }}>Nenhuma análise disponível.</p></div>
        ) : (
          <>
            {itensB.length > 0 && <><h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 8 }}>Diagnóstico Básico</h3>
              {itensB.map((item, idx) => (
                <div key={`b-${idx}`} style={card}>
                  <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                  <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                  <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Sua resposta: {item.resposta}</p>
                  <div style={{ padding: "12px 0", borderTop: BORDER }}><p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p></div>
                </div>
              ))}</>}
            {itensA.length > 0 && <><h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 24 }}>Diagnóstico Avançado — Gestão 360º</h3>
              {itensA.map((item, idx) => (
                <div key={`a-${idx}`} style={card}>
                  <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                  <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                  <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Sua resposta: {item.resposta}</p>
                  <div style={{ padding: "12px 0", borderTop: BORDER }}><p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p></div>
                </div>
              ))}</>}
          </>
        )}
        <div style={{ marginTop: 24 }}><button type="button" onClick={() => setDiagnosticoSelecionado(null)} style={btnAnterior}>Voltar aos diagnósticos</button></div>
        <footer style={footer}>As informações fornecidas são confidenciais e serão utilizadas exclusivamente para o desenvolvimento do projeto RP Vista Pro.</footer>
      </div>
    );
  }

  if (modoAvancado) {
    const totalAvancado = 1 + PERGUNTAS_AVANCADO.length;
    const passoAvancadoAtual = passoAvancado + 1;
    const perguntaAvancadoAtual = passoAvancado > 0 ? PERGUNTAS_AVANCADO[passoAvancado - 1] : null;
    const proximoAvancado = () => passoAvancado < PERGUNTAS_AVANCADO.length && setPassoAvancado((p) => p + 1);
    const anteriorAvancado = () => passoAvancado > 0 && setPassoAvancado((p) => p - 1);
    const handleRadioAvancado = (id, op) => {
      const r = { valor: op.valor };
      if (op.complemento) r.complemento = respostasAvancado[id]?.complemento || "";
      setRespostasAvancado((prev) => ({ ...prev, [id]: r }));
    };
    const handleCheckboxAvancado = (id, opValor, checked) => {
      const atual = respostasAvancado[id]?.valores || [];
      const next = checked ? [...atual, opValor] : atual.filter((v) => v !== opValor);
      const op = PERGUNTAS_AVANCADO.find((p) => p.id === id)?.opcoes?.find((o) => o.valor === opValor);
      const r = { valores: next };
      if (op?.complemento) r.complemento = respostasAvancado[id]?.complemento || "";
      setRespostasAvancado((prev) => ({ ...prev, [id]: r }));
    };
    async function enviarAvancado() {
      const validacao = validarRespostasAvancado(respostasAvancado);
      if (!validacao.ok) {
        const msg = validacao.faltando.length === 1 ? `Ainda falta responder:\n\n• ${validacao.faltando[0]}` : `Ainda faltam ${validacao.faltando.length} perguntas:\n\n• ${validacao.faltando.slice(0, 5).join("\n• ")}${validacao.faltando.length > 5 ? `\n... e mais ${validacao.faltando.length - 5}` : ""}`;
        Swal.fire({ title: "Perguntas incompletas", text: msg, icon: "warning", confirmButtonText: "Entendi" });
        return;
      }
      if (enviandoAvancado) return;
      setEnviandoAvancado(true);
      try {
        const itens = gerarDiagnosticoAvancado(respostasAvancado);
        const itensBasico = gerarDiagnostico(respostas);
        setDiagnosticoAvancadoItens(itens);
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_AVANCADO_KEY, JSON.stringify(itens));
        setModoAvancado(false);

        const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
        try {
          const res = await fetchComRetry(`${apiUrl}/api/questionario/enviar-respostas`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ respostas: { basico: respostas, avancado: respostasAvancado } }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (res.status === 401 && /token inválido|token não fornecido|não fornecido/i.test(data.error || "")) {
              sessionStorage.removeItem("token");
              sessionStorage.removeItem("usuario");
            }
          }
        } catch (_) {}
        try {
          await salvarDiagnosticoNoBackend(itensBasico, itens, { basico: respostas, avancado: respostasAvancado });
        } catch (_) {}
      } catch (err) {
        const msg = String(err?.message || "");
        const ehTokenInvalido = /token inválido|token expirado|sessão expirou|não fornecido/i.test(msg);
        const ehRede = !ehTokenInvalido && (err?.name === "AbortError" || /failed to fetch|network/i.test(msg));
        const texto = ehTokenInvalido
          ? "Sua sessão expirou ou é inválida. Faça login novamente para continuar."
          : ehRede
            ? "O servidor demorou para responder (pode estar acordando). Tente novamente em alguns segundos.\n\nVerifique também sua conexão com a internet."
            : (msg || "Não foi possível enviar. Tente novamente.");
        if (ehTokenInvalido) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("usuario");
        }
        Swal.fire({
          title: "Erro",
          text: texto,
          icon: "error",
          confirmButtonText: ehTokenInvalido ? "Ir para login" : "Entendi",
        }).then((r) => {
          if (ehTokenInvalido && r.isConfirmed) navigate("/");
        });
      } finally {
        setEnviandoAvancado(false);
      }
    }
    return (
      <div className="layout-content-inner" style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px", color: "#e6edf3" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>Passo {passoAvancadoAtual} de {totalAvancado}</span>
            <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>{Math.round((passoAvancadoAtual / totalAvancado) * 100)}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${Math.round((passoAvancadoAtual / totalAvancado) * 100)}%`, height: "100%", background: "var(--gradient-btn-primary)", borderRadius: 3, transition: "width 0.3s ease" }} />
          </div>
        </div>
        <h2 style={{ marginBottom: 24, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>Diagnóstico Avançado: Gestão 360º</h2>
        {passoAvancado === 0 ? (
          <div style={card}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3", fontSize: "1.25rem" }}>Gestão 360º</h3>
            <p style={{ color: "#8b949e", lineHeight: 1.7, whiteSpace: "pre-line" }}>{INTRO_AVANCADO}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}><button type="button" onClick={proximoAvancado} style={btnProximo}>Começar</button></div>
          </div>
        ) : perguntaAvancadoAtual ? (
          <div style={card}>
            <p style={{ color: "#00F2FF", fontSize: "0.8125rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bloco {perguntaAvancadoAtual.secao}: {perguntaAvancadoAtual.secaoLabel}</p>
            <h3 style={{ margin: "0 0 20px", color: "#e6edf3", fontSize: "1.125rem", lineHeight: 1.5 }}>{perguntaAvancadoAtual.pergunta}</h3>
            {perguntaAvancadoAtual.tipo === "radio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {perguntaAvancadoAtual.opcoes.map((op) => (
                  <div key={op.valor} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <label style={labelRadio}>
                      <input type="radio" name={perguntaAvancadoAtual.id} checked={(respostasAvancado[perguntaAvancadoAtual.id]?.valor || "") === op.valor} onChange={() => handleRadioAvancado(perguntaAvancadoAtual.id, op)} />
                      <span>{op.label}</span>
                    </label>
                    {op.complemento && (
                      <input type="text" placeholder={op.complemento === "valor" ? "0,00" : "Escreva aqui..."} value={(respostasAvancado[perguntaAvancadoAtual.id]?.valor || "") === op.valor ? (respostasAvancado[perguntaAvancadoAtual.id]?.complemento || "") : ""} onChange={(e) => setRespostasAvancado((prev) => ({ ...prev, [perguntaAvancadoAtual.id]: { ...(prev[perguntaAvancadoAtual.id] || {}), valor: op.valor, complemento: e.target.value } }))} onFocus={() => handleRadioAvancado(perguntaAvancadoAtual.id, op)} style={inputComplemento} className="campo-fundo-claro" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
              <button type="button" onClick={anteriorAvancado} style={btnAnterior}>Anterior</button>
              {passoAvancado < PERGUNTAS_AVANCADO.length ? <button type="button" onClick={proximoAvancado} style={btnProximo}>Próxima</button> : <button type="button" onClick={enviarAvancado} disabled={enviandoAvancado} style={btnEnviar}>{enviandoAvancado ? "Enviando..." : "Gerar Diagnóstico Avançado"}</button>}
            </div>
          </div>
        ) : null}
        <footer style={footer}>As informações fornecidas são confidenciais e serão utilizadas exclusivamente para o desenvolvimento do projeto RP Vista Pro.</footer>
      </div>
    );
  }

  if (mostrarDiagnostico) {
    return (
      <div className="layout-content-inner" style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px", color: "#e6edf3" }}>
        <h2 style={{ marginBottom: 24, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>Seu Diagnóstico — {capitalizarNome(usuario.nome)}</h2>
        <p style={{ color: "#8b949e", marginBottom: 28, lineHeight: 1.6 }}>Com base nas suas respostas, elaboramos a seguinte análise do seu cenário atual:</p>
        {diagnosticoItens.length === 0 && diagnosticoAvancadoItens.length === 0 ? (
          <div style={card}><p style={{ color: "#8b949e" }}>Nenhuma análise disponível para as respostas fornecidas.</p></div>
        ) : (
          <>
            {diagnosticoItens.length > 0 && <><h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 8 }}>Diagnóstico Básico</h3>
              {diagnosticoItens.map((item, idx) => (
                <div key={`b-${idx}`} style={card}>
                  <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                  <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                  <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Sua resposta: {item.resposta}</p>
                  <div style={{ padding: "12px 0", borderTop: BORDER }}><p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p></div>
                </div>
              ))}</>}
            {diagnosticoAvancadoItens.length > 0 && <><h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 24 }}>Diagnóstico Avançado — Gestão 360º</h3>
              {diagnosticoAvancadoItens.map((item, idx) => (
                <div key={`a-${idx}`} style={card}>
                  <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                  <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                  <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Sua resposta: {item.resposta}</p>
                  <div style={{ padding: "12px 0", borderTop: BORDER }}><p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p></div>
                </div>
              ))}</>}
          </>
        )}
        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "nowrap" }}>
          {diagnosticoAvancadoItens.length === 0 && <button type="button" onClick={() => { setModoAvancado(true); setPassoAvancado(0); setRespostasAvancado({}); }} style={btnProximo}>Quero fazer um diagnóstico avançado</button>}
          <button type="button" onClick={concluir} style={btnProximo}>Concluir</button>
          <button type="button" onClick={fazerNovoDiagnostico} style={btnAnterior}>Fazer novo diagnóstico</button>
        </div>
        <footer style={footer}>As informações fornecidas são confidenciais e serão utilizadas exclusivamente para o desenvolvimento do projeto RP Vista Pro.</footer>
      </div>
    );
  }

  return (
    <div className="layout-content-inner" style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px", color: "#e6edf3" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>Passo {passoAtual} de {totalPassos}</span>
          <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>{percentual}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${percentual}%`, height: "100%", background: "var(--gradient-btn-primary)", borderRadius: 3, transition: "width 0.3s ease" }} />
        </div>
      </div>
      <h2 style={{ marginBottom: 24, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>Olá, {capitalizarNome(usuario.nome)}!</h2>
      {passo === 0 ? (
        <div style={card}>
          <h3 style={{ margin: "0 0 16px", color: "#e6edf3", fontSize: "1.25rem" }}>Diagnóstico de Gestão e Custos Operacionais</h3>
          <p style={{ color: "#8b949e", lineHeight: 1.7, whiteSpace: "pre-line" }}>{INTRO}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}><button type="button" onClick={proximo} style={btnProximo}>Começar</button></div>
        </div>
      ) : perguntaAtual ? (
        <div style={card}>
          <p style={{ color: "#00F2FF", fontSize: "0.8125rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Seção {perguntaAtual.secao}: {perguntaAtual.secaoLabel}</p>
          <h3 style={{ margin: "0 0 20px", color: "#e6edf3", fontSize: "1.125rem", lineHeight: 1.5 }}>{perguntaAtual.pergunta}</h3>
          {perguntaAtual.tipo === "radio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {perguntaAtual.opcoes.map((op) => (
                <div key={op.valor} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={labelRadio}>
                    <input type="radio" name={perguntaAtual.id} checked={(respostas[perguntaAtual.id]?.valor || "") === op.valor} onChange={() => handleRadioChange(perguntaAtual.id, op)} />
                    <span>{op.label}</span>
                  </label>
                  {op.complemento && (
                    <input type="text" placeholder={op.complemento === "valor" ? "0,00" : "Escreva aqui..."} value={(respostas[perguntaAtual.id]?.valor || "") === op.valor ? (respostas[perguntaAtual.id]?.complemento || "") : ""} onChange={(e) => atualizarResposta(perguntaAtual.id, op.valor, e.target.value)} onFocus={() => handleRadioChange(perguntaAtual.id, op)} style={inputComplemento} className="campo-fundo-claro" />
                  )}
                </div>
              ))}
            </div>
          )}
          {perguntaAtual.tipo === "checkbox" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {perguntaAtual.opcoes.map((op) => (
                <div key={op.valor} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={labelCheckbox}>
                    <input type="checkbox" checked={(respostas[perguntaAtual.id]?.valores || []).includes(op.valor)} onChange={(e) => handleCheckboxChange(perguntaAtual.id, op.valor, e.target.checked)} />
                    <span>{op.label}</span>
                  </label>
                  {op.complemento && (
                    <input type="text" placeholder="Escreva aqui..." value={(respostas[perguntaAtual.id]?.valores || []).includes(op.valor) ? (respostas[perguntaAtual.id]?.complemento || "") : ""} onChange={(e) => setRespostas((prev) => ({ ...prev, [perguntaAtual.id]: { ...prev[perguntaAtual.id], complemento: e.target.value } }))} onFocus={() => handleCheckboxChange(perguntaAtual.id, op.valor, true)} style={inputComplemento} className="campo-fundo-claro" />
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 12 }}>
            <button type="button" onClick={anterior} style={btnAnterior}>Anterior</button>
            {passo < PERGUNTAS.length ? <button type="button" onClick={proximo} style={btnProximo}>Próxima</button> : <button type="button" onClick={enviar} disabled={enviando} style={btnEnviar}>{enviando ? "Enviando..." : "Gerar Diagnóstico"}</button>}
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: BORDER }}>
        <button type="button" onClick={() => navigate("/meus-diagnosticos")} style={{ ...btnAnterior, background: "transparent" }}>Ver meus diagnósticos</button>
      </div>
      <footer style={footer}>As informações fornecidas são confidenciais e serão utilizadas exclusivamente para o desenvolvimento do projeto RP Vista Pro.</footer>
    </div>
  );
}

const card = { background: "rgba(255,255,255,0.04)", border: BORDER, borderRadius: 8, padding: 24, marginBottom: 24 };
const labelRadio = { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#e6edf3", fontSize: "1rem" };
const labelCheckbox = { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#e6edf3", fontSize: "1rem" };
const inputComplemento = { padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "0.9375rem", minWidth: 120 };
const inputValor = { padding: "12px 16px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "1rem", maxWidth: 200 };
const btnAnterior = { padding: "12px 24px", borderRadius: 6, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer", fontSize: "0.9375rem" };
const btnProximo = { padding: "12px 24px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 700, cursor: "pointer", fontSize: "0.9375rem" };
const btnEnviar = { padding: "12px 28px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 700, cursor: "pointer", fontSize: "1rem" };
const footer = { marginTop: 40, padding: "16px 0", color: "#8b949e", fontSize: "0.8125rem", textAlign: "center", borderTop: BORDER };
