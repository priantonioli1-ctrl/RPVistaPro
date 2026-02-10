import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function MetricasComprador() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const navigate = useNavigate();

  // 🔹 Carregar dados
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    setUsuarioAtual(usuario || null);

    if (!usuario?.empresa) return;

    const compradorKey = usuario.empresa
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

    const chavePedidos = `meus_pedidos_${compradorKey}`;
    const pedidosSalvos = JSON.parse(localStorage.getItem(chavePedidos) || "[]");
    const fornecedoresSalvos = JSON.parse(localStorage.getItem("fornecedores") || "[]");

    setPedidos(pedidosSalvos);
    setFornecedores(fornecedoresSalvos);
  }, []);

  // 🔹 KPIs principais
  const totalPedidos = pedidos.length;
  const totalRecebidos = pedidos.filter((p) => p.status === "Recebido").length;
  const totalFornecedores = fornecedores.length;
  const valorTotal = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);

  // 🔹 Dados de gráfico - evolução mensal
  const porMes = (() => {
    const mapa = {};
    pedidos.forEach((p) => {
      const data = new Date(p.data || p.enviadaEm || Date.now());
      const mes = data.toLocaleString("pt-BR", { month: "short" });
      mapa[mes] = (mapa[mes] || 0) + (p.total || 0);
    });
    return Object.entries(mapa).map(([mes, total]) => ({ mes, total }));
  })();

  // 🔹 Dados de gráfico - por fornecedor
  const porFornecedor = (() => {
    const mapa = {};
    pedidos.forEach((p) => {
      mapa[p.fornecedor] = (mapa[p.fornecedor] || 0) + (p.total || 0);
    });
    return Object.entries(mapa).map(([fornecedor, total]) => ({
      fornecedor,
      total,
    }));
  })();

  // 🔹 Dados de gráfico - status
  const porStatus = (() => {
    const mapa = {};
    pedidos.forEach((p) => {
      mapa[p.status] = (mapa[p.status] || 0) + 1;
    });
    return Object.entries(mapa).map(([status, qtd]) => ({ status, qtd }));
  })();

  const COLORS = ["#25c19b", "#8bbae6", "#ff8882", "#f1c40f", "#27ae60", "#e74c3c"];

  // ---------- RENDER ----------
  return (
    <div style={{ width: "100%", maxWidth: "none", alignSelf: "stretch", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        {/* KPIs principais */}
        <div style={cardsGrid}>
          <div style={card}>
            <h3 style={cardLabel}>Pedidos Totais</h3>
            <p style={cardValue}>{totalPedidos}</p>
          </div>
          <div style={card}>
            <h3 style={cardLabel}>Pedidos Recebidos</h3>
            <p style={cardValue}>{totalRecebidos}</p>
          </div>
          <div style={card}>
            <h3 style={cardLabel}>Fornecedores Ativos</h3>
            <p style={cardValue}>{totalFornecedores}</p>
          </div>
          <div style={card}>
            <h3 style={cardLabel}>Valor Total Comprado</h3>
            <p style={cardValue}>R$ {valorTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Gráficos */}
        <div style={chartGrid}>
          <div style={chartBox}>
            <h3 style={chartTitle}>Evolução Mensal de Compras</h3>
            {porMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#25c19b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={emptyMsg}>Sem dados suficientes.</p>
            )}
          </div>

          <div style={chartBox}>
            <h3 style={chartTitle}>Distribuição por Fornecedor</h3>
            {porFornecedor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={porFornecedor}
                    dataKey="total"
                    nameKey="fornecedor"
                    outerRadius={100}
                    label
                  >
                    {porFornecedor.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={emptyMsg}>Sem dados de fornecedores.</p>
            )}
          </div>

          <div style={chartBoxFull}>
            <h3 style={chartTitle}>Status dos Pedidos</h3>
            {porStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="#8bbae6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={emptyMsg}>Nenhum pedido encontrado.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- ESTILOS ---------------- */
const pageOuter = {
  background: "#0F2D3F",
  color: "#fff",
  minHeight: "100vh",
};

const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#0F2D3F",
  height: 66,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
};

const topLeft = { display: "flex", alignItems: "center", gap: 14 };
const helloText = { fontSize: "1rem", opacity: 0.95 };
const btnSair = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
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
  textAlign: "left",
  color: "#fff",
  marginBottom: 30,
  fontWeight: 700,
  fontSize: "1.6rem",
};

const btnVoltar = {
  background: "#162232",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

/* KPIs */
const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
  marginBottom: 40,
};

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const card = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 20,
  color: "#e6edf3",
  textAlign: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
};
const cardLabel = { fontSize: "0.9375rem", marginBottom: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.04em" };
const cardValue = { fontSize: "1.8rem", fontWeight: 700, color: "#e6edf3" };

/* GRÁFICOS */
const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: 20,
};
const chartBox = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};
const chartBoxFull = {
  gridColumn: "1 / -1",
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};
const chartTitle = {
  marginBottom: 16,
  fontSize: "1.1rem",
  fontWeight: "bold",
};
const emptyMsg = { color: "#8b949e", textAlign: "center", fontStyle: "italic" };