// src/pages/Comprador/RequisicaoEstoque.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

// 🎨 Paleta
const AZUL_FUNDO = "#0F2D3F";
const COR_SALMAO = "#FF8882";
const COR_LARANJA = "#F6A46A";
const COR_AZUL_CLARO = "#8BBBE6";
const COR_VERDE = "#25C19B";
const TEXTO_ESCURO = "#1F2E45";

const PRIORIDADES = ["Normal", "Urgente", "Planejada"];

export default function RequisicaoEstoque() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [enviando, setEnviando] = useState(false);

  const [requisicaoAtual, setRequisicaoAtual] = useState({
    setorOrigem: "Cozinha",
    prioridade: "Normal",
    observacoes: "",
    itens: [
      {
        produtoId: "",
        nome: "",
        unidade: "",
        quantidade: "",
      },
    ],
  });

  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
  const socketRef = useRef(null);

 // ------------------ CARREGAR USUÁRIO + PRODUTOS + REQUISIÇÕES ------------------
useEffect(() => {
  const usuarioRaw = sessionStorage.getItem("usuario");
  if (!usuarioRaw) {
    navigate("/login");
    return;
  }

  const dados = JSON.parse(usuarioRaw);
  const empresaId = dados.empresa || dados.compradorId || (dados.tipo === "comprador" ? dados._id : null);
  setUsuarioAtual({ ...dados, empresa: empresaId, compradorId: empresaId });

  async function carregarDadosIniciais() {
    if (!empresaId) {
      Swal.fire("Erro", "Usuário sem empresa associada.", "error");
      return;
    }
    try {
      // 🔥 Carregar CATÁLOGO da empresa
      const resCatalogo = await fetch(`${API_URL}/api/catalogos/${empresaId}`);
      const dataCatalogo = await resCatalogo.json();

      // Ajuste correto — pega APENAS o array de produtos
      const lista = Array.isArray(dataCatalogo.catalogo)
        ? dataCatalogo.catalogo
        : [];

      setProdutosEstoque(lista);

      // 🔥 Carregar histórico de requisições
      const resReq = await fetch(
        `${API_URL}/api/requisicao-estoque?empresa=${empresaId}&setorOrigem=Cozinha`
      );

      if (resReq.ok) {
        const reqData = await resReq.json();
        setRequisicoes(Array.isArray(reqData) ? reqData : []);
      }

    } catch (err) {
      console.error("❌ Erro ao carregar dados:", err);
      Swal.fire("Erro", "Não foi possível carregar os dados de requisição.", "error");
    }
  }

  carregarDadosIniciais();
}, []);
  // ------------------ SOCKET.IO (tempo real) ------------------
  useEffect(() => {
    if (!usuarioAtual) return;

    const socket = io(API_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // recebe atualização de status da requisição (ex: atendida, em separação)
    socket.on("requisicao_estoque_atualizada", (reqAtualizada) => {
      setRequisicoes((antigas) => {
        const idx = antigas.findIndex((r) => r._id === reqAtualizada._id);
        if (idx === -1) return antigas;
        const copia = [...antigas];
        copia[idx] = reqAtualizada;
        return copia;
      });

      // pequeno aviso visual
      Swal.fire({
        title: "Requisição atualizada!",
        text: `Status: ${reqAtualizada.status} | Nº ${reqAtualizada.numero || ""}`,
        icon: "info",
        timer: 2500,
        showConfirmButton: false,
      });
    });

    // recebe quando for criada uma nova (caso essa tela seja usada por outro setor também)
    socket.on("requisicao_estoque_nova", (novaReq) => {
      setRequisicoes((antigas) => [novaReq, ...antigas]);
    });

    return () => {
      socket.disconnect();
    };
  }, [usuarioAtual]);

  // ------------------ HANDLERS DA REQUISIÇÃO ------------------
  function atualizarCampoRequisicao(campo, valor) {
    setRequisicaoAtual((prev) => ({ ...prev, [campo]: valor }));
  }

  function atualizarItem(index, campo, valor) {
    setRequisicaoAtual((prev) => {
      const itens = [...prev.itens];
      const item = { ...itens[index] };

      if (campo === "produtoId") {
        item.produtoId = valor;
        const prod = produtosEstoque.find((p) => p._id === valor || p.id === valor);
        if (prod) {
          item.nome = prod.nome;
          item.unidade = prod.unidade || "";
        }
      } else {
        item[campo] = valor;
      }

      itens[index] = item;
      return { ...prev, itens };
    });
  }

  function adicionarLinhaItem() {
    setRequisicaoAtual((prev) => ({
      ...prev,
      itens: [
        ...prev.itens,
        { produtoId: "", nome: "", unidade: "", quantidade: "" },
      ],
    }));
  }

  function removerLinhaItem(index) {
    setRequisicaoAtual((prev) => {
      const itens = prev.itens.filter((_, i) => i !== index);
      return { ...prev, itens: itens.length ? itens : [{ produtoId: "", nome: "", unidade: "", quantidade: "" }] };
    });
  }

  async function enviarRequisicao() {
    const empresaId = usuarioAtual?.empresa || usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) {
      Swal.fire("Erro", "Usuário sem empresa associada.", "error");
      return;
    }

    // valida itens
    const itensValidos = requisicaoAtual.itens.filter(
      (i) => i.nome && Number(i.quantidade) > 0
    );

    if (!itensValidos.length) {
      Swal.fire(
        "Requisição vazia",
        "Adicione ao menos um item com quantidade maior que zero.",
        "info"
      );
      return;
    }

    setEnviando(true);

    const payload = {
      empresa: empresaId,
      setorOrigem: requisicaoAtual.setorOrigem || "Cozinha",
      criadoPor: usuarioAtual.nome || usuarioAtual.email,
      prioridade: requisicaoAtual.prioridade,
      observacoes: requisicaoAtual.observacoes,
      itens: itensValidos.map((i) => ({
        produtoId: i.produtoId || null,
        nome: i.nome,
        unidade: i.unidade,
        quantidade: Number(i.quantidade),
      })),
    };

    try {
      const res = await fetch(`${API_URL}/api/requisicao-estoque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar requisição");

      const novaReq = await res.json();

      setRequisicoes((antigas) => [novaReq, ...antigas]);

      // limpa formulário
      setRequisicaoAtual({
        setorOrigem: "Cozinha",
        prioridade: requisicaoAtual.prioridade,
        observacoes: "",
        itens: [{ produtoId: "", nome: "", unidade: "", quantidade: "" }],
      });

      Swal.fire(
        "Requisição enviada!",
        "O Estoquista recebeu sua requisição e poderá separar os produtos.",
        "success"
      );

      // em tempo real (cozinha → estoque), já emitido pelo backend idealmente
      if (socketRef.current) {
        socketRef.current.emit("requisicao_estoque_criada", novaReq);
      }
    } catch (err) {
      console.error("❌ Erro ao enviar requisição:", err);
      Swal.fire("Erro", "Não foi possível enviar a requisição de estoque.", "error");
    } finally {
      setEnviando(false);
    }
  }
async function carregarProdutosEstoque() {
  const empresaId = usuarioAtual?.empresa || usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  if (!empresaId) return;

  try {
    const res = await fetch(`${API_URL}/api/estoque/${empresaId}`);
    const data = await res.json();

    const lista = Array.isArray(data)
      ? data.filter((p) => Number(p.quantidade) > 0)
      : [];

    setProdutosEstoque(lista);
    Swal.fire("Sincronizado!", "Lista de produtos atualizada.", "success");
  } catch (err) {
    Swal.fire("Erro", "Não foi possível atualizar o estoque.", "error");
  }
}
  // ------------------ EXPORTAR HISTÓRICO PARA XLSX ------------------
  function exportarHistoricoXlsx() {
    if (!requisicoes.length) {
      Swal.fire("Nada para exportar", "Não há requisições no histórico.", "info");
      return;
    }

    const linhas = [];
    requisicoes.forEach((r) => {
      (r.itens || []).forEach((it) => {
        linhas.push({
          "Nº Requisição": r.numero || r._id,
          Data: new Date(r.createdAt || r.data || Date.now()).toLocaleString("pt-BR"),
          Setor: r.setorOrigem,
          Status: r.status || "Pendente",
          Prioridade: r.prioridade,
          Produto: it.nome,
          Quantidade: it.quantidade,
          Unidade: it.unidade,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requisicoes");
    XLSX.writeFile(wb, "requisicoes_estoque.xlsx");
  }

  // ------------------ IMPRIMIR ÚLTIMA REQUISIÇÃO ------------------
  function imprimirUltimaRequisicao() {
    if (!requisicoes.length) {
      Swal.fire("Nenhuma requisição", "Não há requisições para imprimir.", "info");
      return;
    }

    const req = requisicoes[0]; // última (mais recente)
    const janela = window.open("", "_blank", "width=800,height=600");

    const linhasItens = (req.itens || [])
      .map(
        (i) => `
      <tr>
        <td style="border:1px solid #ccc;padding:4px;">${i.nome}</td>
        <td style="border:1px solid #ccc;padding:4px;text-align:center;">${i.quantidade}</td>
        <td style="border:1px solid #ccc;padding:4px;">${i.unidade || ""}</td>
      </tr>`
      )
      .join("");

    janela.document.write(`
      <html>
        <head>
          <title>Requisição de Estoque</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Requisição de Estoque</h2>
          <p><b>Nº:</b> ${req.numero || req._id}</p>
          <p><b>Data:</b> ${new Date(req.createdAt || Date.now()).toLocaleString("pt-BR")}</p>
          <p><b>Setor:</b> ${req.setorOrigem}</p>
          <p><b>Prioridade:</b> ${req.prioridade}</p>
          <p><b>Observações:</b> ${req.observacoes || "-"}</p>
          <br/>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th style="border:1px solid #ccc;padding:4px;text-align:left;">Produto</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:center;">Quantidade</th>
                <th style="border:1px solid #ccc;padding:4px;text-align:left;">Unidade</th>
              </tr>
            </thead>
            <tbody>
              ${linhasItens}
            </tbody>
          </table>
          <br/><br/>
          <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div>
              ___________________________<br/>
              Assinatura do Solicitante
            </div>
            <div>
              ___________________________<br/>
              Assinatura do Estoquista
            </div>
          </div>
        </body>
      </html>
    `);

    janela.document.close();
    janela.print();
  }

  // ------------------ KPIs / DASHBOARD SIMPLES ------------------
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const kpis = useMemo(() => {
    const reqHoje = requisicoes.filter((r) => {
      const d = new Date(r.createdAt || r.data || Date.now());
      return d >= hoje;
    });

    const totalReqHoje = reqHoje.length;
    let totalItensHoje = 0;
    const mapaProdutos = {};

    reqHoje.forEach((r) => {
      (r.itens || []).forEach((it) => {
        totalItensHoje += Number(it.quantidade || 0);
        if (!mapaProdutos[it.nome]) mapaProdutos[it.nome] = 0;
        mapaProdutos[it.nome] += Number(it.quantidade || 0);
      });
    });

    const topProdutos = Object.entries(mapaProdutos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { totalReqHoje, totalItensHoje, topProdutos };
  }, [requisicoes]);

  // ------------------ FILTRO HISTÓRICO ------------------
  const requisicoesFiltradas = useMemo(() => {
    return requisicoes.filter((r) => {
      const matchStatus =
        filtroStatus === "todas" ||
        (r.status || "Pendente").toLowerCase() === filtroStatus.toLowerCase();
      const texto = (
        (r.numero || "") +
        " " +
        (r.setorOrigem || "") +
        " " +
        (r.observacoes || "")
      ).toLowerCase();

      const matchBusca = !buscaHistorico.trim()
        ? true
        : texto.includes(buscaHistorico.toLowerCase());

      return matchStatus && matchBusca;
    });
  }, [requisicoes, filtroStatus, buscaHistorico]);

  // ------------------ PRODUTOS FILTRADOS PARA AUTOCOMPLETE ------------------
  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.toLowerCase();
    if (!q) return produtosEstoque;
    return produtosEstoque.filter((p) =>
      (p.nome || "").toLowerCase().includes(q)
    );
  }, [produtosEstoque, buscaProduto]);

  // ------------------ RENDER ------------------
  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box" }}>
      <main style={mainWrap}>
        {/* KPIs */}
        <div style={kpiRow}>
          <div style={{ ...kpiCard, borderLeft: `4px solid ${COR_AZUL_CLARO}`, borderTop: "none" }}>
            <div style={kpiLabel}>Requisições Hoje</div>
            <div style={kpiValue}>{kpis.totalReqHoje}</div>
          </div>
          <div style={{ ...kpiCard, borderLeft: `4px solid ${COR_LARANJA}`, borderTop: "none" }}>
            <div style={kpiLabel}>Itens Solicitados Hoje</div>
            <div style={kpiValue}>{kpis.totalItensHoje}</div>
          </div>
          <div style={{ ...kpiCard, borderLeft: `4px solid ${COR_SALMAO}`, borderTop: "none" }}>
            <div style={kpiLabel}>Mais Solicitados Hoje</div>
            <div style={{ fontSize: "0.9375rem", color: "#8b949e" }}>
              {kpis.topProdutos.length === 0
                ? "—"
                : kpis.topProdutos
                    .map(([nome, qtd]) => `${nome} (${qtd})`)
                    .join(" • ")}
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE REQUISIÇÃO */}
        <section style={card}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Nova Requisição</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={requisicaoAtual.prioridade}
                onChange={(e) => atualizarCampoRequisicao("prioridade", e.target.value)}
                style={selectPrioridade}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Observações / Uso (opcional)</label>
            <textarea
              value={requisicaoAtual.observacoes}
              onChange={(e) =>
                atualizarCampoRequisicao("observacoes", e.target.value)
              }
              style={textarea}
              placeholder="Ex: Reposição almoço de domingo, evento, banquete, etc."
            />
          </div>

          {/* Busca de produtos */}
          <div style={{ marginBottom: 8 }}>
            <label style={label}>Buscar produto no estoque</label>
            <input
              type="text"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              style={inputBuscaProduto}
              placeholder="Digite parte do nome para facilitar a seleção…"
            />
          </div>

         {/* LISTA COMPLETA DE PRODUTOS DO ESTOQUE */}
<div style={{ marginTop: 8 }}>

  <button
    type="button"
    onClick={carregarProdutosEstoque}
    style={{
      background: "#8BBBE6",
      color: "#0B1C26",
      border: "none",
      marginBottom: 12,
      padding: "8px 12px",
      borderRadius: 8,
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    🔄 Sincronizar com estoque
  </button>

  <div style={{ maxHeight: 260, overflowY: "auto" }}>
    {produtosFiltrados.length === 0 ? (
      <p style={{ color: "#ccc", fontSize: 14 }}>
        Nenhum produto encontrado.
      </p>
    ) : (
      produtosFiltrados.map((prod) => (
        <div
          key={prod._id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 6px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {/* Nome do produto */}
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2E45" }}>
            {prod.nome}
          </div>

          {/* Quantidade + botão */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min="0"
              placeholder="Qtd"
              id={`qtd-${prod._id}`}
              style={{
                width: 70,
                padding: "6px",
                borderRadius: 8,
                border: "1px solid #ccc",
                textAlign: "center",
              }}
            />

            <button
              type="button"
              onClick={() => {
                const campo = document.getElementById(`qtd-${prod._id}`);
                const qtd = Number(campo.value);

                if (!qtd || qtd <= 0) {
                  Swal.fire("Quantidade inválida", "Informe um valor maior que zero.", "info");
                  return;
                }

                // adiciona item à requisição
                setRequisicaoAtual((prev) => ({
                  ...prev,
                  itens: [
                    ...prev.itens,
                    {
                      produtoId: prod._id,
                      nome: prod.nome,
                      unidade: prod.unidade || "",
                      quantidade: qtd,
                    },
                  ],
                }));

                campo.value = "";
              }}
              style={{
                background: "#25C19B",
                border: "none",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                color: "#0B1C26",
                fontWeight: 700,
              }}
            >
              ➕
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>

          {/* Ações da requisição */}
          <div style={acoesForm}>
            <button
              type="button"
              onClick={enviarRequisicao}
              style={{
                ...btnEnviar,
                opacity: enviando ? 0.7 : 1,
                cursor: enviando ? "wait" : "pointer",
              }}
              disabled={enviando}
            >
              {enviando ? "Enviando..." : "📤 Enviar Requisição para Estoque"}
            </button>

            <button type="button" onClick={imprimirUltimaRequisicao} style={btnImprimir}>
              🖨 Imprimir última requisição
            </button>

            <button type="button" onClick={exportarHistoricoXlsx} style={btnExportar}>
              ⬇️ Exportar histórico XLSX
            </button>
          </div>
        </section>

        {/* HISTÓRICO / STATUS */}
        <section style={{ ...card, marginTop: 16 }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Requisições Enviadas</h2>
          </div>

          {/* filtros */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ ...inputBase, maxWidth: 180 }}
            >
              <option value="todas">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em separacao">Em separação</option>
              <option value="atendida">Atendida</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <input
              type="text"
              placeholder="Buscar por número, setor ou observação…"
              value={buscaHistorico}
              onChange={(e) => setBuscaHistorico(e.target.value)}
              style={{ ...inputBase, flex: 1 }}
            />
          </div>

          {requisicoesFiltradas.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14 }}>Nenhuma requisição encontrada.</p>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {requisicoesFiltradas.map((r) => (
                <div key={r._id} style={linhaHistorico}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Nº {r.numero || r._id} • {r.setorOrigem}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {new Date(r.createdAt || r.data || Date.now()).toLocaleString(
                        "pt-BR"
                      )}{" "}
                      • {r.prioridade || "Normal"}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Itens:{" "}
                      {(r.itens || [])
                        .map((it) => `${it.nome} (${it.quantidade} ${it.unidade || ""})`)
                        .join(" • ")}
                    </div>
                    {r.observacoes && (
                      <div style={{ fontSize: 12, marginTop: 4, color: "#4b5563" }}>
                        Obs.: {r.observacoes}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={badgeStatus(r.status || "Pendente")}>
                      {r.status || "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ------------------ ESTILOS ------------------ */

const pageOuter = {
  background: AZUL_FUNDO,
  minHeight: "100vh",
  color: "#fff",
};

const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: AZUL_FUNDO,
  height: 66,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
};

const topLeft = { display: "flex", alignItems: "center", gap: 12 };
const helloText = { fontSize: "0.95rem", opacity: 0.95 };

const btnSair = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const btnGhost = {
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 600,
};

const mainWrap = {
  maxWidth: 1100,
  margin: "24px auto",
  padding: "0 20px 40px",
};

const title = {
  textAlign: "center",
  color: "#fff",
  marginBottom: 16,
  fontWeight: 900,
  fontSize: 24,
};

const kpiRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const kpiCard = {
  flex: 1,
  minWidth: 200,
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
};

const kpiLabel = {
  fontSize: "0.8125rem",
  textTransform: "uppercase",
  color: "#8b949e",
  letterSpacing: "0.04em",
  marginBottom: 6,
};

const kpiValue = {
  fontSize: "1.8rem",
  fontWeight: 700,
  color: "#e6edf3",
};

const card = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const sectionTitle = {
  fontSize: "1.125rem",
  color: "#e6edf3",
  fontWeight: 700,
};

const label = {
  display: "block",
  fontSize: "0.8125rem",
  marginBottom: 6,
  color: "#8b949e",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const textarea = {
  width: "100%",
  minHeight: 60,
  borderRadius: 8,
  border: BORDER,
  padding: 12,
  fontSize: "0.9375rem",
  outline: "none",
  resize: "vertical",
  background: "#fff",
  color: "#1a1a1a",
};

const inputBase = {
  height: 40,
  borderRadius: 8,
  border: BORDER,
  padding: "0 12px",
  outline: "none",
  background: "#fff",
  color: "#1a1a1a",
  fontSize: "0.9375rem",
  boxSizing: "border-box",
};

const inputBuscaProduto = {
  ...inputBase,
  width: "100%",
};

const linhaItem = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
  alignItems: "center",
};

const btnAddItem = {
  marginTop: 6,
  background: COR_AZUL_CLARO,
  color: "#0B1C26",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnRemoveItem = {
  background: COR_SALMAO,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 8px",
  cursor: "pointer",
  fontWeight: 700,
};

const acoesForm = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const btnEnviar = {
  background: COR_VERDE,
  color: "#0B1C26",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnImprimir = {
  background: COR_LARANJA,
  color: "#1E1E1E",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnExportar = {
  background: "rgba(255,255,255,0.1)",
  color: "#e6edf3",
  border: BORDER,
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const listaBox = {
  background: CARD_BG,
  border: BORDER,
  color: "#e6edf3",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
};

const btnVoltarEstoque = {
  background: "#162232",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};

const linhaHistorico = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px solid #E5E7EB",
};

const selectPrioridade = {
  ...inputBase,
  maxWidth: 160,
};

function badgeStatus(statusRaw) {
  const s = (statusRaw || "").toLowerCase();
  let bg = "#E5E7EB";
  let color = "#111827";

  if (s.includes("pend")) {
    bg = "#FEF3C7";
    color = "#92400E";
  } else if (s.includes("separ")) {
    bg = "#DBEAFE";
    color = "#1D4ED8";
  } else if (s.includes("atend")) {
    bg = "#DCFCE7";
    color = "#166534";
  } else if (s.includes("cancel")) {
    bg = "#FEE2E2";
    color = "#991B1B";
  }

  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    background: bg,
    color,
  };
}