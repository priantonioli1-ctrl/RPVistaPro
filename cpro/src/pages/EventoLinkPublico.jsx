// EventoLinkPublico.jsx — Página pública para o cliente preencher ficha e selecionar itens
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function EventoLinkPublico() {
  const { token } = useParams();
  const [evento, setEvento] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/api/eventos/acesso/${token}`)
      .then((r) => r.json())
      .then((ev) => {
        if (ev.error) throw new Error(ev.error);
        setEvento(ev);
        return ev.empresa;
      })
      .then((empresa) => {
        if (!empresa) return;
        return fetch(`${API_URL}/api/produtos-evento?empresa=${encodeURIComponent(empresa)}`).then((r) => r.json());
      })
      .then((prods) => setProdutos(Array.isArray(prods) ? prods : []))
      .catch((err) => {
        Swal.fire("Erro", err.message || "Link inválido.", "error");
        setEvento(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const produtosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const cat = catFiltro || "";
    return produtos.filter((p) => {
      const matchBusca = !b || (p.nome || "").toLowerCase().includes(b) || (p.categoria || "").toLowerCase().includes(b);
      const matchCat = !cat || (p.categoria || "Geral") === cat;
      return matchBusca && matchCat;
    });
  }, [produtos, busca, catFiltro]);

  const categorias = useMemo(() => {
    const cats = [...new Set(produtos.map((p) => ((p.categoria || "Geral").trim() || "Geral")))].filter(Boolean).sort();
    return [...new Set(["Geral", ...cats])].sort();
  }, [produtos]);

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/eventos/acesso/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: evento?.cliente,
          dataEvento: evento?.dataEvento,
          tipoEvento: evento?.tipoEvento,
          localEvento: evento?.localEvento,
          qtdConvidados: evento?.qtdConvidados,
          itens: evento?.itens,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar.");
      const ev = await res.json();
      setEvento(ev);
      Swal.fire("Salvo!", "Seus dados foram enviados. Aguarde a proposta.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvando(false);
    }
  }

  function updateCliente(campo, valor) {
    setEvento((p) => ({ ...p, cliente: { ...(p.cliente || {}), [campo]: valor } }));
  }

  function updateEvento(campo, valor) {
    setEvento((p) => ({ ...p, [campo]: valor }));
  }

  function adicionarItem(prod) {
    const itens = [...(evento?.itens || [])];
    const existente = itens.find((i) => i.produtoId === prod._id || i.nome === prod.nome);
    if (existente) existente.quantidade = (existente.quantidade || 1) + 1;
    else itens.push({ produtoId: prod._id, nome: prod.nome, descricao: prod.descricao, quantidade: 1, precoUnitario: prod.preco || 0, unidade: prod.unidade || "un" });
    setEvento((p) => ({ ...p, itens }));
  }

  function alterarQtd(idx, qtd) {
    const n = parseFloat(String(qtd).replace(",", ".")) || 0;
    const itens = [...(evento?.itens || [])];
    if (n <= 0) itens.splice(idx, 1);
    else itens[idx] = { ...itens[idx], quantidade: n };
    setEvento((p) => ({ ...p, itens }));
  }

  function removerItem(idx) {
    const itens = (evento?.itens || []).filter((_, i) => i !== idx);
    setEvento((p) => ({ ...p, itens }));
  }

  if (loading || !evento) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#8b949e" }}>Carregando...</div>;

  const cl = evento.cliente || {};

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", padding: "24px 20px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Ficha do evento</h1>
        <p style={{ color: "#8b949e", marginBottom: 24 }}>Preencha seus dados e selecione os itens desejados para sua proposta.</p>

        <section style={{ marginBottom: 32, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Seus dados</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {["nome", "cpf", "email", "telefone", "endereco", "cidade", "estado", "cep"].map((c) => (
              <div key={c}>
                <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>{c === "nome" ? "Nome" : c === "endereco" ? "Endereço" : c.toUpperCase()}</label>
                <input style={inp} value={cl[c] || ""} onChange={(e) => updateCliente(c, e.target.value)} placeholder={c} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>Data do evento</label>
              <input type="date" style={inp} value={evento.dataEvento ? new Date(evento.dataEvento).toISOString().slice(0, 10) : ""} onChange={(e) => updateEvento("dataEvento", e.target.value)} />
            </div>
            <div><label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>Tipo</label><input style={inp} value={evento.tipoEvento || ""} onChange={(e) => updateEvento("tipoEvento", e.target.value)} placeholder="Casamento, Aniversário..." /></div>
            <div><label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>Local</label><input style={inp} value={evento.localEvento || ""} onChange={(e) => updateEvento("localEvento", e.target.value)} /></div>
            <div><label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>Qtd. convidados</label><input type="number" style={inp} value={evento.qtdConvidados ?? ""} onChange={(e) => updateEvento("qtdConvidados", e.target.value)} /></div>
          </div>
        </section>

        <section style={{ marginBottom: 32, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Produtos — selecione os itens</h2>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={inp} />
            <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} style={inp}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {produtosFiltrados.map((p) => (
              <div key={p._id} style={{ padding: 16, border: BORDER, borderRadius: 6, background: "rgba(255,255,255,0.04)" }}>
                <strong style={{ display: "block" }}>{p.nome}</strong>
                <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>R$ {(p.preco || 0).toFixed(2)}</span>
                <button type="button" onClick={() => adicionarItem(p)} style={btnAdd}>+</button>
              </div>
            ))}
          </div>
          {produtosFiltrados.length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum produto disponível.</p>}

          <h3 style={{ margin: "24px 0 12px", fontSize: "1rem" }}>Itens selecionados</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(evento.itens || []).map((i, idx) => (
              <li key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: BORDER }}>
                <span style={{ flex: 1 }}>{i.nome}</span>
                <input type="number" min="0.01" value={i.quantidade} onChange={(e) => alterarQtd(idx, e.target.value)} style={{ width: 60, padding: 6, borderRadius: 4, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }} />
                <span style={{ minWidth: 70 }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</span>
                <button type="button" onClick={() => removerItem(idx)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
              </li>
            ))}
          </ul>
          {(evento.itens || []).length > 0 && <p style={{ marginTop: 12, fontWeight: 700, color: "#00F2FF" }}>Total: R$ {(evento.itens || []).reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0).toFixed(2)}</p>}
        </section>

        <button type="button" onClick={salvar} disabled={salvando} style={{ padding: "14px 28px", borderRadius: 8, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer", fontSize: "1rem" }}>
          {salvando ? "Enviando..." : "Enviar minha proposta"}
        </button>
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", fontSize: "1rem", boxSizing: "border-box" };
const btnAdd = { marginTop: 8, padding: "8px 16px", borderRadius: 4, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
