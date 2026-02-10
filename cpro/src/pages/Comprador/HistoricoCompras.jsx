import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || "";
const AZUL = "#2980b9";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

function getFornecedor(p) {
  return (p.fornecedor || p.produtos?.[0]?.fornecedor || p.itens?.[0]?.fornecedor || "").toString().trim() || "—";
}

function getQtdItens(p) {
  const itens = p.itens || p.produtos || [];
  return Array.isArray(itens) ? itens.length : 0;
}

export default function HistoricoCompras() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregar() {
      try {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
        const empresaParam = usuario?.nome || usuario?.empresa || usuario?._id;
        if (!empresaParam) {
          setPedidos([]);
          return;
        }
        const token = sessionStorage.getItem("token");
        const url = `${API_BASE}/api/pedidos?empresa=${encodeURIComponent(empresaParam)}`;
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await resp.json();
        const todos = Array.isArray(data) ? data : [];
        const concluidos = todos.filter((p) =>
          (p.status || "").toLowerCase().startsWith("conclu") || (p.status || "").toLowerCase() === "recebido"
        );
        setPedidos(concluidos);
      } catch (err) {
        console.error("Erro ao buscar histórico de compras:", err);
        setPedidos([]);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  function irParaConferencia(pedido) {
    const id = pedido._id || pedido.id;
    if (id) navigate(`/conferencia-pedido/${id}`, { state: { pedido } });
  }

  function irParaDetalhe(pedido) {
    const id = pedido._id || pedido.id;
    if (id) navigate(`/pedido-detalhado/${id}`);
  }

  if (carregando) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8b949e" }}>
        Carregando pedidos...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box" }}>
      <p style={styles.subtitulo}>
        Pedidos já aprovados, concluídos e recebidos — salvos aqui apenas para futura consulta.
      </p>

      <Section
        titulo="Concluídos (histórico)"
        cor={AZUL}
        lista={pedidos}
        emptyMsg="Nenhum pedido concluído."
        renderCard={(p) => (
          <PedidoCard
            fornecedor={getFornecedor(p)}
            qtdItens={getQtdItens(p)}
            total={p.total}
            status={p.status || "Concluído"}
            corBorda={AZUL}
            extra={p.dataRecebimento ? `Recebido em ${new Date(p.dataRecebimento).toLocaleDateString("pt-BR")}` : null}
            acoes={
              <>
                <button type="button" onClick={() => irParaDetalhe(p)} style={styles.btnAcao}>
                  Ver detalhe
                </button>
                <button type="button" onClick={() => irParaConferencia(p)} style={styles.btnAcao}>
                  Conferir
                </button>
              </>
            }
          />
        )}
      />
    </div>
  );
}

function Section({ titulo, cor, lista, emptyMsg, renderCard }) {
  return (
    <section style={styles.section}>
      <h2 style={{ ...styles.subtitle, color: cor }}>{titulo}</h2>
      {lista.length === 0 ? (
        <p style={styles.empty}>{emptyMsg}</p>
      ) : (
        <div style={styles.cardList}>
          {lista.map((p, i) => (
            <div key={p._id || p.id || i} style={styles.cardWrap}>
              {renderCard(p, i)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PedidoCard({ fornecedor, qtdItens, total, status, corBorda, extra, acoes }) {
  return (
    <div style={{ ...styles.card, borderLeft: `4px solid ${corBorda}` }}>
      <div style={styles.cardGrid}>
        <div style={styles.cardItem}>
          <span style={styles.label}>Fornecedor</span>
          <span style={styles.value}>{fornecedor}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Itens</span>
          <span style={styles.value}>{qtdItens}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Total</span>
          <span style={styles.value}>R$ {Number(total || 0).toFixed(2)}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Status</span>
          <span style={styles.value}>{status}</span>
        </div>
        {extra && (
          <div style={styles.cardItem}>
            <span style={styles.label} />
            <span style={styles.valueSmall}>{extra}</span>
          </div>
        )}
      </div>
      {acoes && <div style={styles.acoes}>{acoes}</div>}
    </div>
  );
}

const styles = {
  subtitulo: {
    color: "#8b949e",
    fontSize: "0.95rem",
    marginBottom: 24,
  },
  section: {
    marginBottom: 40,
    width: "100%",
  },
  subtitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: 16,
    color: "#e6edf3",
    textAlign: "center",
  },
  empty: {
    color: "#8b949e",
    fontStyle: "italic",
    fontSize: "1.0625rem",
    textAlign: "center",
    marginTop: 8,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
  },
  cardWrap: {
    width: "100%",
  },
  card: {
    background: CARD_BG,
    border: BORDER,
    borderRadius: 12,
    padding: "20px 24px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "14px 24px",
  },
  cardItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: "0.8125rem",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  value: {
    fontSize: "1.0625rem",
    fontWeight: 600,
    color: "#e6edf3",
  },
  valueSmall: {
    fontSize: "0.9375rem",
    color: "#8b949e",
  },
  acoes: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: BORDER,
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  btnAcao: {
    background: AZUL,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
