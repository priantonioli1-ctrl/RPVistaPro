// src/pages/Comprador/Caixa.jsx — Controle de caixa, abertura/fechamento, conferência
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

function ModalSenha({ titulo, onConfirmar, onCancelar }) {
  const [senha, setSenha] = useState("");
  return (
    <div style={overlay} onClick={onCancelar}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>{titulo}</h3>
        <p style={{ color: "#8b949e", fontSize: "0.9375rem", marginBottom: 12 }}>Digite sua senha para confirmar:</p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          style={inputDark}
          className="campo-fundo-claro"
          autoFocus
        />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onCancelar} style={btnSecundario}>Cancelar</button>
          <button type="button" onClick={() => onConfirmar(senha)} style={btnPrimario}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export default function Caixa() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [valorAbertura, setValorAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [abrindo, setAbrindo] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [modalSenha, setModalSenha] = useState(null);
  const [conferencia, setConferencia] = useState(null);

  function getEmpresaId() {
    return usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  }

  function getToken() {
    return sessionStorage.getItem("token");
  }

  useEffect(() => {
    const u = sessionStorage.getItem("usuario");
    if (!u) {
      navigate("/login");
      return;
    }
    setUsuarioAtual(JSON.parse(u));
  }, [navigate]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregar();
  }, [usuarioAtual]);

  async function carregar() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    setLoading(true);
    try {
      const [resStatus, resHist] = await Promise.all([
        fetch(`${API_URL}/api/caixa/status`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} }),
        fetch(`${API_URL}/api/caixa/historico?limit=20`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} }),
      ]);
      const dataStatus = await resStatus.json();
      const dataHist = await resHist.json();
      setCaixa(dataStatus.caixa || null);
      setHistorico(Array.isArray(dataHist) ? dataHist : []);
    } catch (err) {
      console.error(err);
      setCaixa(null);
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  }

  function solicitarSenha(acao, callback) {
    setModalSenha({ titulo: acao, callback });
  }

  async function confirmarSenha(senha) {
    if (!modalSenha) return;
    try {
      const res = await fetch(`${API_URL}/api/caixa/confirmar-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Senha incorreta.");
      }
      const cb = modalSenha.callback;
      setModalSenha(null);
      if (cb) await cb(senha);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  function abrirCaixa() {
    const val = parseFloat(String(valorAbertura).replace(",", ".")) || 0;
    if (val < 0) {
      Swal.fire("Atenção", "Valor de abertura não pode ser negativo.", "warning");
      return;
    }
    solicitarSenha("Abrir caixa", async (senha) => {
      setAbrindo(true);
      try {
        const res = await fetch(`${API_URL}/api/caixa/abrir`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({ senha, valorAbertura: val }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao abrir.");
        Swal.fire("Sucesso", "Caixa aberto.", "success");
        setValorAbertura("");
        carregar();
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      } finally {
        setAbrindo(false);
      }
    });
  }

  function fecharCaixa() {
    const val = parseFloat(String(valorFechamento).replace(",", "."));
    if (valorFechamento !== "" && isNaN(val)) {
      Swal.fire("Atenção", "Valor de fechamento inválido.", "warning");
      return;
    }
    solicitarSenha("Fechar caixa", async (senha) => {
      setFechando(true);
      try {
        const res = await fetch(`${API_URL}/api/caixa/fechar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({
            senha,
            valorFechamento: valorFechamento === "" ? undefined : val,
            observacoes: observacoes.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao fechar.");
        Swal.fire("Sucesso", "Caixa fechado.", "success");
        setValorFechamento("");
        setObservacoes("");
        carregar();
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      } finally {
        setFechando(false);
      }
    });
  }

  async function verConferencia(c) {
    try {
      const res = await fetch(`${API_URL}/api/caixa/conferencia/${c._id}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Erro ao carregar conferência.");
      setConferencia(data);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>Controle de caixa</h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Abra e feche o caixa com senha. Use a conferência para validar o fechamento.
        </p>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : caixa ? (
          <div style={boxCaixa}>
            <h3 style={{ margin: "0 0 12px", color: "#25C19B" }}>Caixa aberto</h3>
            <p style={{ color: "#8b949e", marginBottom: 16 }}>
              Aberto por {caixa.usuario?.nome || "—"} em {new Date(caixa.abertoEm).toLocaleString("pt-BR")}
            </p>
            <p style={{ fontSize: "1.125rem", color: "#e6edf3" }}>
              Valor de abertura: <strong>R$ {Number(caixa.valorAbertura || 0).toFixed(2)}</strong>
            </p>
            <div style={{ marginTop: 24 }}>
              <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Valor no caixa ao fechar</label>
              <input
                type="text"
                placeholder="Ex.: 1500,00"
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
                style={inputDark}
                className="campo-fundo-claro"
              />
              <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6, marginTop: 12 }}>Observações</label>
              <input
                type="text"
                placeholder="Opcional"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={inputDark}
                className="campo-fundo-claro"
              />
              <button type="button" onClick={fecharCaixa} disabled={fechando} style={btnFechar}>
                {fechando ? "Fechando..." : "Fechar caixa"}
              </button>
            </div>
          </div>
        ) : (
          <div style={boxCaixa}>
            <h3 style={{ margin: "0 0 12px", color: "#8b949e" }}>Caixa fechado</h3>
            <p style={{ color: "#8b949e", marginBottom: 16 }}>Abra o caixa para iniciar o expediente.</p>
            <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Valor de abertura (fundo de caixa)</label>
            <input
              type="text"
              placeholder="Ex.: 100,00"
              value={valorAbertura}
              onChange={(e) => setValorAbertura(e.target.value)}
              style={inputDark}
              className="campo-fundo-claro"
            />
            <button type="button" onClick={abrirCaixa} disabled={abrindo} style={btnAbrir}>
              {abrindo ? "Abrindo..." : "Abrir caixa"}
            </button>
          </div>
        )}

        {/* Histórico */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem" }}>Histórico</h3>
          {historico.length === 0 ? (
            <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum registro.</p>
          ) : (
            <div style={tabelaHistorico}>
              {historico.map((c) => (
                <div key={c._id} style={linhaHistorico}>
                  <div>
                    <span style={{ color: c.status === "aberto" ? "#25C19B" : "#8b949e" }}>{c.status === "aberto" ? "Aberto" : "Fechado"}</span>
                    <span style={{ color: "#8b949e", marginLeft: 12 }}>
                      {new Date(c.abertoEm).toLocaleString("pt-BR")} — {c.usuario?.nome || "—"}
                    </span>
                  </div>
                  <div>
                    <span style={{ marginRight: 16 }}>Abertura: R$ {Number(c.valorAbertura || 0).toFixed(2)}</span>
                    {c.status === "fechado" && (
                      <>
                        <span style={{ marginRight: 16 }}>Fechamento: R$ {Number(c.valorFechamento || 0).toFixed(2)}</span>
                        <button type="button" onClick={() => verConferencia(c)} style={btnConferencia}>Conferir</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Conferência */}
        {conferencia && (
          <div style={overlay} onClick={() => setConferencia(null)}>
            <div style={modalConferencia} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>Conferência de caixa</h3>
              <div style={linhasConf}>
                <div><span style={{ color: "#8b949e" }}>Valor abertura</span> R$ {Number(conferencia.caixa?.valorAbertura || 0).toFixed(2)}</div>
                <div><span style={{ color: "#8b949e" }}>Total vendas</span> R$ {Number(conferencia.totalVendas || 0).toFixed(2)}</div>
                <div><span style={{ color: "#8b949e" }}>Valor fechamento</span> R$ {Number(conferencia.caixa?.valorFechamento || 0).toFixed(2)}</div>
                <div><span style={{ color: "#8b949e" }}>Esperado (abertura + vendas)</span> R$ {(Number(conferencia.caixa?.valorAbertura || 0) + Number(conferencia.totalVendas || 0)).toFixed(2)}</div>
                <div><span style={{ color: "#8b949e" }}>Diferença</span> <span style={{ color: Math.abs(conferencia.diferenca || 0) > 0.01 ? "#f85149" : "#25C19B" }}>R$ {(conferencia.diferenca || 0).toFixed(2)}</span></div>
              </div>
              <p style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 16 }}>Comandas: {conferencia.comandas?.length || 0}</p>
              <button type="button" onClick={() => setConferencia(null)} style={btnSecundario}>Fechar</button>
            </div>
          </div>
        )}
      </main>

      {modalSenha && (
        <ModalSenha
          titulo={modalSenha.titulo}
          onConfirmar={confirmarSenha}
          onCancelar={() => setModalSenha(null)}
        />
      )}
    </div>
  );
}

const mainWrap = { margin: "24px 0", padding: "0 20px 40px" };
const boxCaixa = {
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
  borderRadius: 8,
  padding: 24,
  maxWidth: 480,
};
const inputDark = {
  width: "100%",
  maxWidth: 280,
  padding: "10px 14px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
  marginBottom: 12,
};
const btnAbrir = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 8,
};
const btnFechar = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "#f85149",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 16,
};
const tabelaHistorico = { display: "flex", flexDirection: "column", gap: 12 };
const linhaHistorico = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
  borderRadius: 6,
  flexWrap: "wrap",
  gap: 12,
};
const btnConferencia = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "none",
  background: "var(--gradient-btn-orange)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalBox = { background: "rgba(20,2,42,0.98)", border: BORDER, borderRadius: 8, padding: 24, maxWidth: 360, width: "90%" };
const modalConferencia = { background: "rgba(20,2,42,0.98)", border: BORDER, borderRadius: 8, padding: 24, maxWidth: 420, width: "90%" };
const linhasConf = { display: "flex", flexDirection: "column", gap: 8, color: "#e6edf3" };
const btnPrimario = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSecundario = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer" };
