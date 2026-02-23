// Propostas.jsx — Lista de propostas com filtros por status, Enviar e Editar
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const STATUS_OPCOES = [
  { id: "todas", label: "Todas", value: null },
  { id: "em_aberto", label: "Em aberto", value: "em_aberto" },
  { id: "rejeitada", label: "Rejeitadas", value: "rejeitada" },
  { id: "aceita", label: "Aceitas", value: "aceita" },
  { id: "paga", label: "Pagas", value: "paga" },
];

const STATUS_COLOR = {
  em_aberto: "#f0883e",
  rejeitada: "#f85149",
  aceita: "#25C19B",
  paga: "#3fb950",
};

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}

function formatarMoeda(v) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

export default function Propostas() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(null);
  const [atualizandoStatusId, setAtualizandoStatusId] = useState(null);

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) { navigate("/"); return; }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    const qs = filtroStatus ? `?empresa=${encodeURIComponent(empresaId)}&status=${encodeURIComponent(filtroStatus)}` : `?empresa=${encodeURIComponent(empresaId)}`;
    fetch(`${API_URL}/api/propostas${qs}`)
      .then((r) => r.json())
      .then((lista) => setPropostas(Array.isArray(lista) ? lista : []))
      .catch(() => setPropostas([]))
      .finally(() => setLoading(false));
  }, [empresaId, filtroStatus]);

  function handleEnviar(proposta) {
    if (!proposta.dados?.email?.trim()) {
      Swal.fire("Aviso", "Esta proposta não tem email do cliente. Edite a proposta para adicionar o email.", "warning");
      return;
    }
    navigate(`/propostas/${proposta._id}`, { state: { enviarAoCarregar: true } });
  }

  async function handleAlterarStatus(proposta, novoStatus) {
    setAtualizandoStatusId(proposta._id);
    try {
      const res = await fetch(`${API_URL}/api/propostas/${proposta._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar");
      }
      const atualizada = await res.json();
      setPropostas((prev) => prev.map((p) => (p._id === proposta._id ? atualizada : p)));
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setAtualizandoStatusId(null);
    }
  }

  function handleEditar(proposta) {
    navigate(`/propostas/${proposta._id}`);
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Propostas</h2>
          <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>
            Todas as propostas criadas. Envie o contrato por email, altere o status ou edite qualquer item.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {STATUS_OPCOES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFiltroStatus(s.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: filtroStatus === s.value ? "2px solid #00F2FF" : BORDER,
                background: filtroStatus === s.value ? "rgba(0,242,255,0.15)" : "transparent",
                color: "#e6edf3",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : propostas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
            <p style={{ color: "#8b949e", fontSize: "1rem" }}>Nenhuma proposta encontrada.</p>
            <p style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 8 }}>
              Crie uma nova proposta em{" "}
              <button
                type="button"
                onClick={() => navigate("/nova-proposta")}
                style={{ background: "none", border: "none", color: "#00F2FF", cursor: "pointer", textDecoration: "underline" }}
              >
                Nova proposta
              </button>
              .
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {propostas.map((p) => (
              <div
                key={p._id}
                style={{
                  padding: 16,
                  border: BORDER,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong style={{ color: "#e6edf3", fontSize: "1.05rem", display: "block" }}>
                    {p.dados?.nome || "—"}
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>
                    {p.tipoProposta?.nome || "Proposta"} · {p.dados?.email || "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>
                    Data evento: {formatarData(p.dados?.dataEvento)} · {(p.escopo?.nConvidados || 0)} convidados
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: `${STATUS_COLOR[p.status] || "#8b949e"}22`,
                      color: STATUS_COLOR[p.status] || "#8b949e",
                    }}
                  >
                    {STATUS_OPCOES.find((s) => s.value === p.status)?.label || p.status}
                  </span>
                </div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#00F2FF" }}>
                  {formatarMoeda(p.valorTotal)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleEnviar(p)}
                    disabled={!p.dados?.email?.trim()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: "none",
                      background: "var(--gradient-btn-primary)",
                      color: "#0B1C26",
                      fontWeight: 600,
                      cursor: p.dados?.email ? "pointer" : "not-allowed",
                      opacity: p.dados?.email ? 1 : 0.6,
                    }}
                    title={!p.dados?.email ? "Adicione o email do cliente na proposta" : "Enviar contrato por email"}
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditar(p)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: BORDER,
                      background: "transparent",
                      color: "#e6edf3",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>
                  <select
                    value={p.status}
                    onChange={(e) => handleAlterarStatus(p, e.target.value)}
                    disabled={atualizandoStatusId === p._id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: BORDER,
                      background: "rgba(0,0,0,0.3)",
                      color: "#e6edf3",
                      cursor: "pointer",
                    }}
                  >
                    <option value="em_aberto">Em aberto</option>
                    <option value="rejeitada">Rejeitada</option>
                    <option value="aceita">Aceita</option>
                    <option value="paga">Paga</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
