// RespostasQuestionario.jsx — Visualizar diagnósticos dos questionários (acesso comprador)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../../utils/apiUrl";

const BORDER = "1px solid rgba(255,255,255,0.08)";

function capitalizarNome(nome) {
  if (!nome || typeof nome !== "string") return nome || "";
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function formatarData(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const card = {
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
  borderRadius: 8,
  padding: 24,
  marginBottom: 24,
};

export default function RespostasQuestionario() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diagnosticoSelecionado, setDiagnosticoSelecionado] = useState(null);

  const apiUrl = typeof getApiUrl === "function" ? getApiUrl() : "http://localhost:4001";

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?._id) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    if (!usuario) return;
    carregar();
  }, [usuario]);

  async function carregar() {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/questionario/diagnosticos-comprador`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setDiagnosticos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setDiagnosticos([]);
    } finally {
      setLoading(false);
    }
  }

  if (!usuario) return null;

  // Visualizar diagnóstico selecionado
  if (diagnosticoSelecionado) {
    const d = diagnosticoSelecionado;
    const itensB = d.diagnosticoItens || [];
    const itensA = d.diagnosticoAvancadoItens || [];
    return (
      <div className="layout-content-inner" style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px", color: "#e6edf3" }}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
          Diagnóstico — {capitalizarNome(d.nomeUsuario || "Usuário")}
        </h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Realizado em {formatarData(d.data)}
        </p>
        <p style={{ color: "#8b949e", marginBottom: 28, lineHeight: 1.6 }}>
          Análise do cenário na data do diagnóstico:
        </p>
        {itensB.length === 0 && itensA.length === 0 ? (
          <div style={card}>
            <p style={{ color: "#8b949e" }}>Nenhuma análise disponível.</p>
          </div>
        ) : (
          <>
            {itensB.length > 0 && (
              <>
                <h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 8 }}>Diagnóstico Básico</h3>
                {itensB.map((item, idx) => (
                  <div key={`b-${idx}`} style={card}>
                    <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                    <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                    <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Resposta: {item.resposta}</p>
                    <div style={{ padding: "12px 0", borderTop: BORDER }}>
                      <p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {itensA.length > 0 && (
              <>
                <h3 style={{ color: "#00F2FF", fontSize: "1rem", marginBottom: 16, marginTop: 24 }}>Diagnóstico Avançado — Gestão 360º</h3>
                {itensA.map((item, idx) => (
                  <div key={`a-${idx}`} style={card}>
                    <h4 style={{ color: "#00F2FF", fontSize: "0.9375rem", marginBottom: 8 }}>{item.titulo}</h4>
                    <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 8 }}>{item.pergunta}</p>
                    <p style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 12 }}>Resposta: {item.resposta}</p>
                    <div style={{ padding: "12px 0", borderTop: BORDER }}>
                      <p style={{ color: "#e6edf3", lineHeight: 1.7 }}>{item.analise}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setDiagnosticoSelecionado(null)}
            style={{
              padding: "12px 24px",
              borderRadius: 6,
              border: BORDER,
              background: "transparent",
              color: "#8b949e",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9375rem",
            }}
          >
            Voltar aos diagnósticos
          </button>
        </div>
      </div>
    );
  }

  // Lista de diagnósticos
  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
          Respostas do Questionário de Diagnóstico
        </h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Diagnósticos enviados pelos usuários do tipo questionário. Clique em um item para ver a análise completa.
        </p>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : diagnosticos.length === 0 ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum diagnóstico recebido ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {diagnosticos.map((d) => (
              <div
                key={d._id}
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,0.04)",
                  border: BORDER,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  cursor: "pointer",
                }}
                onClick={() => setDiagnosticoSelecionado(d)}
                onKeyDown={(e) => e.key === "Enter" && setDiagnosticoSelecionado(d)}
                role="button"
                tabIndex={0}
              >
                <div>
                  <strong style={{ color: "#e6edf3" }}>{d.nomeUsuario || "—"}</strong>
                  <span
                    style={{
                      color: "#8b949e",
                      fontSize: "0.8125rem",
                      marginLeft: 12,
                    }}
                  >
                    {(d.diagnosticoItens?.length || 0) + (d.diagnosticoAvancadoItens?.length || 0)} análises
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>{formatarData(d.data)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiagnosticoSelecionado(d);
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 6,
                      border: "none",
                      background: "var(--gradient-btn-primary)",
                      color: "#0B1C26",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9375rem",
                    }}
                  >
                    Ver diagnóstico
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
