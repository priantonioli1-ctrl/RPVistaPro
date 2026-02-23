// src/pages/Comprador/Estoque.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listarEstoque,
  registrarEntradaEstoque,
  criarCatalogo, // caso queira atualizar catálogo
} from "../../services/api";
import Swal from "sweetalert2";

export default function Estoque() {
  const [estoque, setEstoque] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [entrada, setEntrada] = useState({
    produto: "",
    quantidade: "",
    fornecedor: "",
    nf: "",
  });
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const saveEstoqueTimeoutRef = useRef(null);
  const estoqueParaSalvarRef = useRef(null);

const API_URL = process.env.REACT_APP_API_URL || "";
// ------------------ CARREGAR CATÁLOGO + ESTOQUE DO BACKEND ------------------
useEffect(() => {
const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

if (!usuario) {
  Swal.fire("Erro", "Usuário não está logado.", "error");
  navigate("/login");
  return;
}

const compradorId = usuario.compradorId || (usuario.tipo === "comprador" ? usuario._id : null);
if (!compradorId) {
  Swal.fire("Erro", "Nenhuma empresa associada ao usuário.", "error");
  return;
}

setUsuarioAtual({ ...usuario, compradorId });

  // Cria uma função isolada para evitar loop
  const carregarDados = async () => {
    try {
      console.log("🔄 Carregando catálogo e estoque para:", compradorId);

      // 1️⃣ Carrega o catálogo base do comprador
      const urlCatalogo = `${API_URL || (typeof window !== "undefined" ? window.location.origin : "")}/api/catalogos/${compradorId}`;
      const resCatalogo = await fetch(urlCatalogo);
      const catalogoData = await resCatalogo.json();

      // 2️⃣ Extrai a lista corretamente
      const lista =
        Array.isArray(catalogoData)
          ? catalogoData
          : Array.isArray(catalogoData.catalogo)
          ? catalogoData.catalogo
          : Array.isArray(catalogoData.itens)
          ? catalogoData.itens
          : [];

      setCatalogo(lista);

      // 3️⃣ Busca o estoque do backend (sincronizado com o catálogo no servidor)
      const urlEstoque = `${API_URL || (typeof window !== "undefined" ? window.location.origin : "")}/api/estoque/${compradorId}`;
      const resEstoque = await fetch(urlEstoque, { cache: "no-store" });
      const estoqueData = await resEstoque.json();

      // 4️⃣ Se o estoque vier vazio, cria a partir do catálogo
      const estoqueAtualizado =
  Array.isArray(estoqueData) && estoqueData.length > 0
    ? estoqueData
    : lista.map((item) => ({
        nome: item.nome,
        unidade: item.unidade || "un",
        quantidade: 0,
        minimo: 0,
        maximo: 0,           // 🆕 novo campo
        emTransito: 0,
        contagemReal: 0,
        ultimaAtualizacao: "",
      }));
            // Se o estoque estiver vazio e o catálogo tiver produtos, recria automaticamente
if ((!estoqueData || estoqueData.length === 0) && lista.length > 0) {
  console.log("⚙️ Estoque vazio detectado — reconstruindo a partir do catálogo...");
  await reconstruirEstoqueDoCatalogo();
  return; // evita carregar duplicado
}
// 🔹 Carregar fornecedores do backend
try {
  const token = sessionStorage.getItem("token");
  const resFornecedores = await fetch(`${API_URL}/api/usuarios`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const usuarios = await resFornecedores.json();

  const listaFornecedores = usuarios.filter(
    (u) => u.tipo && u.tipo.toLowerCase() === "fornecedor"
  );

  setFornecedores(listaFornecedores);
  console.log(`📦 ${listaFornecedores.length} fornecedores carregados.`);
} catch (err) {
  console.error("❌ Erro ao carregar fornecedores:", err);
}
      setEstoque(estoqueAtualizado);

      console.log(`✅ Estoque carregado (${estoqueAtualizado.length} itens).`);
    } catch (err) {
      console.error("❌ Erro ao carregar catálogo ou estoque:", err);
      alert("Erro ao carregar dados do servidor.");
    }
  };

  carregarDados();
}, []); // ⚠️ sem dependências — roda apenas uma vez ao montar

  // ------------------ REFETCH ESTOQUE (para exibir contagem real atualizada) ------------------
  const refetchEstoque = useCallback(async () => {
    const compradorId = usuarioAtual?.compradorId;
    if (!compradorId) return;
    try {
      const base = API_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const resEstoque = await fetch(`${base}/api/estoque/${compradorId}?t=${Date.now()}`, { cache: "no-store" });
      const estoqueData = await resEstoque.json();
      if (Array.isArray(estoqueData)) setEstoque(estoqueData);
    } catch (err) {
      console.error("Erro ao atualizar estoque:", err);
    }
  }, [usuarioAtual?.compradorId]);

  // Ao voltar para esta aba do navegador, recarrega (ex.: salvou contagem noutra aba)
  useEffect(() => {
    if (!usuarioAtual?.compradorId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refetchEstoque();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [usuarioAtual?.compradorId, refetchEstoque]);

  // Sempre que estiver na rota /estoque com usuário definido, recarrega estoque (ex.: voltou da Contagem de Estoque)
  useEffect(() => {
    if (location.pathname !== "/estoque" || !usuarioAtual?.compradorId) return;
    refetchEstoque();
  }, [location.pathname, usuarioAtual?.compradorId, refetchEstoque]);

  // ------------------ RECONSTRUIR ESTOQUE A PARTIR DO CATÁLOGO ------------------
async function reconstruirEstoqueDoCatalogo() {
  if (!usuarioAtual?.compradorId) return;

  try {
    console.log("🔁 Reconstruindo estoque a partir do catálogo para:", usuarioAtual.compradorId);

    // 1️⃣ Buscar catálogo do backend
    const resCatalogo = await fetch(`${API_URL}/api/catalogos/${usuarioAtual.compradorId}`);
    const catalogoData = await resCatalogo.json();

    // 2️⃣ Extrair lista de produtos do catálogo
    const lista =
      Array.isArray(catalogoData)
        ? catalogoData
        : Array.isArray(catalogoData.catalogo)
        ? catalogoData.catalogo
        : Array.isArray(catalogoData.itens)
        ? catalogoData.itens
        : [];

    if (!lista.length) {
      Swal.fire("Aviso", "O catálogo está vazio. Nenhum produto encontrado.", "info");
      return;
    }

    // 3️⃣ Montar o novo estoque com base nos itens do catálogo
    const novoEstoque = lista.map((item) => ({
  nome: item.nome,
  unidade: item.unidade || "un",
  quantidade: 0,
  minimo: 0,
  maximo: 0,           // 🆕 aqui também
  emTransito: 0,
  contagemReal: 0,
  ultimaAtualizacao: "",
}));

    // 4️⃣ Salvar no backend
    const resSalvar = await fetch(`${API_URL}/api/estoque/${usuarioAtual.compradorId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens: novoEstoque }),
    });

    if (!resSalvar.ok) throw new Error("Erro ao salvar novo estoque.");

    // 5️⃣ Atualizar no estado do React
    setEstoque(novoEstoque);
    Swal.fire("Estoque reconstruído!", "Todos os produtos foram carregados do catálogo.", "success");
    console.log(`✅ Estoque recriado com ${novoEstoque.length} produtos.`);
  } catch (err) {
    console.error("❌ Erro ao reconstruir estoque:", err);
    Swal.fire("Erro", "Não foi possível reconstruir o estoque com base no catálogo.", "error");
  }
}
  async function persistirEstoque(itens) {
    if (!usuarioAtual?.compradorId || !Array.isArray(itens)) return;
    try {
      const res = await fetch(`${API_URL || window.location.origin}/api/estoque/${usuarioAtual.compradorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens }),
      });
      if (!res.ok) throw new Error("Erro ao salvar estoque.");
    } catch (err) {
      console.error("Erro ao salvar estoque:", err);
      Swal.fire("Erro", "Não foi possível salvar as alterações no servidor.", "error");
    }
  }

  // Atualizar campo e agendar salvamento automático (debounce)
  function atualizarCampo(index, campo, valor) {
    const novo = [...estoque];
    novo[index][campo] = valor;

    if (campo === "contagemReal") {
      novo[index].ultimaAtualizacao = new Date().toLocaleString("pt-BR");
    }

    setEstoque(novo);
    estoqueParaSalvarRef.current = novo;
    if (saveEstoqueTimeoutRef.current) clearTimeout(saveEstoqueTimeoutRef.current);
    saveEstoqueTimeoutRef.current = setTimeout(() => {
      persistirEstoque(estoqueParaSalvarRef.current);
    }, 600);
  }

  // ------------------ REGISTRAR ENTRADA DE PRODUTO ------------------
  async function registrarEntrada(e) {
    e.preventDefault();

    if (!entrada.produto || !entrada.quantidade || !entrada.fornecedor || !entrada.nf) {
      alert("Preencha todos os campos antes de registrar a entrada.");
      return;
    }

    try {
      await registrarEntradaEstoque(usuarioAtual.compradorId, entrada);
      alert("Entrada registrada com sucesso!");
      setEntrada({ produto: "", quantidade: "", fornecedor: "", nf: "" });

      // Recarrega estoque atualizado
      const estoqueData = await listarEstoque(usuarioAtual.compradorId);
      setEstoque(estoqueData);
    } catch (err) {
      console.error("Erro ao registrar entrada:", err);
      alert("Erro ao registrar entrada no servidor.");
    }
  }

  // ------------------ STATUS VISUAL (bolinhas) — só na página Estoque, não na Contagem de Estoque
  function getStatus(produto) {
    const qtd = Number(produto.quantidade) || 0;
    const minimo = Number(produto.minimo) || 0;
    const emTransito = Number(produto.emTransito) || 0;
    const totalPrevisto = qtd + emTransito;
    if (totalPrevisto <= minimo) return "#e74c3c";
    if (totalPrevisto <= minimo * 1.5) return "#f1c40f";
    return "#27ae60";
  }

  function getConferenciaIcon(produto) {
    const qtd = Number(produto.quantidade) || 0;
    const contagem = Number(produto.contagemReal) || 0;
    if (contagem === 0) return null;
    return qtd === contagem ? (
      <span style={{ color: "green", fontSize: 18, marginLeft: 8 }}>✔</span>
    ) : (
      <span style={{ color: "red", fontSize: 18, marginLeft: 8 }}>❌</span>
    );
  }

  async function gerarCotacao() {
 const itensParaCotacao = estoque
  .filter((item) => {
    const qtd = Number(item.quantidade) || 0;
    const minimo = Number(item.minimo) || 0;
    const emTransito = Number(item.emTransito) || 0;
    const totalPrevisto = qtd + emTransito;

    // entra na cotação se mesmo somando o que está a caminho
    // ainda está no mínimo ou abaixo
    return minimo > 0 && totalPrevisto <= minimo;
  })
  .map((item) => {
    const qtd = Number(item.quantidade) || 0;
    const minimo = Number(item.minimo) || 0;
    const maximo = Number(item.maximo) || 0;
    const emTransito = Number(item.emTransito) || 0;

    const totalPrevisto = qtd + emTransito;

    let quantidadeSugerida = 0;

    if (maximo > 0) {
      // 🧠 regra principal: compra o que falta para chegar no máximo
      quantidadeSugerida = maximo - totalPrevisto;
    } else {
      // fallback: se não tiver máximo, repõe até 2x o mínimo
      quantidadeSugerida = minimo * 2 - totalPrevisto;
    }

    if (quantidadeSugerida < 0) quantidadeSugerida = 0;

    return {
      ...item,
      quantidadeSugerida,
    };
  })
  .filter((item) => item.quantidadeSugerida > 0); // garante que só entra se tiver algo a comprar

  if (itensParaCotacao.length === 0) {
    Swal.fire("Tudo em ordem!", "Nenhum produto atingiu o estoque mínimo.", "info");
    return;
  }

  // 🔸 Armazena temporariamente no localStorage para o resumo usar
sessionStorage.setItem("itensCotacao", JSON.stringify(itensParaCotacao));
  // 🔸 Mostra uma prévia e redireciona
  const listaHtml = itensParaCotacao
    .map(
      (i) =>
        `<li><b>${i.nome}</b> — Atual: ${i.quantidade} ${i.unidade} (mínimo: ${i.minimo})</li>`
    )
    .join("");

  Swal.fire({
    title: "Produtos abaixo do estoque mínimo:",
    html: `<ul style='text-align:left'>${listaHtml}</ul>`,
    confirmButtonText: "Gerar Resumo de Cotação",
    confirmButtonColor: "#20b5a6",
  }).then((r) => {
    if (r.isConfirmed) {
      // 🔹 Redireciona para a página de Resumo
      navigate("/resumo-cotacao");
    }
  });
}
if (!usuarioAtual) {
  return <div style={{ color: "white", padding: 20 }}>Carregando...</div>;
}
  // ------------------ RENDER ------------------
  return (
    <div className="layout-content-inner" style={{ maxWidth: "100%", margin: 0, color: "#e6edf3" }}>
      <main style={mainWrap}>
{/* ---------- BOTÕES SUPERIORES (CENTRALIZADOS) ---------- */}
<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: 20,
  }}
>
</div>        {/* --- FORMULÁRIO DE ENTRADA --- */}
        <div style={entradaBox}>
          <h2 style={{ color: "#e6edf3", marginBottom: 16, fontSize: "1.25rem", fontWeight: 700 }}>Entrada de Produtos</h2>

          <form
            onSubmit={registrarEntrada}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, alignItems: "center" }}
          >
            <select
              value={entrada.produto}
              onChange={(e) => setEntrada({ ...entrada, produto: e.target.value })}
              style={inputSelect}
            >
              <option value="">Selecione o produto</option>
              {Array.isArray(catalogo) && catalogo.map((p, i) => (
  <option key={i} value={p.nome}>
    {p.nome}
  </option>
))}
            </select>

            <input
              type="number"
              placeholder="Qtd recebida"
              value={entrada.quantidade}
              onChange={(e) => setEntrada({ ...entrada, quantidade: e.target.value })}
              style={inputSmall}
            />

          <select
  value={entrada.fornecedor}
  onChange={(e) => {
    const val = e.target.value;
    if (val === "__novo__") {
      Swal.fire("Cadastre o fornecedor na tela de cadastro.");
      return;
    }
    setEntrada({ ...entrada, fornecedor: val });
  }}
  style={inputSmall}
