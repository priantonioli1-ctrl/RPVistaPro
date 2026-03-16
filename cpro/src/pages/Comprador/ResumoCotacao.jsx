// src/pages/Comprador/ResumoCotacao.js
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { listarPedidos } from "../../services/api";
import Swal from "sweetalert2";

// ✅ Fallback de backend corrigido
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

// Rascunhos de resumo (pedidos em aberto) — salvos ao clicar em Salvar
const RASCUNHOS_KEY = "resumo_rascunhos_v1";

export function getRascunhosResumo() {
  try {
    const raw = localStorage.getItem(RASCUNHOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function salvarRascunhoResumo(pedidos, itensNaoEncontrados, totalGeral) {
  if (!Array.isArray(pedidos) || pedidos.length === 0) return null;
  const rascunho = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    pedidos: JSON.parse(JSON.stringify(pedidos)),
    itensNaoEncontrados: Array.isArray(itensNaoEncontrados) ? [...itensNaoEncontrados] : [],
    totalGeral: Number(totalGeral) || 0,
  };
  const lista = getRascunhosResumo();
  if (!Array.isArray(lista)) {
    console.warn("getRascunhosResumo retornou não-array, inicializando lista vazia");
    const novaLista = [rascunho];
    try {
      localStorage.setItem(RASCUNHOS_KEY, JSON.stringify(novaLista));
      return rascunho;
    } catch {
      return null;
    }
  }
  lista.unshift(rascunho);
  try {
    localStorage.setItem(RASCUNHOS_KEY, JSON.stringify(lista));
    return rascunho;
  } catch {
    return null;
  }
}

export function removerRascunhoResumo(id) {
  const lista = getRascunhosResumo().filter((r) => r.id !== id);
  try {
    localStorage.setItem(RASCUNHOS_KEY, JSON.stringify(lista));
  } catch {}
}

const keyify = (nome) =>
  (nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

function normUnit(u = "") {
  u = u.toLowerCase().trim();
  const map = {
    un: "un",
    unid: "un",
    unidade: "un",
    pc: "un",
    pcs: "un",
    pct: "pct",
    pacote: "pct",
    pac: "pct",
    cx: "cx",
    cxs: "cx",
    caixa: "cx",
    kg: "kg",
    kgs: "kg",
    g: "g",
    gr: "g",
    l: "l",
    lt: "l",
    lts: "l",
    ml: "ml",
  };
  u = u.replace(/\d+.*$/, "").replace(/[^a-z]/g, "");
  return map[u] || u;
}

export default function ResumoCotacao() {
  const [pedidos, setPedidos] = useState([]);
  const [itensNaoEncontrados, setItensNaoEncontrados] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);
  const [expandido, setExpandido] = useState({});
  const [gerando, setGerando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();


  function recalcTotal(novosPedidos) {
    return (novosPedidos || []).reduce(
      (sum, p) => sum + (Number(p.total) || 0),
      0
    );
  }

  function nomesParecidos(nomeA, nomeB) {
    if (!nomeA || !nomeB) return false;
    const limpar = (str) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const a = limpar(nomeA);
    const b = limpar(nomeB);
    if (a === b) return true;
    const palavrasA = new Set(a.split(" "));
    const palavrasB = new Set(b.split(" "));
    const intersecao = [...palavrasA].filter((p) => palavrasB.has(p));
    const percentual =
      intersecao.length / Math.max(palavrasA.size, palavrasB.size);
    return percentual >= 0.9;
  }

  async function gerarResumo() {
    setGerando(true);
    try {
    console.log("🧩 Iniciando geração do resumo da cotação...");
    let cotacao = [];

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    const empresaId = usuario?.compradorId || usuario?.empresa || (usuario?.tipo === "comprador" ? usuario?._id : null);

    try {
      console.log("📥 Buscando itens de cotação do backend...");
      const url = empresaId
        ? `${BASE_URL}/api/itens-cotacao/empresa/${empresaId}`
        : `${BASE_URL}/api/itens-cotacao`;
      const respItens = await fetch(url);
      if (!respItens.ok)
        throw new Error(`Erro ao buscar itens da cotação: ${respItens.statusText}`);
      const dados = await respItens.json();
      cotacao = Array.isArray(dados) ? dados : [];
      console.log(`✅ ${cotacao.length} itens de cotação recebidos.`);
    } catch (erro) {
      console.warn("⚠️ Erro ao recuperar itens da cotação:", erro);
      cotacao = [];
    }

    cotacao = cotacao.map((item) => ({
      nome: item.nome || item.name || "",
      unidade: item.unidade || item.unit || "",
      qtd: Number(item.qtd || item.qty || 1),
    }));

    if (cotacao.length === 0) {
      setGerando(false);
      alert("Nenhum item de cotação encontrado no servidor.");
      return;
    }

    const fornecedores = [];
    try {
      console.log("📦 Buscando catálogos de fornecedores com preços...");
      const resposta = await fetch(`${BASE_URL}/api/catalogos-fornecedores?comDisponibilidade=1`);
      if (!resposta.ok)
        throw new Error(`Falha ao buscar catálogos: ${resposta.statusText}`);
      const lista = await resposta.json();
      if (Array.isArray(lista) && lista.length > 0) {
        lista.forEach((f) => {
          if (f.empresa && Array.isArray(f.catalogo)) {
            fornecedores.push({
              nome: f.empresa,
              fornecedorId: keyify(f.empresa),
              aliquota: f.aliquota != null ? Number(f.aliquota) : null,
              estadoSigla: f.estadoSigla || "",
              lista: f.catalogo.map((item) => ({
                nome: item.nome?.trim() || "",
                unidade: item.unidade?.trim() || "",
                preco: Number(item.preco) || 0,
                disponivel: Number(item.disponivel) ?? 0,
              })),
            });
          }
        });
      }
    } catch (err) {
      console.error("❌ Erro ao buscar catálogos de fornecedores:", err);
      setGerando(false);
      alert("Não foi possível conectar ao servidor. Verifique o backend.");
      return;
    }

    const mapaPedidos = {};
    const naoEncontrados = [];

    for (const item of cotacao) {
      let melhorFornecedor = null;
      let melhorPreco = Infinity;

      for (const f of fornecedores) {
        let produto = f.lista.find(
          (p) =>
            nomesParecidos(p.nome, item.nome) &&
            (!normUnit(item.unidade) ||
              normUnit(p.unidade) === normUnit(item.unidade))
        );
        if (!produto)
          produto = f.lista.find((p) => nomesParecidos(p.nome, item.nome));
        if (produto && produto.preco > 0 && produto.preco < melhorPreco) {
          melhorPreco = produto.preco;
          melhorFornecedor = f.nome;
        }
      }

      if (melhorFornecedor) {
        let produtoMelhor = null;
        for (const f of fornecedores) {
          if (f.nome !== melhorFornecedor) continue;
          let p = f.lista.find(
            (x) =>
              nomesParecidos(x.nome, item.nome) &&
              (!normUnit(item.unidade) || normUnit(x.unidade) === normUnit(item.unidade))
          );
          if (!p) p = f.lista.find((x) => nomesParecidos(x.nome, item.nome));
          if (p && p.preco === melhorPreco) {
            produtoMelhor = p;
            break;
          }
        }
        const disponivel = produtoMelhor ? (Number(produtoMelhor.disponivel) ?? 0) : 0;
        const qtd = item.qtd || 1;
        const emFalta = disponivel <= 0 || disponivel < qtd;
        const fObj = fornecedores.find((x) => x.nome === melhorFornecedor);
        const aliquotaFornec = fObj?.aliquota ?? null;
        if (!mapaPedidos[melhorFornecedor])
          mapaPedidos[melhorFornecedor] = { produtos: [], aliquota: aliquotaFornec };
        mapaPedidos[melhorFornecedor].produtos.push({
          nome: item.nome,
          unidade: item.unidade,
          qtd,
          preco: melhorPreco,
          total: qtd * melhorPreco,
          fornecedor: melhorFornecedor,
          emFalta,
          disponivel,
        });
      } else {
        naoEncontrados.push(item);
      }
    }

    const resumoFinal = Object.keys(mapaPedidos).map((fornecedor) => {
      const dados = mapaPedidos[fornecedor];
      const produtos = dados.produtos || dados;
      const aliquota = dados.aliquota ?? (Array.isArray(dados) ? null : dados.aliquota);
      const total = produtos.reduce((s, p) => s + (p.total || 0), 0);
      const icmsARecuperar = aliquota != null ? total * aliquota / (100 + aliquota) : 0;
      return {
        fornecedor,
        produtos,
        qtdProdutos: produtos.length,
        total,
        aliquota,
        icmsARecuperar,
      };
    });

    const somaTotalGeral = resumoFinal.reduce((s, r) => s + (r.total || 0), 0);
    setPedidos(resumoFinal);
    setItensNaoEncontrados(naoEncontrados);
    setTotalGeral(somaTotalGeral);
    salvarRascunhoResumo(resumoFinal, naoEncontrados, somaTotalGeral);
    } finally {
      setGerando(false);
    }
  }

  useEffect(() => {
    const draft = location.state?.loadDraft;
    if (draft && draft.pedidos && Array.isArray(draft.pedidos)) {
      setPedidos(draft.pedidos);
      setItensNaoEncontrados(draft.itensNaoEncontrados || []);
      setTotalGeral(Number(draft.totalGeral) || 0);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    gerarResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on mount; gerarResumo is stable
  }, []);

  useEffect(() => {
    listarPedidos().catch((erro) =>
      console.error("Erro ao buscar pedidos:", erro)
    );
  }, []);

  const toggleExpandir = (fornecedor) => {
    setExpandido((prev) => ({
      ...prev,
      [fornecedor]: !prev[fornecedor],
    }));
  };

  function removerProduto(fornecedor, index, expandido) {
    const confirmacao = window.confirm("Deseja remover este produto?");
    if (!confirmacao) return;

    const novosPedidos = pedidos.map((p) => {
      if (p.fornecedor !== fornecedor) return p;
      const novosProdutos = p.produtos.filter((_, i) => i !== index);
      const novoTotal = novosProdutos.reduce(
        (s, prod) => s + (Number(prod.total) || 0),
        0
      );
      const novoIcmsARecuperar = p.aliquota != null ? novoTotal * p.aliquota / (100 + p.aliquota) : 0;
      return {
        ...p,
        produtos: novosProdutos,
        total: novoTotal,
        icmsARecuperar: novoIcmsARecuperar,
        qtdProdutos: novosProdutos.length,
      };
    });
    setPedidos(novosPedidos.filter((p) => p.produtos.length > 0));
    setTotalGeral(recalcTotal(novosPedidos));
  }

  async function handleEnviar(pedidoAlvo) {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    const empresaId = usuario?.compradorId || usuario?.empresa || (usuario?.tipo === "comprador" ? usuario?._id : null);
    const clienteNome = usuario?.nome || empresaId || "Comprador";
    if (!empresaId) {
      alert("Usuário não identificado.");
      return;
    }

    const confirmacao = await Swal.fire({
      title: "Confirmar envio?",
      text: "Deseja realmente enviar este pedido?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Não",
      confirmButtonColor: "#27ae60",
      cancelButtonColor: "#e74c3c",
    });

    if (!confirmacao.isConfirmed) return;

    for (const fornecedor of Object.keys({ [pedidoAlvo.fornecedor]: true })) {
      const produtosFornecedor = pedidoAlvo.produtos;
      const total = produtosFornecedor.reduce(
        (acc, p) => acc + (parseFloat(p.preco) || 0) * (parseFloat(p.qtd) || 1),
        0
      );

      const resposta = await fetch(`${BASE_URL}/api/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          clienteNome,
          fornecedor,
          itens: produtosFornecedor.map((p) => ({
            nome: p.nome,
            unidade: p.unidade || "un",
            quantidade: p.qtd,
            precoUnitario: p.preco,
          })),
          total,
          status: "Enviado",
        }),
      });

      if (!resposta.ok)
        throw new Error(`Erro ao enviar pedido para ${fornecedor}`);
    }

    await Swal.fire({
      title: "Pedido enviado com sucesso!",
      text: "Deseja visualizar este pedido agora?",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Não",
    }).then((res) => res.isConfirmed && navigate("/meus-pedidos"));

    setPedidos((prev) =>
      prev.filter((p) => p.fornecedor !== pedidoAlvo.fornecedor)
    );
  }

  return (
    <div className="layout-content-inner" style={page}>
      {gerando && pedidos.length === 0 ? (
        <p style={{ color: "#8b949e" }}>Carregando...</p>
      ) : pedidos.length === 0 && itensNaoEncontrados.length === 0 ? (
        <p style={{ color: "#8b949e" }}>Nenhum pedido encontrado. Volte em Nova Cotação, adicione itens e clique em &quot;Gerar resumo&quot; para salvar em Meus Pedidos (Em aberto).</p>
      ) : (
        pedidos.map((p, i) => {
          const estaExpandido = !!expandido[p.fornecedor];
          const listaParaMostrar = estaExpandido
            ? p.produtos
            : (p.produtos || []).slice(0, 2);
          const temMais = (p.produtos?.length || 0) > 2;

          return (
            <div key={i} className="card-panel" style={cardStyle}>
              <div style={cardHeader}>
                <div>
                  <strong style={{ textTransform: "uppercase" }}>{p.fornecedor}</strong>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#ccc" }}>
                    {p.qtdProdutos} produto(s)
                    {p.aliquota != null && (
                      <span style={{ marginLeft: 8 }}> • ICMS {p.aliquota}%</span>
                    )}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div><b>Total:</b> R$ {(Number(p.total) || 0).toFixed(2)}</div>
                  {p.aliquota != null && p.icmsARecuperar != null && p.icmsARecuperar > 0 && (
                    <div style={{ fontWeight: 600, color: "#27ae60", marginTop: 4, fontSize: "0.9rem" }}>
                      ICMS a recuperar: R$ {Number(p.icmsARecuperar).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div style={produtosBox}>
                {listaParaMostrar.map((prod, idx) => (
                  <div key={idx} style={produtoLinha}>
                    <span
                      onClick={() =>
                        removerProduto(p.fornecedor, idx, estaExpandido)
                      }
                      style={xRemover}
                      title="Remover produto"
                    >
                      ❌
                    </span>
                    <span>
                      {prod.nome} — {prod.qtd}x R$
                      {Number(prod.preco).toFixed(2)}
                      {prod.emFalta && (
                        <span style={{ marginLeft: 8, color: "#F6A46A", fontWeight: 600, fontSize: "0.85rem" }} title="Fornecedor sem estoque suficiente">
                          (Em falta)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {temMais && (
                  <button
                    onClick={() => toggleExpandir(p.fornecedor)}
                    style={btnVerMais}
                  >
                    {estaExpandido ? "Ver menos ▲" : "Ver mais ▼"}
                  </button>
                )}
              </div>

              <div style={acoes}>
                <button onClick={() => handleEnviar(p)} style={btnEnviar}>
                  🚀 Enviar
                </button>
              </div>
            </div>
          );
        })
      )}

      {pedidos.length > 0 && (
        <div style={totalBox}>
          <div><strong>Total geral: R$ {totalGeral.toFixed(2)}</strong></div>
          {(() => {
            const totalIcms = pedidos.reduce((s, p) => s + (Number(p.icmsARecuperar) || 0), 0);
            return totalIcms > 0 ? (
              <div style={{ color: "#27ae60", marginTop: 4 }}>ICMS a recuperar (total): R$ {totalIcms.toFixed(2)}</div>
            ) : null;
          })()}
        </div>
      )}

    </div>
  );
}

/* --- ESTILOS (padrão das outras páginas) --- */
const BORDER = "1px solid rgba(255,255,255,0.08)";
const page = { width: "100%", maxWidth: "none", padding: 0, boxSizing: "border-box", color: "#e6edf3" };
const cardStyle = { padding: "20px 24px", marginBottom: 16 };
const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: BORDER,
  paddingBottom: 10,
  color: "#e6edf3",
};
const produtosBox = { marginTop: 12 };
const produtoLinha = { display: "flex", alignItems: "center", marginBottom: 8, gap: 8, color: "#e6edf3" };
const xRemover = { color: "#f85149", cursor: "pointer", fontWeight: "bold" };
const btnVerMais = { background: "none", color: "var(--accent)", border: "none", cursor: "pointer" };
const acoes = { marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 };
const btnEnviar = {
  background: "var(--gradient-neon-cyan)",
  color: "#0F011E",
  border: "none",
  borderRadius: 4,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const totalBox = {
  textAlign: "right",
  fontSize: "1.1em",
  padding: "12px 0",
  borderTop: BORDER,
  color: "#e6edf3",
};