// FolhaPontoFuncionario.jsx — Visualizar folha de ponto do funcionário
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const TIPO_LABEL = { entrada: "Entrada", saida: "Saída", "intervalo-inicio": "Início intervalo", "intervalo-fim": "Fim intervalo" };

function formatarDataHora(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function formatarHora(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function FolhaPontoFuncionario() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) {
      navigate("/");
      return;
    }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!id || !empresaId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/funcionarios-autorizados/${id}`).then((r) => r.json()),
      fetch(`${API_URL}/api/ponto/historico?empresa=${encodeURIComponent(empresaId)}&funcionarioId=${id}&dataInicio=${dataInicio}&dataFim=${dataFim}`).then((r) => r.json()),
    ])
      .then(([f, list]) => {
        if (f.error) throw new Error(f.error);
        setFuncionario(f);
        setRegistros(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        Swal.fire("Erro", err.message || "Não foi possível carregar.", "error");
        navigate("/cadastro-funcionarios");
      })
      .finally(() => setLoading(false));
  }, [id, empresaId, dataInicio, dataFim, navigate]);

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Folha de ponto</h2>
            {funcionario && (
              <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>
                {funcionario.nome} {funcionario.matricula ? `(${funcionario.matricula})` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/cadastro-funcionarios")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: BORDER,
              background: "transparent",
              color: "#8b949e",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Voltar
          </button>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, color: "#8b949e", fontSize: "0.8125rem" }}>Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }}
              className="campo-fundo-claro"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, color: "#8b949e", fontSize: "0.8125rem" }}>Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }}
              className="campo-fundo-claro"
            />
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : registros.length === 0 ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum registro de ponto no período.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" }}>Data</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" }}>Hora</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" }}>Tipo</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" }}>Método</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r._id}>
                    <td style={{ padding: 12, borderBottom: BORDER }}>{new Date(r.dataHora).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: 12, borderBottom: BORDER }}>{formatarHora(r.dataHora)}</td>
                    <td style={{ padding: 12, borderBottom: BORDER }}>{TIPO_LABEL[r.tipo] || r.tipo}</td>
                    <td style={{ padding: 12, borderBottom: BORDER }}>{r.metodo || "web"}</td>
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
