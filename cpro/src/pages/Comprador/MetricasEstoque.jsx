// MetricasEstoque.jsx — Relatórios de análise de estoque (seletor de tipo)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const RELATORIOS = [
  { id: "estoqueExcedente", label: "Estoque excedente", desc: "Produtos acima do máximo desejado (bolinha lilás)", usaPeriodo: false },
  { id: "produtosMenosSaida", label: "Produtos com menor saída", desc: "Itens pouco vendidos no período", usaPeriodo: true },
  { id: "todasSaidas", label: "Saídas", desc: "Registro de vendas no período", usaPeriodo: true },
  { id: "todasEntradas", label: "Entradas", desc: "Registro de entradas no período", usaPeriodo: true },
  { id: "proximosValidade", label: "Próximos da validade", desc: "Itens com validade nos próximos 90 dias", usaPeriodo: false },
  { id: "abaixoMinimo", label: "Abaixo do mínimo", desc: "Produtos que precisam de reposição", usaPeriodo: false },
];

export default function MetricasEstoque() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [relatorio, setRelatorio] = useState("produtosMenosSaida");
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dias, setDias] = useState(30);
  const [apenasBonificados, setApenasBonificados] = useState(false);

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
    const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) return;
    carregar(empresaId);
  }, [usuarioAtual, relatorio, dias, apenasBonificados]);

  async function carregar(empresaId) {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const params = new URLSearchParams({
        relatorio,
        dias: String(dias),
      });
      if (relatorio === "todasEntradas" && apenasBonificados) params.set("apenasBonificados", "1");
      const res = await fetch(
        `${API_URL}/api/estoque/metricas/${empresaId}?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error("Erro ao carregar métricas");
      const data = await res.json();
      setMetricas(data);
    } catch (err) {
      console.error(err);
      setMetricas(null);
    } finally {
      setLoading(false);
    }
  }

  function fmtData(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  function fmtDataHora(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR");
  }

  const relatorioAtual = RELATORIOS.find((r) => r.id === relatorio);

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>Métricas do Estoque</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <label style={{ color: "#8b949e", fontSize: "0.75rem", display: "block", marginBottom: 4 }}>Relatório</label>
              <select
                value={relatorio}
                onChange={(e) => setRelatorio(e.target.value)}
                style={selectStyle}
              >
                {RELATORIOS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            {relatorioAtual?.usaPeriodo && (
              <div>
                <label style={{ color: "#8b949e", fontSize: "0.75rem", display: "block", marginBottom: 4 }}>Período</label>
                <select value={dias} onChange={(e) => setDias(Number(e.target.value))} style={selectStyle}>
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>
            )}
            {relatorio === "todasEntradas" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8b949e", fontSize: "0.875rem", cursor: "pointer", marginTop: 24 }}>
                <input
                  type="checkbox"
                  checked={apenasBonificados}
                  onChange={(e) => setApenasBonificados(e.target.checked)}
                />
                Apenas bonificados
              </label>
            )}
            <button type="button" onClick={() => navigate("/estoque")} style={btnVoltar}>
              Voltar ao Estoque
            </button>
          </div>
        </div>

        {relatorioAtual && (
          <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "0.9375rem" }}>{relatorioAtual.desc}</p>
        )}

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : !metricas ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum dado disponível.</p>
        ) : (
          <div style={reportBox}>
            {relatorio === "estoqueExcedente" && (
              <>
                <h3 style={reportTitle}>Estoque excedente</h3>
                <p style={reportSubtitle}>Produtos acima da quantidade máxima desejada</p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>Nenhum produto excedente.</p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Produto</th>
                          <th style={th}>Unidade</th>
                          <th style={th}>Atual</th>
                          <th style={th}>Em trânsito</th>
                          <th style={th}>Máximo</th>
                          <th style={th}>Excedente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{p.nome}</td>
                            <td style={td}>{p.unidade}</td>
                            <td style={td}>{p.quantidade}</td>
                            <td style={td}>{p.emTransito}</td>
                            <td style={td}>{p.maximo}</td>
                            <td style={{ ...td, color: "#9b59b6", fontWeight: 600 }}>{p.excedente}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {relatorio === "produtosMenosSaida" && (
              <>
                <h3 style={reportTitle}>Produtos com menor saída</h3>
                <p style={reportSubtitle}>Ordenados por menor quantidade vendida nos últimos {metricas.diasAnalise} dias</p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>Nenhuma venda registrada no período.</p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Produto</th>
                          <th style={th}>Unidade</th>
                          <th style={th}>Qtd vendida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{p.nome}</td>
                            <td style={td}>{p.unidade}</td>
                            <td style={td}>{p.quantidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {relatorio === "todasSaidas" && (
              <>
                <h3 style={reportTitle}>Saídas</h3>
                <p style={reportSubtitle}>Registro de vendas nos últimos {metricas.diasAnalise} dias — Total: {metricas.totalRegistros || 0} itens</p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>Nenhuma venda no período.</p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Data</th>
                          <th style={th}>Produto</th>
                          <th style={th}>Qtd</th>
                          <th style={th}>Total (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{fmtDataHora(p.data)}</td>
                            <td style={td}>{p.produto}</td>
                            <td style={td}>{p.quantidade} {p.unidade}</td>
                            <td style={td}>{Number(p.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {relatorio === "todasEntradas" && (
              <>
                <h3 style={reportTitle}>Entradas</h3>
                <p style={reportSubtitle}>
                  Registro de entradas nos últimos {metricas.diasAnalise} dias — Total: {metricas.totalRegistros || 0} itens
                  {apenasBonificados && " (apenas bonificados)"}
                </p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>
                    {apenasBonificados ? "Nenhuma entrada bonificada no período." : "Nenhuma entrada no período."}
                  </p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Data</th>
                          <th style={th}>Produto</th>
                          <th style={th}>Qtd</th>
                          <th style={th}>Fornecedor</th>
                          <th style={th}>NF</th>
                          <th style={th}>Bonif.</th>
                          <th style={th}>Validade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{fmtDataHora(p.data)}</td>
                            <td style={td}>{p.produto}</td>
                            <td style={td}>{p.quantidade} {p.unidade}</td>
                            <td style={td}>{p.fornecedor || "—"}</td>
                            <td style={td}>{p.nf || "—"}</td>
                            <td style={td}>{p.bonificacao ? "Sim" : "—"}</td>
                            <td style={td}>{fmtData(p.validade)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {relatorio === "proximosValidade" && (
              <>
                <h3 style={reportTitle}>Produtos próximos da validade</h3>
                <p style={reportSubtitle}>Itens com validade nos próximos 90 dias</p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>Nenhum produto com validade cadastrada.</p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Produto</th>
                          <th style={th}>Qtd</th>
                          <th style={th}>Validade</th>
                          <th style={th}>Dias restantes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{p.nome}</td>
                            <td style={td}>{p.quantidade} {p.unidade}</td>
                            <td style={td}>{fmtData(p.validadeProxima)}</td>
                            <td style={{ ...td, color: p.diasRestantes <= 30 ? "#f85149" : p.diasRestantes <= 60 ? "#f1c40f" : "#e6edf3" }}>
                              {p.diasRestantes} dias
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {relatorio === "abaixoMinimo" && (
              <>
                <h3 style={reportTitle}>Produtos abaixo do mínimo</h3>
                <p style={reportSubtitle}>Requerem reposição urgente</p>
                {(!metricas.dados || metricas.dados.length === 0) ? (
                  <p style={emptyMsg}>Todos os produtos estão acima do mínimo.</p>
                ) : (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Produto</th>
                          <th style={th}>Atual</th>
                          <th style={th}>Em trânsito</th>
                          <th style={th}>Mínimo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.dados.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{p.nome}</td>
                            <td style={td}>{p.quantidade}</td>
                            <td style={td}>{p.emTransito}</td>
                            <td style={td}>{p.minimo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const mainWrap = { margin: "24px 0", padding: "0 20px 40px" };
const reportBox = {
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
  borderRadius: 8,
  padding: 20,
};
const reportTitle = { margin: "0 0 4px", color: "#e6edf3", fontSize: "1.125rem", fontWeight: 600 };
const reportSubtitle = { margin: "0 0 16px", color: "#8b949e", fontSize: "0.8125rem" };
const tableWrap = { overflowX: "auto" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#8b949e",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: BORDER,
};
const td = { padding: "10px 12px", borderBottom: BORDER, color: "#e6edf3" };
const emptyMsg = { color: "#8b949e", fontStyle: "italic", padding: 16, textAlign: "center" };
const selectStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.9rem",
};
const btnVoltar = {
  padding: "8px 16px",
  borderRadius: 6,
  border: BORDER,
  background: "transparent",
  color: "#8b949e",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