>
  <option value="">Selecione o fornecedor</option>
  {fornecedores.map((f) => (
    <option key={f._id || f.nome} value={f.empresa || f.nome}>
      {f.empresa || f.nome}
    </option>
  ))}
  <option value="__novo__">+ Adicionar novo fornecedor...</option>
</select>

            <input
              type="text"
              placeholder="N° da NF"
              value={entrada.nf}
              onChange={(e) => setEntrada({ ...entrada, nf: e.target.value })}
              style={inputSmall}
            />

            <button type="submit" style={{ ...btnEntrada, marginLeft: "auto" }}>
              Confirmar Entrada
            </button>
          </form>
        </div>
<div style={{ textAlign: "right", marginBottom: 20 }}>
  
</div>
        {estoque.length === 0 ? (
          <p style={{ textAlign: "center", color: "#8b949e", fontStyle: "italic", fontSize: "1.0625rem" }}>Nenhum item encontrado no catálogo.</p>
        ) : (
          <div id="tabela-estoque" style={tabelaBox}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Status</th>
                  <th style={th}>Produto</th>
                  <th style={th}>Unidade</th>
                  <th style={th}>Quantidade Atual</th>
                  <th style={th}>Mínimo</th>
                  <th style={th}>Máximo</th>
                  <th style={th}>Em Trânsito</th>
                  <th style={th}>Contagem Real</th>
                  <th style={th}>Última Atualização</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: getStatus(p),
                        }}
                      />
                    </td>
                    <td style={td}>{p.nome}</td>
                    <td style={td}>{p.unidade}</td>
                    <td style={td}>{p.quantidade}</td>
                    <td style={td}>
                      <input
                        type="number"
                        value={p.minimo}
                        onChange={(e) =>
                          atualizarCampo(i, "minimo", e.target.value)
                        }
                        style={inputNum}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        value={p.maximo ?? ""}
                        onChange={(e) => atualizarCampo(i, "maximo", e.target.value)}
                        style={inputNum}
                      />
                    </td>
                    <td style={td}>
                      <span
                        title="Preenchido automaticamente pelos pedidos aprovados pelo fornecedor. Não editável."
                        style={{
                          display: "inline-block",
                          minWidth: 44,
                          padding: "6px 8px",
                          textAlign: "center",
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: 4,
                          color: "#e6edf3",
                          fontWeight: 500,
                        }}
                      >
                        {Number(p.emTransito) || 0}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span
                          title="Preenchido pela página Contagem de Estoque (somente estoquista)."
                          style={{
                            display: "inline-block",
                            minWidth: 44,
                            padding: "6px 8px",
                            textAlign: "center",
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: 4,
                            color: "#e6edf3",
                            fontWeight: 500,
                          }}
                        >
                          {p.contagemReal != null && p.contagemReal !== "" ? Number(p.contagemReal) : "-"}
                        </span>
                        {getConferenciaIcon(p)}
                      </div>
                    </td>
                    <td style={td}>{p.ultimaAtualizacao || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------ ESTILOS (iguais aos anteriores) ------------------ */
const pageOuter = { background: "#0F2D3F", minHeight: "100vh", color: "#fff" };
const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#0F2D3F",
  height: 66,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
};
const topLeft = { display: "flex", alignItems: "center", gap: 14 };
const helloText = { fontSize: "1rem", opacity: 0.95 };
const btnSair = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const mainWrap = { maxWidth: 1280, margin: "24px auto", padding: "0 20px 40px" };
const title = { textAlign: "center", color: "#fff", marginBottom: 20, fontWeight: 1000 };
const btnVoltar = {
  background: "#162232",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnIrEstoque = {
  background: "var(--gradient-btn-orange)",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};
const BORDER = "1px solid rgba(255,255,255,0.08)";

const entradaBox = {
  padding: 20,
  marginBottom: 24,
  color: "#e6edf3",
  background: "transparent",
  borderBottom: BORDER,
};
const inputSelect = {
  flex: 2,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "transparent",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};
const inputSmall = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "transparent",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};
const btnEntrada = {
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  border: "none",
  borderRadius: 4,
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: 600,
};
const tabelaBox = {
  overflowX: "auto",
  marginBottom: 24,
};
const table = { width: "100%", borderCollapse: "collapse", background: "transparent" };
const th = { 
  background: "transparent", 
  color: "#8b949e", 
  padding: 12, 
  borderBottom: BORDER,
  textTransform: "uppercase",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  fontWeight: 600,
};
const td = { 
  padding: 12, 
  borderBottom: BORDER, 
  textAlign: "center", 
  color: "#e6edf3" 
};
const inputNum = { 
  width: "60px", 
  padding: "6px 8px", 
  textAlign: "center", 
  borderRadius: 4, 
  border: BORDER,
  background: "transparent",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};
