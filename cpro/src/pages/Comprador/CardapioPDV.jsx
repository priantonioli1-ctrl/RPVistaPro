// CardapioPDV.jsx — Cardápio do PDV (pratos prontos, separado do catálogo de matéria-prima)
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function CardapioPDV() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [categoriasApi, setCategoriasApi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ codigo: "", codigoBarras: "", nome: "", descricao: "", categoria: "Geral", preco: "", unidade: "un" });
  const [mostrarColar, setMostrarColar] = useState(false);
  const [textoColar, setTextoColar] = useState("");

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) {
      navigate("/");
      return;
    }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
      fetch(`${API_URL}/api/cardapio-pdv/categorias?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()).catch(() => []),
    ])
      .then(([lista, cats]) => {
        setItens(Array.isArray(lista) ? lista : []);
        setCategoriasApi(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  const categorias = useMemo(() => {
    const dosItens = [...new Set(itens.map((i) => (String(i.categoria || "").trim() || "Geral")))];
    const daApi = Array.isArray(categoriasApi) ? categoriasApi : [];
    const todas = [...new Set([...dosItens, ...daApi])].filter(Boolean).sort((a, b) => (a === "Geral" ? -1 : b === "Geral" ? 1 : a.localeCompare(b)));
    return todas.length ? todas : ["Geral"];
  }, [itens, categoriasApi]);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const cat = categoriaFiltro || "";
    return itens.filter((i) => {
      const matchBusca =
        !b ||
        (i.nome || "").toLowerCase().includes(b) ||
        (i.codigo || "").toLowerCase().includes(b) ||
        (i.codigoBarras || "").includes(b) ||
        (i.descricao || "").toLowerCase().includes(b);
      const matchCat = !cat || (i.categoria || "Geral") === cat;
      return matchBusca && matchCat;
    });
  }, [itens, busca, categoriaFiltro]);

  async function salvar() {
    const nome = (form.nome || "").trim();
    if (!nome) {
      Swal.fire("Atenção", "Nome é obrigatório.", "warning");
      return;
    }
    const preco = parseFloat(String(form.preco || 0).replace(",", ".")) || 0;
    try {
      if (editId) {
        const res = await fetch(`${API_URL}/api/cardapio-pdv/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: form.codigo.trim() || null,
            codigoBarras: form.codigoBarras.trim() || null,
            nome,
            descricao: form.descricao.trim() || "",
            categoria: form.categoria.trim() || "Geral",
            preco,
            unidade: form.unidade.trim() || "un",
          }),
        });
        if (!res.ok) throw new Error("Erro ao atualizar.");
      } else {
        const res = await fetch(`${API_URL}/api/cardapio-pdv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa: empresaId,
            codigo: form.codigo.trim() || null,
            codigoBarras: form.codigoBarras.trim() || null,
            nome,
            descricao: form.descricao.trim() || "",
            categoria: form.categoria.trim() || "Geral",
            preco,
            unidade: form.unidade.trim() || "un",
          }),
        });
        if (!res.ok) throw new Error("Erro ao criar.");
      }
      Swal.fire("Sucesso", editId ? "Item atualizado." : "Item adicionado.", "success");
      setMostrarForm(false);
      setEditId(null);
      setForm({ codigo: "", codigoBarras: "", nome: "", descricao: "", categoria: "Geral", preco: "", unidade: "un" });
      const lista = await fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  async function excluir(item) {
    const ok = await Swal.fire({
      title: "Excluir item?",
      text: `"${item.nome}" será removido do cardápio.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
    });
    if (!ok.isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/api/cardapio-pdv/${item._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir.");
      setItens((prev) => prev.filter((i) => i._id !== item._id));
      Swal.fire("Sucesso", "Item excluído.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  async function importarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      Swal.fire("Formato inválido", "Use .xlsx, .xls ou .csv.", "warning");
      e.target.value = "";
      return;
    }
    try {
      let rows = [];
      if (ext.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const sep = lines[0]?.includes(";") ? ";" : ",";
        const headers = (lines[0] || "").split(sep).map((h) => String(h || "").toLowerCase().trim());
        const idx = (names) => {
          for (const n of names) {
            const i = headers.findIndex((h) => h.includes(n));
            if (i >= 0) return i;
          }
          return -1;
        };
        const idxNome = idx(["nome", "produto"]) >= 0 ? idx(["nome", "produto"]) : 0;
        const idxPreco = idx(["preco", "valor", "preço"]) >= 0 ? idx(["preco", "valor", "preço"]) : 1;
        const idxCat = idx(["categoria", "secao", "seção"]);
        const idxCodigo = idx(["codigo", "código"]);
        const idxCodBarras = idx(["codigobarras", "ean", "codigo de barras"]);
        const idxUnidade = idx(["unidade", "unid"]);
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep);
          const nome = String(cols[idxNome] || "").trim();
          if (!nome) continue;
          rows.push({
            nome,
            preco: cols[idxPreco] ?? 0,
            categoria: idxCat >= 0 ? (cols[idxCat] || "Geral") : "Geral",
            codigo: idxCodigo >= 0 ? cols[idxCodigo] : "",
            codigoBarras: idxCodBarras >= 0 ? cols[idxCodBarras] : "",
            unidade: idxUnidade >= 0 ? cols[idxUnidade] || "un" : "un",
          });
        }
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sh = wb.Sheets[wb.SheetNames[0]];
        const mat = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
        const headers = (mat[0] || []).map((h) => String(h || "").toLowerCase().trim());
        const idx = (names) => {
          for (const n of names) {
            const i = headers.findIndex((h) => h.includes(n));
            if (i >= 0) return i;
          }
          return -1;
        };
        const idxNome = idx(["nome", "produto"]) >= 0 ? idx(["nome", "produto"]) : 0;
        const idxPreco = idx(["preco", "valor", "preço"]) >= 0 ? idx(["preco", "valor", "preço"]) : 1;
        const idxCat = idx(["categoria", "secao", "seção"]);
        const idxCodigo = idx(["codigo", "código"]);
        const idxCodBarras = idx(["codigobarras", "ean"]);
        const idxUnidade = idx(["unidade", "unid"]);
        for (let i = 1; i < mat.length; i++) {
          const row = mat[i] || [];
          const nome = String(row[idxNome] ?? "").trim();
          if (!nome) continue;
          rows.push({
            nome,
            preco: row[idxPreco] ?? 0,
            categoria: idxCat >= 0 ? (row[idxCat] ?? "Geral") : "Geral",
            codigo: idxCodigo >= 0 ? row[idxCodigo] : "",
            codigoBarras: idxCodBarras >= 0 ? row[idxCodBarras] : "",
            unidade: idxUnidade >= 0 ? row[idxUnidade] || "un" : "un",
          });
        }
      }
      if (rows.length === 0) {
        Swal.fire("Aviso", "Nenhuma linha válida encontrada.", "warning");
        e.target.value = "";
        return;
      }
      const res = await fetch(`${API_URL}/api/cardapio-pdv/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, itens: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar.");
      Swal.fire("Sucesso", `${data.count || rows.length} itens importados.`, "success");
      const lista = await fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
    e.target.value = "";
  }

  async function colarEImportar() {
    const texto = textoColar.trim();
    if (!texto) {
      Swal.fire("Atenção", "Cole o conteúdo da planilha ou PDF.", "warning");
      return;
    }
    const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sep = linhas[0]?.includes(";") ? ";" : linhas[0]?.includes("\t") ? "\t" : ",";
    const headers = (linhas[0] || "").split(sep).map((h) => String(h || "").toLowerCase().trim());
    const idx = (names) => {
      for (const n of names) {
        const i = headers.findIndex((h) => h.includes(n));
        if (i >= 0) return i;
      }
      return -1;
    };
    const idxNome = idx(["nome", "produto"]) >= 0 ? idx(["nome", "produto"]) : 0;
    const idxPreco = idx(["preco", "valor", "preço"]) >= 0 ? idx(["preco", "valor", "preço"]) : 1;
    const idxCat = idx(["categoria", "secao", "seção"]);
    const idxCodigo = idx(["codigo", "código"]);
    const idxCodBarras = idx(["codigobarras", "ean"]);
    const idxUnidade = idx(["unidade", "unid"]);
    const rows = [];
    const start = headers.some((h) => h.includes("nome") || h.includes("produto")) ? 1 : 0;
    for (let i = start; i < linhas.length; i++) {
      const cols = linhas[i].split(sep);
      const nome = String(cols[idxNome] || cols[0] || "").trim();
      if (!nome || /c[oó]digo|produto|nome/i.test(nome)) continue;
      rows.push({
        nome,
        preco: cols[idxPreco] ?? cols[1] ?? 0,
        categoria: idxCat >= 0 ? (cols[idxCat] || "Geral") : "Geral",
        codigo: idxCodigo >= 0 ? cols[idxCodigo] : "",
        codigoBarras: idxCodBarras >= 0 ? cols[idxCodBarras] : "",
        unidade: idxUnidade >= 0 ? cols[idxUnidade] || "un" : "un",
      });
    }
    if (rows.length === 0) {
      Swal.fire("Aviso", "Nenhuma linha válida. Cole dados no formato: nome;preco;categoria ou similares.", "warning");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/cardapio-pdv/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, itens: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar.");
      Swal.fire("Sucesso", `${data.count || rows.length} itens importados.`, "success");
      setMostrarColar(false);
      setTextoColar("");
      const lista = await fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Cardápio PDV</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>
              Pratos prontos e produtos finais para venda. Separado do catálogo de matéria-prima.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importarArquivo} style={{ display: "none" }} id="importar-cardapio" />
            <button type="button" onClick={() => document.getElementById("importar-cardapio").click()} style={btnSecundario}>
              Importar planilha
            </button>
            <button type="button" onClick={() => setMostrarColar(!mostrarColar)} style={btnSecundario}>
              Colar texto (PDF, etc.)
            </button>
            <button type="button" onClick={() => navigate("/frente-de-loja")} style={btnPrincipal}>
              Abrir PDV
            </button>
          </div>
        </div>

        {/* Busca e filtros */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar por produto, código ou código de barras..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ flex: "1 1 280px", padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "1rem" }}
            className="campo-fundo-claro"
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", minWidth: 160 }}
            className="campo-fundo-claro"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="button" onClick={() => { setEditId(null); setForm({ codigo: "", codigoBarras: "", nome: "", descricao: "", categoria: "Geral", preco: "", unidade: "un" }); setMostrarForm(true); }} style={btnPrincipal}>
            + Novo item
          </button>
        </div>

        {mostrarForm && (
          <div style={{ marginBottom: 24, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>{editId ? "Editar item" : "Novo item"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div><label style={label}>Código</label><input style={input} value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} placeholder="Código" className="campo-fundo-claro" /></div>
              <div><label style={label}>Código de barras</label><input style={input} value={form.codigoBarras} onChange={(e) => setForm((p) => ({ ...p, codigoBarras: e.target.value }))} placeholder="EAN/GTIN" className="campo-fundo-claro" /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={label}>Nome *</label><input style={input} value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome do produto/prato" className="campo-fundo-claro" /></div>
              <div><label style={label}>Categoria</label><input style={input} value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} placeholder="Ex.: Bebidas, Pratos" className="campo-fundo-claro" /></div>
              <div><label style={label}>Preço (R$)</label><input style={input} type="number" step="0.01" value={form.preco} onChange={(e) => setForm((p) => ({ ...p, preco: e.target.value }))} placeholder="0,00" className="campo-fundo-claro" /></div>
              <div><label style={label}>Unidade</label><input style={input} value={form.unidade} onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))} placeholder="un, kg, ml" className="campo-fundo-claro" /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descrição</label><input style={input} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Opcional" className="campo-fundo-claro" /></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={salvar} style={btnPrincipal}>Salvar</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditId(null); }} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        )}

        {mostrarColar && (
          <div style={{ marginBottom: 24, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", color: "#e6edf3", fontSize: "1rem" }}>Colar conteúdo</h3>
            <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 12 }}>Cole texto copiado de planilhas, PDFs ou documentos. Use ; ou , como separador.</p>
            <textarea
              value={textoColar}
              onChange={(e) => setTextoColar(e.target.value)}
              placeholder="Ex.:&#10;Produto A;12,50;Bebidas&#10;Produto B;8,00;Pratos"
              style={{ width: "100%", minHeight: 120, padding: 12, borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "0.9375rem", boxSizing: "border-box" }}
              className="campo-fundo-claro"
            />
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button type="button" onClick={colarEImportar} style={btnPrincipal}>Importar</button>
              <button type="button" onClick={() => { setMostrarColar(false); setTextoColar(""); }} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        )}

        <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginBottom: 12 }}>
          Formatos: .xlsx, .xls, .csv ou colar texto (de PDF, etc.) — Colunas: nome/produto, preco/valor, categoria/secao, codigo, codigobarras, unidade
        </p>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum item no cardápio. Adicione manualmente ou importe uma planilha.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
              <thead>
                <tr>
                  <th style={th}>Código</th>
                  <th style={th}>Cód. Barras</th>
                  <th style={th}>Nome</th>
                  <th style={th}>Categoria</th>
                  <th style={th}>Preço</th>
                  <th style={th}>Unidade</th>
                  <th style={{ ...th, width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((i) => (
                  <tr key={i._id} style={tr}>
                    <td style={td}>{i.codigo || "—"}</td>
                    <td style={td}>{i.codigoBarras || "—"}</td>
                    <td style={td}>{i.nome}</td>
                    <td style={td}>{i.categoria || "Geral"}</td>
                    <td style={td}>R$ {(i.preco || 0).toFixed(2).replace(".", ",")}</td>
                    <td style={td}>{i.unidade || "un"}</td>
                    <td style={td}>
                      <button type="button" onClick={() => { setEditId(i._id); setForm({ codigo: i.codigo || "", codigoBarras: i.codigoBarras || "", nome: i.nome || "", descricao: i.descricao || "", categoria: i.categoria || "Geral", preco: i.preco ?? "", unidade: i.unidade || "un" }); setMostrarForm(true); }} style={btnSmall}>Editar</button>
                      <button type="button" onClick={() => excluir(i)} style={btnExcluir}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const label = { display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" };
const input = { width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "0.9375rem", boxSizing: "border-box" };
const btnPrincipal = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSecundario = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
const btnSmall = { padding: "6px 12px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.15)", color: "#e6edf3", fontSize: "0.8125rem", cursor: "pointer", marginRight: 8 };
const btnExcluir = { padding: "6px 12px", borderRadius: 4, border: "1px solid rgba(248,81,73,0.5)", background: "transparent", color: "#f85149", fontSize: "0.8125rem", cursor: "pointer" };
const th = { padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" };
const td = { padding: 12, borderBottom: BORDER };
const tr = {};
