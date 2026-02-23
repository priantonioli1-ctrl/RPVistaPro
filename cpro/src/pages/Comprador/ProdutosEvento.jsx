// ProdutosEvento.jsx — Catálogo de produtos para eventos (importável como cardápio)
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function ProdutosEvento() {
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
    if (!u) { navigate("/"); return; }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/produtos-evento?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
      fetch(`${API_URL}/api/produtos-evento/categorias?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()).catch(() => []),
    ])
      .then(([lista, cats]) => {
        setItens(Array.isArray(lista) ? lista : []);
        setCategoriasApi(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  const categorias = useMemo(() => {
    const daApi = categoriasApi.length > 0 ? categoriasApi : [];
    const dosItens = [...new Set(itens.map((i) => ((i.categoria || "Geral").trim() || "Geral")))].filter(Boolean);
    const todas = [...new Set([...daApi, ...dosItens])].filter(Boolean).sort();
    return [...new Set(["Geral", ...todas])].sort();
  }, [itens, categoriasApi]);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const cat = categoriaFiltro || "";
    return itens.filter((i) => {
      const matchBusca = !b || (i.nome || "").toLowerCase().includes(b) || (i.codigo || "").toLowerCase().includes(b) || (i.codigoBarras || "").includes(b) || (i.descricao || "").toLowerCase().includes(b);
      const matchCat = !cat || (i.categoria || "Geral") === cat;
      return matchBusca && matchCat;
    });
  }, [itens, busca, categoriaFiltro]);

  async function salvar() {
    const nome = (form.nome || "").trim();
    if (!nome) { Swal.fire("Atenção", "Nome é obrigatório.", "warning"); return; }
    const preco = parseFloat(String(form.preco || 0).replace(",", ".")) || 0;
    try {
      if (editId) {
        await fetch(`${API_URL}/api/produtos-evento/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: form.codigo.trim() || null, codigoBarras: form.codigoBarras.trim() || null, nome, descricao: form.descricao.trim() || "", categoria: form.categoria.trim() || "Geral", preco, unidade: form.unidade.trim() || "un" }),
        });
      } else {
        await fetch(`${API_URL}/api/produtos-evento`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresa: empresaId, codigo: form.codigo.trim() || null, codigoBarras: form.codigoBarras.trim() || null, nome, descricao: form.descricao.trim() || "", categoria: form.categoria.trim() || "Geral", preco, unidade: form.unidade.trim() || "un" }),
        });
      }
      Swal.fire("Sucesso", editId ? "Item atualizado." : "Item adicionado.", "success");
      setMostrarForm(false);
      setEditId(null);
      setForm({ codigo: "", codigoBarras: "", nome: "", descricao: "", categoria: "Geral", preco: "", unidade: "un" });
      const lista = await fetch(`${API_URL}/api/produtos-evento?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
  }

  async function excluir(item) {
    if (!(await Swal.fire({ title: "Excluir?", text: `"${item.nome}" será removido.`, icon: "warning", showCancelButton: true })).isConfirmed) return;
    try {
      await fetch(`${API_URL}/api/produtos-evento/${item._id}`, { method: "DELETE" });
      setItens((prev) => prev.filter((i) => i._id !== item._id));
      Swal.fire("Sucesso", "Excluído.", "success");
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
  }

  async function importarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) { Swal.fire("Use .xlsx, .xls ou .csv", "", "warning"); e.target.value = ""; return; }
    try {
      let rows = [];
      if (ext.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const sep = lines[0]?.includes(";") ? ";" : ",";
        const headers = (lines[0] || "").split(sep).map((h) => String(h || "").toLowerCase().trim());
        const idx = (names) => { for (const n of names) { const i = headers.findIndex((h) => h.includes(n)); if (i >= 0) return i; } return -1; };
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep);
          const idxNome = idx(["nome", "produto"]);
          const nome = String(idxNome >= 0 ? cols[idxNome] : cols[0] || "").trim();
          if (!nome) continue;
          const idxPreco = idx(["preco", "valor", "preço"]);
          const idxCat = idx(["categoria", "secao"]);
          const idxCod = idx(["codigo"]);
          const idxCodBarras = idx(["codigobarras", "ean"]);
          const idxUnid = idx(["unidade"]);
          rows.push({
            nome,
            preco: idxPreco >= 0 ? cols[idxPreco] ?? 0 : 0,
            categoria: idxCat >= 0 ? cols[idxCat] : "Geral",
            codigo: idxCod >= 0 ? cols[idxCod] : "",
            codigoBarras: idxCodBarras >= 0 ? cols[idxCodBarras] : "",
            unidade: idxUnid >= 0 ? cols[idxUnid] || "un" : "un",
          });
        }
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const mat = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
        const headers = (mat[0] || []).map((h) => String(h || "").toLowerCase().trim());
        const idx = (names) => { for (const n of names) { const i = headers.findIndex((h) => h.includes(n)); if (i >= 0) return i; } return -1; };
        for (let i = 1; i < mat.length; i++) {
          const row = mat[i] || [];
          const idxNome = idx(["nome", "produto"]);
          const nome = String(idxNome >= 0 ? row[idxNome] : row[0] ?? "").trim();
          if (!nome) continue;
          const idxPreco = idx(["preco", "valor", "preço"]);
          const idxCat = idx(["categoria", "secao"]);
          const idxCod = idx(["codigo"]);
          const idxCodBarras = idx(["codigobarras", "ean"]);
          const idxUnid = idx(["unidade"]);
          rows.push({
            nome,
            preco: idxPreco >= 0 ? row[idxPreco] ?? 0 : 0,
            categoria: idxCat >= 0 ? row[idxCat] : "Geral",
            codigo: idxCod >= 0 ? row[idxCod] : "",
            codigoBarras: idxCodBarras >= 0 ? row[idxCodBarras] : "",
            unidade: idxUnid >= 0 ? row[idxUnid] || "un" : "un",
          });
        }
      }
      if (rows.length === 0) { Swal.fire("Nenhuma linha válida.", "", "warning"); e.target.value = ""; return; }
      const res = await fetch(`${API_URL}/api/produtos-evento/importar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresa: empresaId, itens: rows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      Swal.fire("Sucesso", `${data.count || rows.length} itens importados.`, "success");
      const lista = await fetch(`${API_URL}/api/produtos-evento?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
    e.target.value = "";
  }

  async function colarEImportar() {
    const texto = textoColar.trim();
    if (!texto) { Swal.fire("Cole o conteúdo.", "", "warning"); return; }
    const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sep = linhas[0]?.includes(";") ? ";" : linhas[0]?.includes("\t") ? "\t" : ",";
    const headers = (linhas[0] || "").split(sep).map((h) => String(h || "").toLowerCase().trim());
    const idx = (names) => { for (const n of names) { const i = headers.findIndex((h) => h.includes(n)); if (i >= 0) return i; } return -1; };
    const rows = [];
    const start = headers.some((h) => h.includes("nome") || h.includes("produto")) ? 1 : 0;
    for (let i = start; i < linhas.length; i++) {
      const cols = linhas[i].split(sep);
      const idxNome = idx(["nome", "produto"]);
      const nome = String(idxNome >= 0 ? cols[idxNome] : cols[0] || "").trim();
      if (!nome || /c[oó]digo|produto|nome/i.test(nome)) continue;
      const idxPreco = idx(["preco", "valor"]);
      const idxCat = idx(["categoria", "secao"]);
      const idxCod = idx(["codigo"]);
      const idxCodBarras = idx(["codigobarras", "ean"]);
      const idxUnid = idx(["unidade"]);
      rows.push({
        nome,
        preco: idxPreco >= 0 ? (cols[idxPreco] ?? cols[1] ?? 0) : cols[1] ?? 0,
        categoria: idxCat >= 0 ? cols[idxCat] : "Geral",
        codigo: idxCod >= 0 ? cols[idxCod] : "",
        codigoBarras: idxCodBarras >= 0 ? cols[idxCodBarras] : "",
        unidade: idxUnid >= 0 ? cols[idxUnid] || "un" : "un",
      });
    }
    if (rows.length === 0) { Swal.fire("Nenhuma linha válida.", "", "warning"); return; }
    try {
      const res = await fetch(`${API_URL}/api/produtos-evento/importar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresa: empresaId, itens: rows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      Swal.fire("Sucesso", `${data.count || rows.length} importados.`, "success");
      setMostrarColar(false);
      setTextoColar("");
      const lista = await fetch(`${API_URL}/api/produtos-evento?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Produtos para Eventos</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>Catálogo de itens para propostas. Importe planilhas como no cardápio.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importarArquivo} style={{ display: "none" }} id="importar-prod-evento" />
            <button type="button" onClick={() => document.getElementById("importar-prod-evento").click()} style={btnSec}>Importar</button>
            <button type="button" onClick={() => setMostrarColar(!mostrarColar)} style={btnSec}>Colar texto</button>
            <button type="button" onClick={() => navigate("/eventos")} style={btnPrim}>Eventos</button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={inputBusca} className="campo-fundo-claro" />
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={selectCat} className="campo-fundo-claro">
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={() => { setEditId(null); setForm({ codigo: "", codigoBarras: "", nome: "", descricao: "", categoria: "Geral", preco: "", unidade: "un" }); setMostrarForm(true); }} style={btnPrim}>+ Novo</button>
        </div>

        {mostrarColar && (
          <div style={{ marginBottom: 24, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
            <textarea value={textoColar} onChange={(e) => setTextoColar(e.target.value)} placeholder="Cole: nome;preco;categoria" style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }} className="campo-fundo-claro" />
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button type="button" onClick={colarEImportar} style={btnPrim}>Importar</button>
              <button type="button" onClick={() => { setMostrarColar(false); setTextoColar(""); }} style={btnSec}>Cancelar</button>
            </div>
          </div>
        )}

        {mostrarForm && (
          <div style={{ marginBottom: 24, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>{editId ? "Editar" : "Novo"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div><label style={lbl}>Código</label><input style={inp} value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Cód. Barras</label><input style={inp} value={form.codigoBarras} onChange={(e) => setForm((p) => ({ ...p, codigoBarras: e.target.value }))} className="campo-fundo-claro" /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Nome *</label><input style={inp} value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Categoria</label><input style={inp} value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Preço (R$)</label><input style={inp} type="number" step="0.01" value={form.preco} onChange={(e) => setForm((p) => ({ ...p, preco: e.target.value }))} className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Unidade</label><input style={inp} value={form.unidade} onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))} className="campo-fundo-claro" /></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={salvar} style={btnPrim}>Salvar</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditId(null); }} style={btnSec}>Cancelar</button>
            </div>
          </div>
        )}

        <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginBottom: 12 }}>Colunas: nome/produto, preco/valor, categoria/secao, codigo, codigobarras, unidade</p>

        {loading ? <p style={{ color: "#8b949e" }}>Carregando...</p> : filtrados.length === 0 ? <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum item. Importe planilha ou adicione manualmente.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
              <thead><tr><th style={th}>Código</th><th style={th}>Nome</th><th style={th}>Categoria</th><th style={th}>Preço</th><th style={th}>Unidade</th><th style={{ ...th, width: 100 }}>Ações</th></tr></thead>
              <tbody>
                {filtrados.map((i) => (
                  <tr key={i._id}><td style={td}>{i.codigo || "—"}</td><td style={td}>{i.nome}</td><td style={td}>{i.categoria || "Geral"}</td><td style={td}>R$ {(i.preco || 0).toFixed(2).replace(".", ",")}</td><td style={td}>{i.unidade || "un"}</td>
                    <td style={td}>
                      <button type="button" onClick={() => { setEditId(i._id); setForm({ codigo: i.codigo || "", codigoBarras: i.codigoBarras || "", nome: i.nome || "", descricao: i.descricao || "", categoria: i.categoria || "Geral", preco: i.preco ?? "", unidade: i.unidade || "un" }); setMostrarForm(true); }} style={btnSm}>Editar</button>
                      <button type="button" onClick={() => excluir(i)} style={btnDel}>Excluir</button>
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

const lbl = { display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", boxSizing: "border-box" };
const btnPrim = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSec = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
const btnSm = { padding: "6px 12px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.15)", color: "#e6edf3", fontSize: "0.8125rem", cursor: "pointer", marginRight: 8 };
const btnDel = { padding: "6px 12px", borderRadius: 4, border: "1px solid rgba(248,81,73,0.5)", background: "transparent", color: "#f85149", fontSize: "0.8125rem", cursor: "pointer" };
const inputBusca = { flex: "1 1 200px", padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" };
const selectCat = { padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", minWidth: 140 };
const th = { padding: "10px 12px", textAlign: "left", borderBottom: BORDER, color: "#8b949e", fontWeight: 600, fontSize: "0.8125rem" };
const td = { padding: 12, borderBottom: BORDER };
