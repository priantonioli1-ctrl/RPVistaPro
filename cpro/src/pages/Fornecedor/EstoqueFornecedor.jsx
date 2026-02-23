import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function EstoqueFornecedor() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function getFornecedorId() {
    const u = usuario || JSON.parse(sessionStorage.getItem("usuario") || "{}");
    return (u?.nome || u?.empresa || u?._id || "").toString().trim();
  }

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?.nome && !u?.empresa && !u?._id) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  useEffect(() => {
    const id = getFornecedorId();
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/estoque-fornecedor/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((lista) => setItens(Array.isArray(lista) ? lista : []))
      .catch(() => Swal.fire("Erro", "Não foi possível carregar o estoque.", "error"))
      .finally(() => setLoading(false));
  }, [usuario]);

  function setQtd(index, value) {
    const v = String(value).replace(/\D/g, "");
    const num = v === "" ? "" : Math.max(0, parseInt(v, 10));
    setItens((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantidade: num === "" ? 0 : num };
      return next;
    });
  }

  async function salvar() {
    const id = getFornecedorId();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/estoque-fornecedor/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: itens.map((i) => ({
            nome: (i.nome || "").trim(),
            unidade: (i.unidade || "un").trim(),
            quantidade: Number(i.quantidade) || 0,
          })),
        }),
      });
      if (!res.ok) throw new Error("Falha ao salvar.");
      Swal.fire("Salvo", "Estoque atualizado.", "success");
    } catch {
      Swal.fire("Erro", "Não foi possível salvar o estoque.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!usuario) return null;

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div className="card-panel" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>📊 Estoque (fornecedor)</h2>
          <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "0.9375rem" }}>
            Controle as quantidades disponíveis para venda. Itens em falta aparecerão como &quot;Em falta&quot; para o comprador na cotação.
          </p>
          {loading ? (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          ) : itens.length === 0 ? (
            <p style={{ color: "#8b949e" }}>Nenhum item. Cadastre seu catálogo em Meu Catálogo para os itens aparecerem aqui.</p>
          ) : (
            <>
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "10px", textAlign: "left", borderBottom: BORDER, color: "#8b949e" }}>Produto</th>
                      <th style={{ padding: "10px", textAlign: "left", borderBottom: BORDER, color: "#8b949e" }}>Unidade</th>
                      <th style={{ padding: "10px", textAlign: "right", borderBottom: BORDER, color: "#8b949e" }}>Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: BORDER }}>
                        <td style={{ padding: "10px" }}>{item.nome}</td>
                        <td style={{ padding: "10px", color: "#8b949e" }}>{item.unidade || "un"}</td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <input
                            type="number"
                            min={0}
                            value={item.quantidade ?? ""}
                            onChange={(e) => setQtd(idx, e.target.value)}
                            style={{
                              width: 90,
                              padding: "8px",
                              borderRadius: 4,
                              border: BORDER,
                              background: "rgba(0,0,0,0.2)",
                              color: "#e6edf3",
                              textAlign: "right",
                            }}
                            className="campo-fundo-claro"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={salvar} disabled={saving} style={btnSalvar}>
                {saving ? "Salvando..." : "Salvar estoque"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const btnSalvar = {
  padding: "10px 20px",
  border: "none",
  borderRadius: 4,
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
};
