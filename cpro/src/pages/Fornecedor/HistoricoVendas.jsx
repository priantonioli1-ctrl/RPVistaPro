// src/pages/Fornecedor/HistoricoVendas.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const keyify = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

export default function HistoricoVendas() {
  const [pedidos, setPedidos] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "{}");
    setUsuarioAtual(usuario || null);
    const fornecedorKey = keyify(usuario?.empresa || "desconhecido");
    const chave = `historico_vendas_${fornecedorKey}`;
    const data = JSON.parse(localStorage.getItem(chave) || "[]");
    setPedidos(data);
  }, []);

  const aprovados = pedidos.filter(
    (p) => (p.status || "").toLowerCase() === "aprovado"
  );
  const recebidos = pedidos.filter(
    (p) => (p.status || "").toLowerCase() === "recebido"
  );

  return (
    <div className="layout-content-inner">
      <div style={contentCard}>
        {/* Aprovados */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: "#f1c40f", marginBottom: 10 }}>
            🟡 Aguardando Recebimento (Aprovados)
          </h2>
          {aprovados.length ? (
            aprovados.map((p, i) => (
              <Card key={p.id || i} border="#f1c40f" bg="#fffef2">
                <Linha label="Comprador" value={p.comprador} />
                <Linha label="Qtd Produtos" value={p.qtdProdutos} />
                <Linha
                  label="Total"
                  value={`R$ ${Number(p.total || 0).toFixed(2)}`}
                />
                <Linha label="Aprovado em" value={p.aprovadoEm || "-"} />
                <Linha label="Status" value={p.status} />
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    style={btnAction}
                    onClick={() =>
                      navigate(`/fornecedor/pedido/${encodeURIComponent(p.id)}`)
                    }
                  >
                    👁️ Visualizar
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <p style={textoVazio}>Nenhum pedido aguardando recebimento.</p>
          )}
        </section>

        {/* Recebidos */}
        <section>
          <h2 style={{ color: "#27ae60", marginBottom: 10 }}>
            🟢 Recebidos (Concluídos)
          </h2>
          {recebidos.length ? (
            recebidos.map((p, i) => (
              <Card key={p.id || i} bg="#e8f5e9" border="#27ae60">
                <Linha label="Comprador" value={p.comprador} />
                <Linha label="Qtd Produtos" value={p.qtdProdutos} />
                <Linha
                  label="Total"
                  value={`R$ ${Number(p.total || 0).toFixed(2)}`}
                />
                <Linha label="Recebido em" value={p.recebidoEm || "-"} />
                <Linha label="Status" value={p.status} />
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    style={btnAction}
                    onClick={() =>
                      navigate(`/fornecedor/pedido/${encodeURIComponent(p.id)}`)
                    }
                  >
                    👁️ Visualizar
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <p style={textoVazio}>Nenhuma venda concluída.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/* 🔹 COMPONENTES AUXILIARES */
function Card({ children, bg = "#fff", border = "#ccc" }) {
  const isClaro = /^#(fff|f[f0-9a-f]{5}|e[89a-f][0-9a-f]{4})/i.test(String(bg));
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        color: isClaro ? "#1f2e45" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Linha({ label, value }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <strong>{label}:</strong> {value}
    </div>
  );
}

/* 🎨 ESTILOS IGUAIS AO LAYOUT “NOVO PEDIDO” */
const pageWrapper = {
  backgroundColor: "#162232",
  minHeight: "100vh",
  padding: 20,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const btnVoltar = {
  backgroundColor: "#e07c7c",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

const contentCard = {
  backgroundColor: "var(--header-bg, #161b22)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};

const btnAction = {
  backgroundColor: "#8bbae6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const textoVazio = {
  color: "#777",
  fontStyle: "italic",
};