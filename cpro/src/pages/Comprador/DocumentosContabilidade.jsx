import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function DocumentosContabilidade() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?._id && !u?.compradorId) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    if (!usuario) return;
    const empresaId = (usuario.compradorId || (usuario.tipo === "comprador" ? usuario._id : null) || "").toString().trim();
    if (!empresaId) return;
    setLoading(true);
    fetch(`${API_URL}/api/notas-fiscais?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setNotas(Array.isArray(lista) ? lista : []))
      .catch(() => Swal.fire("Erro", "Não foi possível carregar os documentos.", "error"))
      .finally(() => setLoading(false));
  }, [usuario]);

  if (!usuario) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div className="card-panel" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>📁 Documentos para contabilidade</h2>
          <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "0.9375rem" }}>
            Notas fiscais dos pedidos aprovados ficam arquivadas aqui. Use para enviar à contabilidade quando necessário.
          </p>
          {loading ? (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          ) : notas.length === 0 ? (
            <p style={{ color: "#8b949e" }}>Nenhum documento arquivado. Ao aprovar pedidos com fornecedores, as notas serão geradas e listadas aqui.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notas.map((nf) => (
                <div key={nf._id} style={{ padding: "20px 24px", borderBottom: BORDER, borderLeft: "4px solid #20b5a6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong style={{ color: "#e6edf3" }}>{nf.numero}</strong>
                      <span style={{ color: "#8b949e", marginLeft: 12 }}>
                        {new Date(nf.dataEmissao).toLocaleDateString("pt-BR")} — Fornecedor: {nf.fornecedor}
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
                    <div style={{ marginTop: 16, padding: 16, borderLeft: "4px solid rgba(255,255,255,0.2)" }} className="impressao-nf">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e6edf3" }}>NOTA FISCAL (arquivo contábil)</div>
                          <div style={{ color: "#8b949e" }}>Nº {nf.numero}</div>
                          <div style={{ color: "#8b949e" }}>Data: {new Date(nf.dataEmissao).toLocaleString("pt-BR")}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#8b949e" }}>Fornecedor</div>
                          <div style={{ fontWeight: 600, color: "#e6edf3" }}>{nf.fornecedor}</div>
                          <div style={{ color: "#8b949e", marginTop: 8 }}>Comprador</div>
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
