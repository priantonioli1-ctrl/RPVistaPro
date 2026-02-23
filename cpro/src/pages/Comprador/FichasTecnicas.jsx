// src/pages/Comprador/FichasTecnicas.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

function chaveItem(nome, unidade) {
  return `${nome}::${unidade || "un"}`;
}

export default function FichasTecnicas() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [catalogComEstoque, setCatalogComEstoque] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormFicha, setMostrarFormFicha] = useState(false);
  const [fichaEditId, setFichaEditId] = useState(null);
  const [formFicha, setFormFicha] = useState({ nome: "", descricao: "", rendimento: "1 unidade", itens: [] });
  const [salvandoFicha, setSalvandoFicha] = useState(false);
  const [aplicandoFichaId, setAplicandoFichaId] = useState(null);

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
      fetch(`${API_URL}/api/catalogos/${empresaId}`).then((r) => r.json()),
      fetch(`${API_URL}/api/estoque/${empresaId}`).then((r) => r.json()),
    ])
      .then(([listaProdutos, listaFichas, dataCat, itensEstoque]) => {
        setProdutos(Array.isArray(listaProdutos) ? listaProdutos : []);
        setFichas(Array.isArray(listaFichas) ? listaFichas : []);
        const listaCat = Array.isArray(dataCat?.catalogo) ? dataCat.catalogo : [];
        const itensEst = Array.isArray(itensEstoque) ? itensEstoque : (itensEstoque?.itens ? itensEstoque.itens : []);
        const mapaEstoque = new Map();
        itensEst.forEach((i) => {
          const chave = `${(i.nome || "").trim().toLowerCase()}::${(i.unidade || "un").trim().toLowerCase()}`;
          mapaEstoque.set(chave, Number(i.quantidade) || 0);
        });
        const itens = listaCat.map((item) => {
          const nome = (item.nome || "").trim();
          const unidade = (item.unidade || "").trim() || "un";
          const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
          return {
            secao: (item.secao || "").trim() || "Sem seção",
            nome,
            marca: (item.marca || "").trim(),
            unidade,
            quantidadeDisponivel: mapaEstoque.get(chave) ?? 0,
          };
        });
        setCatalogComEstoque(itens);
        setCategorias([...new Set(itens.map((i) => i.secao).filter(Boolean))].sort());
      })
      .catch((err) => {
        console.error("Erro ao carregar:", err);
        Swal.fire("Erro", "Não foi possível carregar os dados.", "error");
      })
      .finally(() => setLoading(false));
  }, [usuarioAtual]);

  function editarFicha(f) {
    setMostrarFormFicha(true);
    setFichaEditId(f._id);
    setFormFicha({
      nome: f.nome || "",
      descricao: f.descricao || "",
      rendimento: f.rendimento || "1 unidade",
      itens: (f.itens || []).map((i) => ({ nome: i.nome, unidade: i.unidade || "un", quantidade: i.quantidade })),
    });
  }

  function novaFicha() {
    setMostrarFormFicha(true);
    setFichaEditId(null);
    setFormFicha({ nome: "", descricao: "", rendimento: "1 unidade", itens: [] });
  }

  function addItemFicha() {
    setFormFicha((prev) => ({
      ...prev,
      itens: [...prev.itens, { nome: "", unidade: "un", quantidade: 0 }],
    }));
  }

  function updateItemFicha(idx, field, value) {
    setFormFicha((prev) => {
      const itens = [...prev.itens];
      itens[idx] = { ...itens[idx], [field]: field === "quantidade" ? Number(value) || 0 : value };
      return { ...prev, itens };
    });
  }

  function removeItemFicha(idx) {
    setFormFicha((prev) => ({ ...prev, itens: prev.itens.filter((_, i) => i !== idx) }));
  }

  async function salvarFicha() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    const itensValidos = formFicha.itens.filter((i) => (i.nome || "").trim() && Number(i.quantidade) > 0);
    if (!(formFicha.nome || "").trim()) {
      Swal.fire("Atenção", "Informe o nome da ficha técnica.", "warning");
      return;
    }
    if (itensValidos.length === 0) {
      Swal.fire("Atenção", "Adicione pelo menos um item com quantidade.", "warning");
      return;
    }
    setSalvandoFicha(true);
    try {
      const body = {
        empresa: empresaId,
        nome: formFicha.nome.trim(),
        descricao: (formFicha.descricao || "").trim(),
        rendimento: (formFicha.rendimento || "1 unidade").trim(),
        itens: itensValidos.map((i) => ({ nome: i.nome.trim(), unidade: (i.unidade || "un").trim(), quantidade: Number(i.quantidade) })),
      };
      if (fichaEditId) {
        const res = await fetch(`${API_URL}/api/fichas-tecnicas/${fichaEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Falha ao atualizar.");
      } else {
        const res = await fetch(`${API_URL}/api/fichas-tecnicas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Falha ao criar.");
      }
      Swal.fire("Sucesso", "Ficha técnica salva.", "success");
      setMostrarFormFicha(false);
      setFichaEditId(null);
      setFormFicha({ nome: "", descricao: "", rendimento: "1 unidade", itens: [] });
      carregarFichas();
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível salvar a ficha.", "error");
    } finally {
      setSalvandoFicha(false);
    }
  }

  async function excluirFicha(f) {
    const ok = await Swal.fire({
      title: "Excluir ficha?",
      text: `"${f.nome}" será excluída.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f85149",
      confirmButtonText: "Excluir",
    });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/api/fichas-tecnicas/${f._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      Swal.fire("Sucesso", "Ficha excluída.", "success");
      carregarFichas();
      if (fichaEditId === f._id) {
        setMostrarFormFicha(false);
        setFichaEditId(null);
        setFormFicha({ nome: "", descricao: "", rendimento: "1 unidade", itens: [] });
      }
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível excluir.", "error");
    }
  }

  async function aplicarFicha(ficha) {
    const { value: quantidade } = await Swal.fire({
      title: `Aplicar "${ficha.nome}"`,
      html: `<p style="color:#8b949e;margin-bottom:12px">Informe a quantidade produzida (ex.: 5 para 5 porções). O estoque será baixado conforme a composição.</p>
             <input id="qtd-aplicar" type="number" min="0.01" step="0.01" value="1" class="swal2-input" placeholder="Quantidade">`,
      showCancelButton: true,
      confirmButtonText: "Aplicar e dar baixa",
      confirmButtonColor: "#20b5a6",
      preConfirm: () => {
        const val = document.getElementById("qtd-aplicar").value;
        const num = parseFloat(val);
        if (!Number.isFinite(num) || num <= 0) {
          Swal.showValidationMessage("Informe uma quantidade válida.");
          return;
        }
        return num;
      },
    });
    if (quantidade == null) return;
    setAplicandoFichaId(ficha._id);
    try {
      const res = await fetch(`${API_URL}/api/fichas-tecnicas/${ficha._id}/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.faltando?.length
          ? `Estoque insuficiente: ${data.faltando.map((x) => `${x.nome} (necessário: ${x.necessario} ${x.unidade}, disponível: ${x.disponivel})`).join("; ")}`
          : (data.error || "Falha ao aplicar.");
        Swal.fire("Estoque insuficiente", msg, "warning");
        return;
      }
      Swal.fire("Sucesso", data.message || "Baixa realizada no estoque.", "success");
      carregarFichas();
      recarregarCatalog();
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível aplicar a ficha.", "error");
    } finally {
      setAplicandoFichaId(null);
    }
  }

  async function carregarFichas() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    try {
      const res = await fetch(`${API_URL}/api/fichas-tecnicas?empresa=${encodeURIComponent(empresaId)}`);
      const lista = await res.json();
      setFichas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Erro ao carregar fichas:", err);
    }
  }

  async function recarregarCatalog() {
    const empresaId = getEmpresaId();
    if (!empresaId || catalogComEstoque.length === 0) return;
    try {
      const [dataCat, itensEstoque] = await Promise.all([
        fetch(`${API_URL}/api/catalogos/${empresaId}`).then((r) => r.json()),
        fetch(`${API_URL}/api/estoque/${empresaId}`).then((r) => r.json()),
      ]);
      const listaCat = Array.isArray(dataCat?.catalogo) ? dataCat.catalogo : [];
      const itensEst = Array.isArray(itensEstoque) ? itensEstoque : (itensEstoque?.itens ? itensEstoque.itens : []);
      const mapaEstoque = new Map();
      itensEst.forEach((i) => {
        const chave = `${(i.nome || "").trim().toLowerCase()}::${(i.unidade || "un").trim().toLowerCase()}`;
        mapaEstoque.set(chave, Number(i.quantidade) || 0);
      });
      const itens = listaCat.map((item) => {
        const nome = (item.nome || "").trim();
        const unidade = (item.unidade || "").trim() || "un";
        const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
        return {
          secao: (item.secao || "").trim() || "Sem seção",
          nome,
          marca: (item.marca || "").trim(),
          unidade,
          quantidadeDisponivel: mapaEstoque.get(chave) ?? 0,
        };
      });
      setCatalogComEstoque(itens);
    } catch (err) {
      console.error("Erro ao atualizar catálogo:", err);
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        {/* Catálogo de produtos (Meus Produtos) */}
        <div style={boxReq}>
          <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
            📦 Catálogo de produtos
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 16, fontSize: "0.9375rem" }}>
            Produtos vendidos neste estabelecimento. Cadastre em Meus Produtos e vincule fichas técnicas para controle de composição.
          </p>
          {loading ? (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          ) : produtos.length === 0 ? (
            <p style={{ color: "#8b949e" }}>
              Nenhum produto cadastrado. <button type="button" onClick={() => navigate("/produtos-venda")} style={linkBtn}>Ir para Meus Produtos</button> para cadastrar.
            </p>
          ) : (
            <div style={gridProdutos}>
              {produtos.map((p) => (
                <div key={p._id} style={cardProduto}>
                  <strong style={{ color: "#e6edf3", fontSize: "1rem" }}>{p.nome}</strong>
                  {p.descricao && <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "4px 0 0" }}>{p.descricao}</p>}
                  {p.fichaTecnica ? (
                    <span style={badgeFicha}>📐 {typeof p.fichaTecnica === "object" ? p.fichaTecnica.nome : "Ficha vinculada"}</span>
                  ) : (
                    <span style={{ ...badgeFicha, background: "rgba(139,148,158,0.3)" }}>Sem ficha técnica</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button type="button" onClick={() => navigate("/produtos-venda")} style={btnSecundario}>
              Gerenciar produtos
            </button>
          </div>
        </div>

        {/* Fichas técnicas */}
        <div style={boxReq}>
          <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
            📐 Fichas técnicas
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 16, fontSize: "0.9375rem" }}>
            Crie composições (receitas/fórmulas) e dê baixa no estoque de uma vez conforme a quantidade produzida. Vincule às fichas em Meus Produtos.
          </p>

          {mostrarFormFicha ? (
            <div style={formFichaBox}>
              <h3 style={{ color: "#e6edf3", marginBottom: 16, fontSize: "1.125rem" }}>{fichaEditId ? "Editar ficha" : "Nova ficha técnica"}</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Nome da ficha *</label>
                <input
                  value={formFicha.nome}
                  onChange={(e) => setFormFicha((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex.: Bolo de chocolate, Suco verde 1L"
                  style={inputDark}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Rendimento (informativo)</label>
                <input
                  value={formFicha.rendimento}
                  onChange={(e) => setFormFicha((p) => ({ ...p, rendimento: e.target.value }))}
                  placeholder="Ex.: 10 porções, 1L"
                  style={inputDark}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Descrição (opcional)</label>
                <input
                  value={formFicha.descricao}
                  onChange={(e) => setFormFicha((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex.: Receita padrão"
                  style={inputDark}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>Itens da composição (qtd por unidade) *</span>
                <button type="button" onClick={addItemFicha} style={{ ...btn, background: "#238636", marginLeft: 12, padding: "6px 12px", fontSize: "0.875rem" }}>+ Item</button>
                {catalogComEstoque.length > 0 && (
                  <select
                    style={{ ...selectDark, marginLeft: 8, maxWidth: 260, display: "inline-block" }}
                    className="campo-fundo-claro"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      e.target.value = "";
                      if (!v) return;
                      const [nome, unidade] = v.split("::");
                      if (nome && unidade) {
                        setFormFicha((prev) => ({
                          ...prev,
                          itens: [...prev.itens, { nome, unidade: unidade || "un", quantidade: 0 }],
                        }));
                      }
                    }}
                  >
                    <option value="">Adicionar do catálogo...</option>
                    {categorias.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {catalogComEstoque.filter((i) => (i.secao || "Sem seção") === cat).map((p) => (
                          <option key={chaveItem(p.nome, p.unidade)} value={`${p.nome}::${p.unidade || "un"}`}>
                            {p.nome} ({p.unidade || "un"})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thDark, padding: "8px" }}>Produto</th>
                      <th style={{ ...thDark, padding: "8px" }}>Un.</th>
                      <th style={{ ...thDark, padding: "8px" }}>Qtd/un.</th>
                      <th style={{ ...thDark, padding: "8px", width: 48 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formFicha.itens.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: BORDER }}>
                        <td style={{ padding: "6px 8px" }}>
                          <input
                            value={it.nome}
                            onChange={(e) => updateItemFicha(idx, "nome", e.target.value)}
                            placeholder="Nome"
                            style={{ ...inputNumDark, width: "100%", maxWidth: 200 }}
                            className="campo-fundo-claro"
                          />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input
                            value={it.unidade}
                            onChange={(e) => updateItemFicha(idx, "unidade", e.target.value)}
                            placeholder="un"
                            style={{ ...inputNumDark, width: 64 }}
                            className="campo-fundo-claro"
                          />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.quantidade || ""}
                            onChange={(e) => updateItemFicha(idx, "quantidade", e.target.value)}
                            placeholder="0"
                            style={inputNumDark}
                            className="campo-fundo-claro"
                          />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <button type="button" onClick={() => removeItemFicha(idx)} style={{ ...btn, background: "transparent", color: "#f85149", padding: "4px 8px" }}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={salvarFicha} disabled={salvandoFicha} style={{ ...btn, background: "var(--gradient-btn-primary)", color: "#0B1C26" }}>
                  {salvandoFicha ? "Salvando..." : "Salvar ficha"}
                </button>
                <button type="button" onClick={() => { setMostrarFormFicha(false); setFichaEditId(null); setFormFicha({ nome: "", descricao: "", rendimento: "1 unidade", itens: [] }); carregarFichas(); }} style={{ ...btn, background: "#8b949e" }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={novaFicha} style={{ ...btn, background: "#238636", marginBottom: 16 }}>+ Nova ficha técnica</button>
              {fichas.length === 0 ? (
                <p style={{ color: "#8b949e" }}>Nenhuma ficha cadastrada. Clique em &quot;Nova ficha técnica&quot; para criar.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {fichas.map((f) => (
                    <div key={f._id} style={{ ...boxReq, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <strong style={{ color: "#e6edf3", fontSize: "1.0625rem" }}>{f.nome}</strong>
                          {f.rendimento && <span style={{ color: "#8b949e", fontSize: "0.875rem", marginLeft: 8 }}>({f.rendimento})</span>}
                          <div style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 4 }}>
                            {f.itens?.length || 0} itens: {f.itens?.map((i) => `${i.nome} ${i.quantidade} ${i.unidade}`).join("; ") || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => aplicarFicha(f)} disabled={aplicandoFichaId === f._id} style={{ ...btn, background: "var(--gradient-btn-primary)", color: "#0B1C26", padding: "8px 14px", fontSize: "0.875rem" }}>
                            {aplicandoFichaId === f._id ? "Aplicando..." : "Aplicar (dar baixa)"}
                          </button>
                          <button type="button" onClick={() => editarFicha(f)} style={{ ...btn, background: "#8b949e", padding: "8px 14px", fontSize: "0.875rem" }}>Editar</button>
                          <button type="button" onClick={() => excluirFicha(f)} style={{ ...btn, background: "transparent", border: "1px solid #f85149", color: "#f85149", padding: "8px 14px", fontSize: "0.875rem" }}>Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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
  marginBottom: 18,
  borderBottom: BORDER,
};

const gridProdutos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 12,
};

const cardProduto = {
  padding: 16,
  borderRadius: 4,
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
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

const linkBtn = {
  background: "none",
  border: "none",
  color: "#00F2FF",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: "inherit",
};

const btn = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  color: "#fff",
};

const btnSecundario = {
  ...btn,
  background: "var(--gradient-btn-orange)",
};

const formFichaBox = {
  padding: "20px 0",
  borderTop: BORDER,
  marginTop: 16,
};

const inputDark = {
  width: "100%",
  maxWidth: 400,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
  boxSizing: "border-box",
};

const selectDark = {
  width: "100%",
  maxWidth: 320,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
};

const thDark = {
  background: "rgba(255,255,255,0.06)",
  color: "#8b949e",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const inputNumDark = {
  width: 72,
  padding: "6px 8px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};
