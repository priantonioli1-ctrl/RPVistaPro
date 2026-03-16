// MeusDiagnosticos.jsx — Lista de questionários já analisados
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
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
const btnAnterior = {
  padding: "12px 24px",
  borderRadius: 6,
  border: BORDER,
  background: "transparent",
  color: "#8b949e",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9375rem",
};
const btnProximo = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9375rem",
};
const btnApagar = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "1px solid rgba(248,81,73,0.6)",
  background: "transparent",
  color: "#f85149",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const footer = {
  marginTop: 40,
  padding: "16px 0",
  color: "#8b949e",
  fontSize: "0.8125rem",
  textAlign: "center",
  borderTop: BORDER,
};

export default function MeusDiagnosticos() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [diagnosticosSalvos, setDiagnosticosSalvos] = useState([]);
  const [diagnosticoSelecionado, setDiagnosticoSelecionado] = useState(null);
  const [carregandoDiagnosticos, setCarregandoDiagnosticos] = useState(false);

  const apiUrl = typeof getApiUrl === "function" ? getApiUrl() : "http://localhost:4001";

  async function carregarDiagnosticosSalvos() {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setCarregandoDiagnosticos(true);
    try {
      const res = await fetch(`${apiUrl}/api/questionario/diagnosticos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const lista = await res.json();
        setDiagnosticosSalvos(lista);
      }
    } catch (_) {
    } finally {
      setCarregandoDiagnosticos(false);
    }
  }

  async function apagarDiagnostico(e, id) {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: "Excluir diagnóstico?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/questionario/diagnosticos/apagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDiagnosticosSalvos((prev) => prev.filter((d) => d._id !== id));
        if (diagnosticoSelecionado?._id === id) setDiagnosticoSelecionado(null);
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ title: "Erro", text: data.error || "Erro ao excluir.", icon: "error", confirmButtonText: "Entendi" });
      }
    } catch (_) {
      Swal.fire({ title: "Erro", text: "Erro ao conectar. Tente novamente.", icon: "error", confirmButtonText: "Entendi" });
    }
  }

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
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

  if (!usuario) return null;

  // Visualizar diagnóstico selecionado
  if (diagnosticoSelecionado) {
    const d = diagnosticoSelecionado;
    const itensB = d.diagnosticoItens || [];
    const itensA = d.diagnosticoAvancadoItens || [];
    return (
      <div
        className="layout-content-inner"
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 24px 80px",
          color: "#e6edf3",
        }}
      >
        <h2
          style={{
            marginBottom: 8,
            color: "#e6edf3",
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          Diagnóstico — {capitalizarNome(d.nomeUsuario || usuario.nome)}
        </h2>
        <p
          style={{
            color: "#8b949e",
            marginBottom: 24,
            fontSize: "0.9375rem",
          }}
        >
          Realizado em {formatarData(d.data)}
        </p>
        <p
          style={{
            color: "#8b949e",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          Análise do seu cenário na data do diagnóstico:
        </p>
        {itensB.length === 0 && itensA.length === 0 ? (
          <div style={card}>
            <p style={{ color: "#8b949e" }}>Nenhuma análise disponível.</p>
          </div>
        ) : (
          <>
            {itensB.length > 0 && (
              <>
                <h3
                  style={{
                    color: "#00F2FF",
                    fontSize: "1rem",
                    marginBottom: 16,
                    marginTop: 8,
                  }}
                >
                  Diagnóstico Básico
                </h3>
                {itensB.map((item, idx) => (
                  <div key={`b-${idx}`} style={card}>
                    <h4
                      style={{
                        color: "#00F2FF",
                        fontSize: "0.9375rem",
                        marginBottom: 8,
                      }}
                    >
                      {item.titulo}
                    </h4>
                    <p
                      style={{
                        color: "#8b949e",
                        fontSize: "0.875rem",
                        marginBottom: 8,
                      }}
                    >
                      {item.pergunta}
                    </p>
                    <p
                      style={{
                        color: "#e6edf3",
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      Sua resposta: {item.resposta}
                    </p>
                    <div style={{ padding: "12px 0", borderTop: BORDER }}>
                      <p
                        style={{
                          color: "#e6edf3",
                          lineHeight: 1.7,
                        }}
                      >
                        {item.analise}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {itensA.length > 0 && (
              <>
                <h3
                  style={{
                    color: "#00F2FF",
                    fontSize: "1rem",
                    marginBottom: 16,
                    marginTop: 24,
                  }}
                >
                  Diagnóstico Avançado — Gestão 360º
                </h3>
                {itensA.map((item, idx) => (
                  <div key={`a-${idx}`} style={card}>
                    <h4
                      style={{
                        color: "#00F2FF",
                        fontSize: "0.9375rem",
                        marginBottom: 8,
                      }}
                    >
                      {item.titulo}
                    </h4>
                    <p
                      style={{
                        color: "#8b949e",
                        fontSize: "0.875rem",
                        marginBottom: 8,
                      }}
                    >
                      {item.pergunta}
                    </p>
                    <p
                      style={{
                        color: "#e6edf3",
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      Sua resposta: {item.resposta}
                    </p>
                    <div style={{ padding: "12px 0", borderTop: BORDER }}>
                      <p
                        style={{
                          color: "#e6edf3",
                          lineHeight: 1.7,
                        }}
                      >
                        {item.analise}
                      </p>
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
            style={btnAnterior}
          >
            Voltar aos diagnósticos
          </button>
        </div>
        <footer style={footer}>
          As informações fornecidas são confidenciais e serão utilizadas
          exclusivamente para o desenvolvimento do projeto RP Vista Pro.
        </footer>
      </div>
    );
  }

  // Lista de diagnósticos
  return (
    <div
      className="layout-content-inner"
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 24px 80px",
        color: "#e6edf3",
      }}
    >
      <h2
        style={{
          marginBottom: 8,
          color: "#e6edf3",
          fontSize: "1.5rem",
          fontWeight: 700,
        }}
      >
        Meus diagnósticos
      </h2>
      <p
        style={{
          color: "#8b949e",
          marginBottom: 24,
          fontSize: "0.9375rem",
          lineHeight: 1.5,
        }}
      >
        Questionários já analisados. Clique em um item para ver o diagnóstico
        completo.
      </p>
      {carregandoDiagnosticos ? (
        <p style={{ color: "#8b949e", fontSize: "0.875rem" }}>
          Carregando...
        </p>
      ) : diagnosticosSalvos.length === 0 ? (
        <div style={card}>
          <p style={{ color: "#8b949e", marginBottom: 16 }}>
            Nenhum diagnóstico salvo ainda.
          </p>
          <button
            type="button"
            onClick={() => navigate("/questionario")}
            style={btnProximo}
          >
            Responder questionário
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {diagnosticosSalvos.map((d) => (
            <div
              key={d._id}
              style={{
                ...card,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                cursor: "pointer",
              }}
              onClick={() => setDiagnosticoSelecionado(d)}
              onKeyDown={(e) =>
                e.key === "Enter" && setDiagnosticoSelecionado(d)
              }
              role="button"
              tabIndex={0}
            >
              <div>
                <span style={{ color: "#e6edf3", fontWeight: 600 }}>
                  Diagnóstico de {formatarData(d.data)}
                </span>
                <span
                  style={{
                    color: "#8b949e",
                    fontSize: "0.8125rem",
                    marginLeft: 8,
                  }}
                >
                  {(d.diagnosticoItens?.length || 0) +
                    (d.diagnosticoAvancadoItens?.length || 0)}{" "}
                  análises
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    apagarDiagnostico(e, d._id);
                  }}
                  style={btnApagar}
                >
                  Apagar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDiagnosticoSelecionado(d);
                  }}
                  style={btnProximo}
                >
                  Ver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={() => navigate("/questionario")}
          style={btnAnterior}
        >
          Voltar ao questionário
        </button>
      </div>
      <footer style={footer}>
        As informações fornecidas são confidenciais e serão utilizadas
        exclusivamente para o desenvolvimento do projeto RP Vista Pro.
      </footer>
    </div>
  );
}
