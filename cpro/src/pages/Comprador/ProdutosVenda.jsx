import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function ProdutosVenda() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", descricao: "", fichaTecnica: "" });
  const [salvando, setSalvando] = useState(false);

  function getEmpresaId() {
    return usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  }

  useEffect(() => {
    const usuario = sessionStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }
    setUsuarioAtual(JSON.parse(usuario));
  }, [navigate]);

  useEffect(() => {
    if (!usuarioAtual) return;
    const empresaId = getEmpresaId();
    if (!empresaId) return;

    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/produtos-venda?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
      fetch(`${API_URL}/api/fichas-tecnicas?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
    ])
      .then(([listaProdutos, listaFichas]) => {
        setProdutos(Array.isArray(listaProdutos) ? listaProdutos : []);
        setFichas(Array.isArray(listaFichas) ? listaFichas : []);
      })
      .catch((err) => {
        console.error("Erro ao carregar:", err);
        Swal.fire("Erro", "Não foi possível carregar os dados.", "error");
      })
      .finally(() => setLoading(false));
  }, [usuarioAtual]);

  function abrirNovo() {
    setEditId(null);
    setForm({ nome: "", descricao: "", fichaTecnica: "" });
    setMostrarForm(true);
  }

  function editar(p) {
    setEditId(p._id);
    setForm({
      nome: p.nome || "",
      descricao: p.descricao || "",
      fichaTecnica: p.fichaTecnica?._id || p.fichaTecnica || "",
    });
    setMostrarForm(true);
  }

  function cancelarForm() {
    setMostrarForm(false);
    setEditId(null);
    setForm({ nome: "", descricao: "", fichaTecnica: "" });
  }

  async function salvar() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    const nome = (form.nome || "").trim();
    if (!nome) {
      Swal.fire("Atenção", "Informe o nome do produto.", "warning");
      return;
    }

    setSalvando(true);
    try {
      const body = {
        nome,
        descricao: (form.descricao || "").trim(),
        fichaTecnica: form.fichaTecnica || null,
      };
      if (editId) {
        const res = await fetch(`${API_URL}/api/produtos-venda/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Falha ao atualizar.");
      } else {
        const res = await fetch(`${API_URL}/api/produtos-venda`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresa: empresaId, ...body }),
        });
        if (!res.ok) throw new Error("Falha ao criar.");
      }
      Swal.fire("Sucesso", editId ? "Produto atualizado." : "Produto cadastrado.", "success");
      cancelarForm();
      const lista = await fetch(`${API_URL}/api/produtos-venda?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setProdutos(Array.isArray(lista) ? lista : []);
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível salvar.", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p) {
    const ok = await Swal.fire({
      title: "Excluir produto?",
      text: `"${p.nome}" será removido do cadastro.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f85149",
      confirmButtonText: "Excluir",
    });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/api/produtos-venda/${p._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      Swal.fire("Sucesso", "Produto excluído.", "success");
      setProdutos((prev) => prev.filter((x) => x._id !== p._id));
      if (editId === p._id) cancelarForm();
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível excluir.", "error");
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <div style={boxReq}>
          <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
            🛍️ Meus produtos
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 16, fontSize: "0.9375rem" }}>
            Cadastre os produtos que você vende. Cada produto pode ter uma ficha técnica vinculada para controle de composição e baixa no estoque.
          </p>

          {!mostrarForm ? (
            <button type="button" onClick={abrirNovo} style={btnNovo}>
              + Novo produto
            </button>
          ) : (
            <div style={formCard}>
              <h3 style={{ color: "#e6edf3", marginBottom: 16, fontSize: "1.125rem" }}>
                {editId ? "Editar produto" : "Novo produto"}
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Nome do produto *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex.: Bolo de chocolate, Suco verde 500ml"
                  style={inputStyle}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Descrição (opcional)</label>
                <input
                  value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex.: Porção individual"
                  style={inputStyle}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Ficha técnica</label>
                <select
                  value={form.fichaTecnica}
                  onChange={(e) => setForm((p) => ({ ...p, fichaTecnica: e.target.value }))}
                  style={inputStyle}
                  className="campo-fundo-claro"
                >
                  <option value="">Nenhuma</option>
                  {fichas.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.nome} {f.rendimento ? `(${f.rendimento})` : ""}
                    </option>
                  ))}
                </select>
                {fichas.length === 0 && (
                  <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 6 }}>
                    Crie fichas técnicas em Saída de Mercadorias → Fichas técnicas.
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={salvar} disabled={salvando} style={btnSalvar}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={cancelarForm} style={btnSecundario}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ color: "#8b949e", marginTop: 24 }}>Carregando...</p>
          ) : produtos.length === 0 ? (
            <p style={{ color: "#8b949e", marginTop: 24, fontStyle: "italic" }}>
              Nenhum produto cadastrado. Clique em &quot;Novo produto&quot; para começar.
            </p>
          ) : (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: "#e6edf3", marginBottom: 12, fontSize: "1.125rem" }}>Produtos cadastrados</h3>
              {produtos.map((p) => (
                <div key={p._id} style={itemCard}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#e6edf3", fontSize: "1.0625rem" }}>{p.nome}</strong>
                    {p.descricao && (
                      <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "4px 0 0" }}>{p.descricao}</p>
                    )}
                    {p.fichaTecnica ? (
                      <span style={badgeFicha}>
                        📐 {typeof p.fichaTecnica === "object" ? p.fichaTecnica.nome : "Ficha vinculada"}
                        {p.fichaTecnica?.rendimento && ` (${p.fichaTecnica.rendimento})`}
                      </span>
                    ) : (
                      <span style={{ ...badgeFicha, background: "rgba(139,148,158,0.3)" }}>Sem ficha técnica</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => editar(p)} style={btnEditar}>
                      Editar
                    </button>
                    <button type="button" onClick={() => excluir(p)} style={btnExcluir}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const mainWrap = {
  width: "100%",
  margin: "24px 0",
  padding: "0 20px 40px",
  boxSizing: "border-box",
};

const boxReq = {
  color: "#e6edf3",
  padding: 24,
};

const btnNovo = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  background: "#238636",
  color: "#fff",
};

const formCard = {
  padding: "16px 0",
  borderTop: BORDER,
  marginTop: 16,
};

const inputStyle = {
  width: "100%",
  maxWidth: 400,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "var(--main-bg)",
  color: "#e6edf3",
  fontSize: "1rem",
  boxSizing: "border-box",
};

const btnSalvar = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
};

const btnSecundario = {
  padding: "10px 18px",
  border: BORDER,
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  background: "transparent",
  color: "#8b949e",
};

const itemCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: "20px 24px",
  marginBottom: 10,
  borderBottom: BORDER,
  borderLeft: "4px solid #20b5a6",
};

const badgeFicha = {
  display: "inline-block",
  marginTop: 8,
  padding: "4px 10px",
  borderRadius: 4,
  background: "rgba(37,193,155,0.2)",
  color: "#25C19B",
  fontSize: "0.8125rem",
};

const btnEditar = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.875rem",
  background: "#8b949e",
  color: "#fff",
};

const btnExcluir = {
  padding: "8px 14px",
  border: "1px solid rgba(248,81,73,0.5)",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.875rem",
  background: "transparent",
  color: "#f85149",
};
