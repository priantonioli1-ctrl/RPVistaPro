import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function NotasFiscaisFornecedor() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState(null);

  function getFornecedorNome() {
    const u = usuario || JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return (u?.nome || u?.empresa || "").toString().trim();
  }

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?.nome && !u?.empresa) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    const nome = getFornecedorNome();
    if (!nome) return;
    setLoading(true);
    fetch(`${API_URL}/api/notas-fiscais?fornecedor=${encodeURIComponent(nome)}`)
      .then((r) => r.json())
      .then((lista) => setNotas(Array.isArray(lista) ? lista : []))
      .catch(() => Swal.fire("Erro", "Não foi possível carregar as notas fiscais.", "error"))
      .finally(() => setLoading(false));
  }, [usuario]);

  if (!usuario) return null;

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div className="card-panel" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>📄 Notas Fiscais / Faturas</h2>
          <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "0.9375rem" }}>
            Pedidos aprovados são gerados automaticamente como nota fiscal. Use para controle e emissão ao comprador.
          </p>
          {loading ? (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          ) : notas.length === 0 ? (
            <p style={{ color: "#8b949e" }}>Nenhuma nota fiscal gerada ainda. Ao aprovar pedidos, elas aparecerão aqui.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notas.map((nf) => (
                <div key={nf._id} style={{ padding: 16, background: "rgba(255,255,255,0.03)", border: BORDER, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong style={{ color: "#e6edf3" }}>{nf.numero}</strong>
                      <span style={{ color: "#8b949e", marginLeft: 12 }}>
                        {new Date(nf.dataEmissao).toLocaleDateString("pt-BR")} — Cliente: {nf.comprador}
                      </span>
                      <div style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 4 }}>
                        Total: R$ {Number(nf.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetalhe(detalhe?._id === nf._id ? null : nf)}
                      style={btnVer}
                    >
                      {detalhe?._id === nf._id ? "Ocultar" : "Ver / Imprimir"}
                    </button>
                  </div>
                  {detalhe?._id === nf._id && (
                    <div style={{ marginTop: 16, padding: 16, background: "rgba(0,0,0,0.15)", borderRadius: 8 }} className="impressao-nf">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e6edf3" }}>NOTA FISCAL / FATURA</div>
                          <div style={{ color: "#8b949e" }}>Nº {nf.numero}</div>
                          <div style={{ color: "#8b949e" }}>Data: {new Date(nf.dataEmissao).toLocaleString("pt-BR")}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#8b949e" }}>Emitente (Fornecedor)</div>
                          <div style={{ fontWeight: 600, color: "#e6edf3" }}>{nf.fornecedor}</div>
                          <div style={{ color: "#8b949e", marginTop: 8 }}>Cliente (Comprador)</div>
                          <div style={{ fontWeight: 600, color: "#e6edf3" }}>{nf.comprador}</div>
                        </div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: BORDER, color: "#8b949e" }}>Produto</th>
                            <th style={{ padding: "8px", textAlign: "center", borderBottom: BORDER, color: "#8b949e" }}>Un.</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: BORDER, color: "#8b949e" }}>Qtd</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: BORDER, color: "#8b949e" }}>Preço un.</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: BORDER, color: "#8b949e" }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(nf.itens || []).map((item, i) => (
                            <tr key={i} style={{ borderBottom: BORDER }}>
                              <td style={{ padding: "8px" }}>{item.nome}</td>
                              <td style={{ padding: "8px", textAlign: "center" }}>{item.unidade || "un"}</td>
                              <td style={{ padding: "8px", textAlign: "right" }}>{item.quantidade}</td>
                              <td style={{ padding: "8px", textAlign: "right" }}>
                                R$ {Number(item.precoUnitario || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right" }}>
                                R$ {(item.quantidade * (item.precoUnitario || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ marginTop: 12, textAlign: "right", fontWeight: 700, fontSize: "1.125rem", color: "#e6edf3" }}>
                        Total: R$ {Number(nf.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <button type="button" onClick={() => window.print()} style={{ marginTop: 16, padding: "8px 16px", background: "var(--gradient-btn-orange)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        🖨️ Imprimir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const btnVer = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 4,
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
};
