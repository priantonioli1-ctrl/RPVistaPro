// Eventos.jsx — Lista de eventos
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const STATUS_LABEL = { rascunho: "Rascunho", aguardando_cliente: "Aguardando cliente", proposta_enviada: "Proposta enviada", confirmado: "Confirmado" };

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}

export default function Eventos() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [criando, setCriando] = useState(false);

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) { navigate("/"); return; }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    fetch(`${API_URL}/api/eventos?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setEventos(Array.isArray(lista) ? lista : []))
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  async function criarEvento() {
    const codigo = (novoCodigo || "").trim() || `Evento ${new Date().toISOString().slice(0, 10)}`;
    if (!empresaId) return;
    setCriando(true);
    try {
      const res = await fetch(`${API_URL}/api/eventos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar.");
      Swal.fire("Sucesso", "Evento criado. Envie o link ao cliente.", "success");
      setNovoCodigo("");
      navigate("/eventos/" + data._id);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setCriando(false);
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Eventos</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>Gerencie eventos e propostas. O cliente preenche a ficha pelo link.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => navigate("/produtos-evento")} style={btnSec}>Produtos</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Código do evento (ex.: Casamento Silva)"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
            style={inputStyle}
            className="campo-fundo-claro"
          />
          <button type="button" onClick={criarEvento} disabled={criando} style={btnPrim}>{criando ? "Criando..." : "+ Novo evento"}</button>
        </div>

        {loading ? <p style={{ color: "#8b949e" }}>Carregando...</p> : eventos.length === 0 ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum evento. Crie um novo e envie o link ao cliente.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {eventos.map((e) => (
              <div key={e._id} style={card} onClick={() => navigate("/eventos/" + e._id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <strong style={{ color: "#e6edf3", fontSize: "1.1rem" }}>{e.codigo || "Evento"}</strong>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#8b949e" }}>{STATUS_LABEL[e.status] || e.status}</span>
                </div>
                <p style={{ margin: 0, color: "#8b949e", fontSize: "0.875rem" }}>Cliente: {e.cliente?.nome || "—"}</p>
                <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>Data: {formatarData(e.dataEvento)}</p>
                <p style={{ margin: "4px 0 0", color: "#00F2FF", fontWeight: 600 }}>R$ {(e.valorTotal || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const btnPrim = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSec = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
const inputStyle = { padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", minWidth: 240 };
const card = { padding: 20, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.04)", cursor: "pointer" };
