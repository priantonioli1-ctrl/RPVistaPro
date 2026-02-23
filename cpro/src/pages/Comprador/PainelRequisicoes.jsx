// src/pages/Comprador/PainelRequisicoes.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function PainelRequisicoes() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [requisicoes, setRequisicoes] = useState([]);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  const empresaId = usuarioAtual?.empresa || usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  const linkRequisicao = empresaId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/requisicao-link/${encodeURIComponent(btoa(empresaId))}`
    : "";

  function copiarLink() {
    if (!linkRequisicao) return;
    navigator.clipboard.writeText(linkRequisicao).then(() => {
      setLinkCopiado(true);
      Swal.fire("Link copiado!", "Cole e envie para a pessoa que fará a requisição.", "success");
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  }

  // ------------------------------------------------------------
  // 🔐 CARREGAR USUÁRIO + REQUISIÇÕES
  // ------------------------------------------------------------
  useEffect(() => {
    const usuario = sessionStorage.getItem("usuario");
    if (!usuario) return navigate("/login");

    const dados = JSON.parse(usuario);
    setUsuarioAtual(dados);

    carregarRequisicoes(dados.empresa);
  }, []);

  async function carregarRequisicoes(empresa) {
    try {
      const res = await fetch(`${API_URL}/api/requisicoes?empresa=${empresa}`);
      const lista = await res.json();

      setRequisicoes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Erro ao carregar requisições:", err);
      Swal.fire("Erro", "Não foi possível carregar as requisições.", "error");
    }
  }

  // ------------------------------------------------------------
  // 🔄 ATUALIZAR STATUS
  // ------------------------------------------------------------
  async function atualizarStatus(req, novoStatus) {
    const confirmar = await Swal.fire({
      title: `Alterar status para "${novoStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#20b5a6",
    });

    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/requisicoes/${req._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      const atualizada = await res.json();

      // Se finalizou, dá baixa no estoque
      if (novoStatus === "Atendida") {
        await darBaixaNoEstoque(atualizada);
      }

      // Atualiza visualmente
      setRequisicoes((prev) =>
        prev.map((r) => (r._id === atualizada._id ? atualizada : r))
      );

      Swal.fire("OK!", "Status atualizado.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      Swal.fire("Erro", "Falha ao atualizar a requisição.", "error");
    }
  }

  // ------------------------------------------------------------
  // 📉 BAIXA AUTOMÁTICA NO ESTOQUE
  // ------------------------------------------------------------
  async function darBaixaNoEstoque(req) {
    const confirmar = await Swal.fire({
      title: "Dar baixa no estoque?",
      text: "Os itens retirados serão descontados automaticamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e67e22",
      cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return;

    try {
      // Carrega estoque atual
      const resEstoque = await fetch(`${API_URL}/api/estoque/${usuarioAtual.empresa}`);
      let estoqueAtual = await resEstoque.json();

      // Atualiza quantidades
      req.itens.forEach((item) => {
        estoqueAtual = estoqueAtual.map((p) =>
          p.nome === item.nome
            ? {
                ...p,
                quantidade: Math.max(0, p.quantidade - item.quantidade),
                ultimaAtualizacao: new Date(),
              }
            : p
        );
      });

      // Salva estoque atualizado
      await fetch(`${API_URL}/api/estoque/${usuarioAtual.empresa}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: estoqueAtual }),
      });

      Swal.fire("Sucesso", "Estoque atualizado com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao dar baixa:", err);
      Swal.fire("Erro", "Não foi possível atualizar o estoque.", "error");
    }
  }

  const coresStatus = {
    Pendente: "#FF8882",
    "Em Separação": "#F6A46A",
    Atendida: "#8BBBE6",
    Cancelada: "#ccc",
  };

  if (!usuarioAtual) return null;

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div style={{ width: "100%", maxWidth: "none", alignSelf: "stretch", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        {/* Nova requisição por link — terceiro acessa e escolhe quantidades */}
        <div style={boxReq}>
          <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>Nova requisição por link</h2>
          <p style={{ color: "#8b949e", marginBottom: 12 }}>
            Gere um link e envie para outra pessoa. Ela abrirá uma página onde poderá escolher as quantidades dos itens do catálogo e enviar a requisição.
          </p>
          {linkRequisicao ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                readOnly
                value={linkRequisicao}
                style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
              />
              <button type="button" onClick={copiarLink} style={{ ...btn, background: "var(--gradient-btn-primary)" }}>
                {linkCopiado ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          ) : (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          )}
        </div>

        {requisicoes.length === 0 ? (
          <p style={{ textAlign: "center", color: "#8b949e", fontStyle: "italic", fontSize: "1.0625rem" }}>Nenhuma requisição encontrada.</p>
        ) : (
          <div>
            {requisicoes.map((req) => (
              <div key={req._id} style={boxReq}>
                {/* HEADER */}
                <div style={reqHeader}>
                  <div>
                    <strong>#{req.numero}</strong> — {req.setorOrigem}
                    <br />
                    <small>
                      Criado por: <b>{req.criadoPor}</b> —{" "}
                      {new Date(req.createdAt).toLocaleString()}
                    </small>
                  </div>

                  <span
                    style={{
                      background: coresStatus[req.status],
                      padding: "6px 12px",
                      borderRadius: 4,
                      fontWeight: "bold",
                    }}
                  >
                    {req.status}
                  </span>
                </div>

                {/* ITENS */}
                <ul style={{ paddingLeft: 18, marginTop: 10 }}>
                  {req.itens.map((it, i) => (
                    <li key={i}>
                      <b>{it.nome}</b> — {it.quantidade} {it.unidade}
                    </li>
                  ))}
                </ul>

                {req.observacoes && (
                  <p>
                    <b>Observações:</b> {req.observacoes}
                  </p>
                )}

                {/* BOTÕES */}
                <div style={acoes}>
                  {req.status === "Pendente" && (
                    <button
                      style={{ ...btn, background: "#F6A46A" }}
                      onClick={() => atualizarStatus(req, "Em Separação")}
                    >
                      Iniciar Separação
                    </button>
                  )}

                  {req.status === "Em Separação" && (
                    <button
                      style={{ ...btn, background: "var(--gradient-btn-orange)" }}
                      onClick={() => atualizarStatus(req, "Atendida")}
                    >
                      Finalizar + Baixar Estoque
                    </button>
                  )}

                  {req.status !== "Atendida" && req.status !== "Cancelada" && (
                    <button
                      style={{ ...btn, background: "#FF8882" }}
                      onClick={() => atualizarStatus(req, "Cancelada")}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------
   ESTILOS
------------------------------------------------------------ */

const pageOuter = {
  background: "#0F2D3F",
  minHeight: "100vh",
  color: "#fff",
};

const topBar = {
  position: "sticky",
  top: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 28px",
  background: "#0F2D3F",
  zIndex: 20,
  height: 70,
};

const topLeft = { display: "flex", gap: 14, alignItems: "center" };

const helloText = {
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "#fff",
};

const btnSair = {
  background: "rgba(255,255,255,0.12)",
  border: "none",
  padding: "8px 14px",
  color: "#fff",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: "bold",
};

const mainWrap = {
  width: "100%",
  margin: "24px 0",
  padding: "0 20px 40px",
  boxSizing: "border-box",
};

const title = {
  textAlign: "center",
  marginBottom: 24,
  fontWeight: 900,
  color: "#fff",
};

const BORDER = "1px solid rgba(255,255,255,0.08)";

const boxReq = {
  color: "#e6edf3",
  padding: 20,
  marginBottom: 18,
  borderBottom: BORDER,
};

const reqHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const acoes = {
  marginTop: 14,
  display: "flex",
  gap: 10,
};

const btn = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: "bold",
  color: "#e6edf3",
};