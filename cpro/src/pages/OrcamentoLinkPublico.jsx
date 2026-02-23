// OrcamentoLinkPublico.jsx — Página pública para o cliente preencher ficha e selecionar itens
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function OrcamentoLinkPublico() {
  const { token } = useParams();
  const [orc, setOrc] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/api/orcamentos/acesso/${token}`)
      .then((r) => r.json())
      .then((ev) => {
        if (ev.error) throw new Error(ev.error);
        setOrc(ev);
        return ev.empresa;
      })
      .then((empresa) => {
        if (!empresa) return;
        return fetch(`${API_URL}/api/produtos-orcamento?empresa=${encodeURIComponent(empresa)}`).then((r) => r.json());
      })
      .then((prods) => setProdutos(Array.isArray(prods) ? prods : []))
      .catch((err) => {
        Swal.fire("Erro", err.message || "Link inválido.", "error");
        setOrc(null);
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
      const res = await fetch(`${API_URL}/api/orcamentos/acesso/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: orc?.cliente,
          dataEvento: orc?.dataEvento,
          tipoEvento: orc?.tipoEvento,
          localEvento: orc?.localEvento,
          qtdConvidados: orc?.qtdConvidados,
          respostasCustom: orc?.respostasCustom,
          respostasCustom: orc?.respostasCustom,
          itens: orc?.itens,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar.");
      const ev = await res.json();
      setOrc(ev);
      Swal.fire("Salvo!", "Seus dados foram enviados. Aguarde a proposta.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvando(false);
    }
  }

  function updateCliente(campo, valor) {
    setOrc((p) => ({ ...p, cliente: { ...(p.cliente || {}), [campo]: valor } }));
  }

  function updateOrc(campo, valor) {
    setOrc((p) => ({ ...p, [campo]: valor }));
  }

  function updateRespostasCustom(id, valor) {
    setOrc((p) => ({ ...p, respostasCustom: { ...(p.respostasCustom || {}), [id]: valor } }));
  }

  function adicionarItem(prod) {
    const itens = [...(orc?.itens || [])];
    const existente = itens.find((i) => i.produtoId === prod._id || i.nome === prod.nome);
    if (existente) existente.quantidade = (existente.quantidade || 1) + 1;
    else itens.push({ produtoId: prod._id, nome: prod.nome, descricao: prod.descricao, quantidade: 1, precoUnitario: prod.preco || 0, unidade: prod.unidade || "un" });
    setOrc((p) => ({ ...p, itens }));
  }

  function alterarQtd(idx, qtd) {
    const n = parseFloat(String(qtd).replace(",", ".")) || 0;
    const itens = [...(orc?.itens || [])];
    if (n <= 0) itens.splice(idx, 1);
    else itens[idx] = { ...itens[idx], quantidade: n };
    setOrc((p) => ({ ...p, itens }));
  }

  function removerItem(idx) {
    const itens = (orc?.itens || []).filter((_, i) => i !== idx);
    setOrc((p) => ({ ...p, itens }));
  }

  if (loading || !orc) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#8b949e" }}>Carregando...</div>;

  const cl = orc.cliente || {};

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", padding: "24px 20px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Ficha do orçamento</h1>
        <p style={{ color: "#8b949e", marginBottom: 24 }}>Preencha seus dados e selecione os itens desejados para sua proposta (evento, obra, serviço).</p>

        <section style={{ marginBottom: 32, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Seus dados</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {((orc.fichaConfig?.camposDados?.length) ? orc.fichaConfig.camposDados : [
              { id: "nome", label: "Nome completo" }, { id: "cpfCnpj", label: "CPF/CNPJ" }, { id: "email", label: "E-mail" },
              { id: "telefone", label: "Telefone" }, { id: "endereco", label: "Endereço" }, { id: "cidade", label: "Cidade" },
              { id: "estado", label: "Estado" }, { id: "cep", label: "CEP" },
            ]).map((c) => (
              <div key={c.id}>
                <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>{c.label}</label>
                <input style={inp} value={(cl[c.id] || (c.id === "cpfCnpj" ? cl.cpf : null)) || ""} onChange={(e) => updateCliente(c.id === "cpfCnpj" ? "cpfCnpj" : c.id, e.target.value)} placeholder={c.label} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>Data prevista</label>
              <input type="date" style={inp} value={orc.dataEvento ? new Date(orc.dataEvento).toISOString().slice(0, 10) : ""} onChange={(e) => updateOrc("dataEvento", e.target.value)} />
            </div>
            {((orc.fichaConfig?.perguntasCustom?.length) ? orc.fichaConfig.perguntasCustom : [
              { id: "tipoEvento", pergunta: "Tipo (evento, obra, serviço)", tipo: "texto" },
              { id: "localEvento", pergunta: "Local ou endereço", tipo: "texto" },
              { id: "qtdConvidados", pergunta: "Observações (ex.: qtd. convidados)", tipo: "numero" },
            ]).map((p) => (
              <div key={p.id}>
                <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" }}>{p.pergunta}</label>
                {p.tipo === "data" ? (
                  <input type="date" style={inp} value={(p.id === "dataEvento" ? orc.dataEvento : (orc.respostasCustom || {})[p.id]) ? new Date((p.id === "dataEvento" ? orc.dataEvento : (orc.respostasCustom || {})[p.id])).toISOString().slice(0, 10) : ""} onChange={(e) => p.id === "dataEvento" ? updateOrc("dataEvento", e.target.value) : updateRespostasCustom(p.id, e.target.value)} />
                ) : p.tipo === "numero" ? (
                  <input type="number" style={inp} value={p.id === "qtdConvidados" ? (orc.qtdConvidados ?? "") : ((orc.respostasCustom || {})[p.id] ?? "")} onChange={(e) => p.id === "qtdConvidados" ? updateOrc("qtdConvidados", e.target.value) : updateRespostasCustom(p.id, e.target.value)} placeholder={p.pergunta} />
                ) : (
                  <input style={inp} value={p.id === "tipoEvento" ? (orc.tipoEvento || "") : p.id === "localEvento" ? (orc.localEvento || "") : ((orc.respostasCustom || {})[p.id] || "")} onChange={(e) => p.id === "tipoEvento" ? updateOrc("tipoEvento", e.target.value) : p.id === "localEvento" ? updateOrc("localEvento", e.target.value) : updateRespostasCustom(p.id, e.target.value)} placeholder={p.pergunta} />
                )}
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Componentes — selecione os itens</h2>
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
          {produtosFiltrados.length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum componente disponível.</p>}

          <h3 style={{ margin: "24px 0 12px", fontSize: "1rem" }}>Itens selecionados</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(orc.itens || []).map((i, idx) => (
              <li key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: BORDER }}>
                <span style={{ flex: 1 }}>{i.nome}</span>
                <input type="number" min="0.01" value={i.quantidade} onChange={(e) => alterarQtd(idx, e.target.value)} style={{ width: 60, padding: 6, borderRadius: 4, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }} />
                <span style={{ minWidth: 70 }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</span>
                <button type="button" onClick={() => removerItem(idx)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
              </li>
            ))}
          </ul>
          {(orc.itens || []).length > 0 && <p style={{ marginTop: 12, fontWeight: 700, color: "#00F2FF" }}>Total: R$ {(orc.itens || []).reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0).toFixed(2)}</p>}
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
