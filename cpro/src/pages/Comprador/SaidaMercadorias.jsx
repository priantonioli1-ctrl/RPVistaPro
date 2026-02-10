// src/pages/Comprador/SaidaMercadorias.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

export default function SaidaMercadorias() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [requisicoes, setRequisicoes] = useState([]);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = sessionStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }

    const dados = JSON.parse(usuario);
    setUsuarioAtual(dados);
    carregarRequisicoes(dados);
  }, [navigate]);

  async function carregarRequisicoes(usuario) {
    try {
      const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
      if (!empresaId) {
        Swal.fire("Erro", "Empresa não identificada.", "error");
        return;
      }

      const res = await fetch(`${API_URL}/api/requisicoes?empresa=${encodeURIComponent(empresaId)}`);
      const lista = await res.json();
      setRequisicoes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Erro ao carregar requisições:", err);
      Swal.fire("Erro", "Não foi possível carregar as requisições.", "error");
    }
  }

  function gerarLinkRequisicao() {
    if (!usuarioAtual) return "";
    const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) return "";
    
    const token = btoa(empresaId);
    return `${typeof window !== "undefined" ? window.location.origin : ""}/requisicao-link/${token}`;
  }

  function copiarLink() {
    const link = gerarLinkRequisicao();
    if (!link) {
      Swal.fire("Erro", "Não foi possível gerar o link.", "error");
      return;
    }
    
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopiado(true);
      Swal.fire("Link copiado!", "Envie este link para o funcionário que precisa solicitar produtos.", "success");
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  }

  async function atualizarStatus(req, novoStatus) {
    const confirmar = await Swal.fire({
      title: `Alterar status para "${novoStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#25C19B",
    });

    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/requisicoes/${req._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");
      const atualizada = await res.json();

      // Se finalizou, dá baixa no estoque automaticamente
      if (novoStatus === "Entregue") {
        await darBaixaNoEstoque(atualizada);
      }

      setRequisicoes((prev) =>
        prev.map((r) => (r._id === atualizada._id ? atualizada : r))
      );

      Swal.fire("Sucesso", "Status atualizado com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      Swal.fire("Erro", "Falha ao atualizar a requisição.", "error");
    }
  }

  async function darBaixaNoEstoque(req) {
    try {
      const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
      if (!empresaId) {
        Swal.fire("Erro", "Empresa não identificada.", "error");
        return;
      }

      // Carrega estoque atual
      const resEstoque = await fetch(`${API_URL}/api/estoque/${empresaId}`);
      if (!resEstoque.ok) throw new Error("Erro ao carregar estoque");
      
      let estoqueAtual = await resEstoque.json();
      if (!Array.isArray(estoqueAtual)) estoqueAtual = [];

      // Atualiza quantidades (dá baixa)
      req.itens.forEach((item) => {
        estoqueAtual = estoqueAtual.map((p) =>
          p.nome === item.nome
            ? {
                ...p,
                quantidade: Math.max(0, (Number(p.quantidade) || 0) - (Number(item.quantidade) || 0)),
                ultimaAtualizacao: new Date().toISOString(),
              }
            : p
        );
      });

      // Salva estoque atualizado
      await fetch(`${API_URL}/api/estoque/${empresaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: estoqueAtual }),
      });

      Swal.fire("Sucesso", "Baixa realizada no estoque com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao dar baixa:", err);
      Swal.fire("Erro", "Não foi possível dar baixa no estoque.", "error");
    }
  }

  const coresStatus = {
    Pendente: "#FF8882",
    "Em Separação": "#F6A46A",
    Entregue: "#25C19B",
    Cancelada: "#8b949e",
  };

  if (!usuarioAtual) return null;

  const linkRequisicao = gerarLinkRequisicao();
  const requisicoesPendentes = requisicoes.filter((r) => r.status === "Pendente" || r.status === "Em Separação");
  const requisicoesEntregues = requisicoes.filter((r) => r.status === "Entregue");

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        {/* Seção: Gerar Link de Requisição */}
        <div style={boxReq}>
          <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
            📤 Gerar Link de Requisição
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 16, fontSize: "0.9375rem" }}>
            Gere um link e envie para o funcionário. Ele acessará pelo celular, fará autenticação facial e poderá solicitar os produtos que precisa.
          </p>
          {linkRequisicao ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                readOnly
                value={linkRequisicao}
                style={inputLink}
                className="campo-fundo-claro"
              />
              <button type="button" onClick={copiarLink} style={btnCopiar}>
                {linkCopiado ? "✓ Copiado!" : "📋 Copiar link"}
              </button>
            </div>
          ) : (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          )}
        </div>

        {/* Seção: Requisições Pendentes */}
        {requisicoesPendentes.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
              Requisições Pendentes
            </h2>
            {requisicoesPendentes.map((req) => (
              <div key={req._id} style={boxReq}>
                <div style={reqHeader}>
                  <div>
                    <strong style={{ fontSize: "1.125rem", color: "#e6edf3" }}>
                      #{req.numero || req._id?.slice(-6)}
                    </strong>
                    <br />
                    <small style={{ color: "#8b949e", fontSize: "0.875rem" }}>
                      Solicitado por: <b>{req.funcionarioNome || req.criadoPor || "Funcionário"}</b>
                      {req.setorOrigem && ` — ${req.setorOrigem}`}
                      <br />
                      {new Date(req.createdAt || Date.now()).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <span style={{ ...badgeStatus, background: coresStatus[req.status] || "#8b949e" }}>
                    {req.status}
                  </span>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={{ color: "#e6edf3", fontSize: "0.9375rem", fontWeight: 600, marginBottom: 8 }}>
                    Itens solicitados:
                  </h3>
                  <ul style={{ paddingLeft: 20, margin: 0, color: "#e6edf3" }}>
                    {req.itens?.map((it, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        <b>{it.nome}</b> — {it.quantidade} {it.unidade || "un"}
                      </li>
                    ))}
                  </ul>
                </div>

                {req.observacoes && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                    <strong style={{ color: "#8b949e", fontSize: "0.875rem" }}>Observações:</strong>
                    <p style={{ color: "#e6edf3", margin: "4px 0 0", fontSize: "0.9375rem" }}>{req.observacoes}</p>
                  </div>
                )}

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
                      style={{ ...btn, background: "#25C19B" }}
                      onClick={() => atualizarStatus(req, "Entregue")}
                    >
                      ✓ Marcar como Entregue e Dar Baixa
                    </button>
                  )}

                  {req.status !== "Entregue" && req.status !== "Cancelada" && (
                    <button
                      style={{ ...btn, background: "transparent", border: "1px solid rgba(248,81,73,0.5)", color: "#f85149" }}
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

        {/* Seção: Requisições Entregues (Histórico) */}
        {requisicoesEntregues.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
              Requisições Entregues
            </h2>
            {requisicoesEntregues.map((req) => (
              <div key={req._id} style={{ ...boxReq, opacity: 0.8 }}>
                <div style={reqHeader}>
                  <div>
                    <strong style={{ fontSize: "1.125rem", color: "#e6edf3" }}>
                      #{req.numero || req._id?.slice(-6)}
                    </strong>
                    <br />
                    <small style={{ color: "#8b949e", fontSize: "0.875rem" }}>
                      Entregue para: <b>{req.funcionarioNome || req.criadoPor || "Funcionário"}</b>
                      <br />
                      {req.dataEntrega 
                        ? `Entregue em ${new Date(req.dataEntrega).toLocaleString("pt-BR")}`
                        : new Date(req.updatedAt || req.createdAt).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <span style={{ ...badgeStatus, background: coresStatus.Entregue }}>
                    Entregue
                  </span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <ul style={{ paddingLeft: 20, margin: 0, color: "#e6edf3" }}>
                    {req.itens?.map((it, i) => (
                      <li key={i} style={{ marginBottom: 4, fontSize: "0.9375rem" }}>
                        {it.nome} — {it.quantidade} {it.unidade || "un"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {requisicoes.length === 0 && (
          <p style={{ textAlign: "center", color: "#8b949e", fontStyle: "italic", fontSize: "1.0625rem", marginTop: 40 }}>
            Nenhuma requisição encontrada.
          </p>
        )}
      </main>
    </div>
  );
}

const mainWrap = {
  width: "100%",
  margin: "24px 0",
  padding: "0 20px 40px",
  boxSizing: "border-box",
};

const boxReq = {
  background: CARD_BG,
  border: BORDER,
  color: "#e6edf3",
  padding: 24,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  marginBottom: 18,
};

const reqHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
};

const badgeStatus = {
  padding: "6px 14px",
  borderRadius: 8,
  fontWeight: 600,
  color: "#fff",
  fontSize: "0.875rem",
};

const acoes = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: BORDER,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const btn = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  color: "#fff",
};

const btnCopiar = {
  ...btn,
  background: "#25C19B",
  color: "#0B1C26",
};

const inputLink = {
  flex: 1,
  minWidth: 200,
  padding: "10px 12px",
  borderRadius: 8,
  border: BORDER,
  background: "#fff",
  color: "#1a1a1a",
  fontSize: "0.9375rem",
};
