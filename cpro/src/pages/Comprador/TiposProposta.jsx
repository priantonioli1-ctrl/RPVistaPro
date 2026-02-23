// TiposProposta.jsx — Gerenciar tipos de orçamento/proposta (editar cardápios, criar novos)
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { CONFIG_PADRAO_VISTA_LAGOA, DADOS_EMPRESA_PADRAO } from "../../data/configPropostaPadrao";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const LABELS_CARDAPIO_PADRAO = {
  frios: "Coquetéis frios",
  quentes: "Coquetéis quentes",
  classicos: "Coquetéis clássicos",
  caldinho: "Caldinho",
  caldinhos: "Caldinhos",
  lancheMadrugada: "Lanche madrugada",
  miniDeg: "Mini degustações",
};

function slugCat(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "cat";
}

export default function TiposProposta() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: "", subtitulo: "", config: null });

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) { navigate("/"); return; }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    fetch(`${API_URL}/api/tipo-proposta?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setTipos(Array.isArray(lista) ? lista : []))
      .catch(() => setTipos([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  useEffect(() => {
    if (id === "novo") {
      setEditing("novo");
      const stateForm = location.state?.formInicial;
      setForm(stateForm || { nome: "", subtitulo: "", config: getConfigVazio() });
    } else if (id && id !== "novo" && tipos.length) {
      const t = tipos.find((x) => x._id === id);
      if (t) {
        const cfg = t.config ? JSON.parse(JSON.stringify(t.config)) : JSON.parse(JSON.stringify(CONFIG_PADRAO_VISTA_LAGOA));
        if (!cfg.dadosEmpresa) cfg.dadosEmpresa = { ...DADOS_EMPRESA_PADRAO };
        setEditing(t._id);
        setForm({ nome: t.nome || "", subtitulo: t.subtitulo || "", config: cfg });
      }
    } else if (!id) {
      setEditing(null);
      setForm({ nome: "", subtitulo: "", config: null });
    }
  }, [id, tipos]);

  function iniciarNovo(usarTemplate = false) {
    const formInicial = {
      nome: usarTemplate ? "Vista Lagoa" : "",
      subtitulo: usarTemplate ? "Buffet — Clube Naval Piraquê" : "",
      config: usarTemplate ? JSON.parse(JSON.stringify(CONFIG_PADRAO_VISTA_LAGOA)) : getConfigVazio(),
    };
    setEditing("novo");
    setForm(formInicial);
    navigate("/produtos-orcamento/novo", { replace: true, state: { formInicial } });
  }

  function getConfigVazio() {
    const c = JSON.parse(JSON.stringify(CONFIG_PADRAO_VISTA_LAGOA));
    c.dadosEmpresa = c.dadosEmpresa || { ...DADOS_EMPRESA_PADRAO };
    Object.keys(c.cardapioBuffet || {}).forEach((k) => { c.cardapioBuffet[k] = []; });
    (c.menuDegustacao || []).forEach((s) => { s.items = []; });
    (c.cardapioBar || {}).classicos = [];
    (c.cardapioBar || {}).frutas = [];
    c.ilhasTematicas = [];
    return c;
  }

  async function salvar() {
    const nome = (form.nome || "").trim();
    if (!nome) { Swal.fire("Atenção", "Nome do tipo é obrigatório.", "warning"); return; }
    if (!form.config) { Swal.fire("Atenção", "Configuração inválida.", "warning"); return; }
    try {
      if (editing && editing !== "novo") {
        await fetch(`${API_URL}/api/tipo-proposta/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, subtitulo: form.subtitulo?.trim() || "", config: form.config }),
        });
        Swal.fire("Sucesso", "Tipo atualizado.", "success");
      } else {
        const res = await fetch(`${API_URL}/api/tipo-proposta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresa: empresaId, nome, subtitulo: form.subtitulo?.trim() || "", config: form.config }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro");
        Swal.fire("Sucesso", "Tipo criado.", "success");
        navigate(`/produtos-orcamento/${data._id}`, { replace: true });
      }
      const lista = await fetch(`${API_URL}/api/tipo-proposta?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json());
      setTipos(Array.isArray(lista) ? lista : []);
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
  }

  async function excluir(tipo) {
    if (!(await Swal.fire({ title: "Excluir?", text: `"${tipo.nome}" será removido.`, icon: "warning", showCancelButton: true })).isConfirmed) return;
    try {
      await fetch(`${API_URL}/api/tipo-proposta/${tipo._id}`, { method: "DELETE" });
      setTipos((prev) => prev.filter((i) => i._id !== tipo._id));
      if (editing === tipo._id) { setEditing(null); setForm({ nome: "", subtitulo: "", config: null }); navigate("/produtos-orcamento", { replace: true }); }
      Swal.fire("Sucesso", "Excluído.", "success");
    } catch (err) { Swal.fire("Erro", err.message, "error"); }
  }

  function atualizarConfig(path, value) {
    setForm((p) => {
      const cfg = { ...p.config };
      const parts = path.split(".");
      let cur = cfg;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!cur[key] || typeof cur[key] !== "object") cur[key] = Array.isArray(value) ? [] : {};
        cur = cur[key];
      }
      cur[parts[parts.length - 1]] = value;
      return { ...p, config: cfg };
    });
  }

  function adicionarItem(categoria, item) {
    const list = [...(form.config?.cardapioBuffet?.[categoria] || []), item];
    const cb = { ...(form.config?.cardapioBuffet || {}), [categoria]: list };
    setForm((p) => ({ ...p, config: { ...p.config, cardapioBuffet: cb } }));
  }

  function removerItem(categoria, idx) {
    const list = (form.config?.cardapioBuffet?.[categoria] || []).filter((_, i) => i !== idx);
    const cb = { ...(form.config?.cardapioBuffet || {}), [categoria]: list };
    setForm((p) => ({ ...p, config: { ...p.config, cardapioBuffet: cb } }));
  }

  function editarItem(categoria, idx, novoValor) {
    const list = [...(form.config?.cardapioBuffet?.[categoria] || [])];
    if (list[idx] !== undefined) list[idx] = novoValor;
    const cb = { ...(form.config?.cardapioBuffet || {}), [categoria]: list };
    setForm((p) => ({ ...p, config: { ...p.config, cardapioBuffet: cb } }));
  }

  function adicionarItemMenuDeg(subcatId, item) {
    const md = (form.config?.menuDegustacao || []).map((s) =>
      s.id === subcatId ? { ...s, items: [...(s.items || []), item] } : s
    );
    setForm((p) => ({ ...p, config: { ...p.config, menuDegustacao: md } }));
  }

  function removerItemMenuDeg(subcatId, idx) {
    const md = (form.config?.menuDegustacao || []).map((s) =>
      s.id === subcatId ? { ...s, items: (s.items || []).filter((_, i) => i !== idx) } : s
    );
    setForm((p) => ({ ...p, config: { ...p.config, menuDegustacao: md } }));
  }

  function adicionarItemBar(cat, item) {
    const cBar = { ...(form.config?.cardapioBar || {}), [cat]: [...(form.config?.cardapioBar?.[cat] || []), item] };
    setForm((p) => ({ ...p, config: { ...p.config, cardapioBar: cBar } }));
  }

  function removerItemBar(cat, idx) {
    const list = (form.config?.cardapioBar?.[cat] || []).filter((_, i) => i !== idx);
    const cBar = { ...(form.config?.cardapioBar || {}), [cat]: list };
    setForm((p) => ({ ...p, config: { ...p.config, cardapioBar: cBar } }));
  }

  function getLabelCategoria(cat) {
    return form.config?.cardapioBuffetLabels?.[cat] ?? LABELS_CARDAPIO_PADRAO[cat] ?? cat;
  }

  function atualizarLabelCategoria(cat, novoLabel) {
    setForm((p) => {
      const cfg = { ...p.config };
      cfg.cardapioBuffetLabels = { ...(cfg.cardapioBuffetLabels || {}), [cat]: novoLabel };
      if (cfg.regrasBuffet) {
        cfg.regrasBuffet = { ...cfg.regrasBuffet };
        Object.keys(cfg.regrasBuffet).forEach((op) => {
          cfg.regrasBuffet[op] = (cfg.regrasBuffet[op] || []).map((r) =>
            r.cat === cat ? { ...r, label: novoLabel } : r
          );
        });
      }
      return { ...p, config: cfg };
    });
  }

  function adicionarCategoriaCardapio() {
    Swal.fire({
      title: "Nova categoria",
      input: "text",
      inputPlaceholder: "Ex: Sobremesas, Salgados, Bebidas",
      showCancelButton: true,
    }).then(({ value }) => {
      if (!value?.trim()) return;
      const label = value.trim();
      const id = slugCat(label);
      const catId = Object.keys(form.config?.cardapioBuffet || {}).includes(id) ? `${id}_${Date.now().toString(36)}` : id;
      setForm((p) => {
        const cfg = { ...p.config };
        cfg.cardapioBuffet = { ...(cfg.cardapioBuffet || {}), [catId]: [] };
        cfg.cardapioBuffetLabels = { ...(cfg.cardapioBuffetLabels || {}), [catId]: label };
        if (cfg.regrasBuffet) {
          cfg.regrasBuffet = { ...cfg.regrasBuffet };
          Object.keys(cfg.regrasBuffet).forEach((op) => {
            cfg.regrasBuffet[op] = [...(cfg.regrasBuffet[op] || []), { cat: catId, qtd: 1, label }];
          });
        }
        return { ...p, config: cfg };
      });
      Swal.fire("Adicionado", `Categoria "${label}" criada.`, "success");
    });
  }

  async function removerCategoriaCardapio(cat) {
    if (cat === "miniDeg") { Swal.fire("Atenção", "A categoria Menu degustação não pode ser removida.", "warning"); return; }
    if (!(await Swal.fire({ title: "Remover categoria?", text: "Os itens desta categoria serão excluídos.", icon: "warning", showCancelButton: true })).isConfirmed) return;
    setForm((p) => {
      const cfg = { ...p.config };
      const cb = { ...(cfg.cardapioBuffet || {}) };
      delete cb[cat];
      cfg.cardapioBuffet = cb;
      cfg.cardapioBuffetLabels = { ...(cfg.cardapioBuffetLabels || {}) };
      delete cfg.cardapioBuffetLabels[cat];
      if (cfg.regrasBuffet) {
        cfg.regrasBuffet = { ...cfg.regrasBuffet };
        Object.keys(cfg.regrasBuffet).forEach((op) => {
          cfg.regrasBuffet[op] = (cfg.regrasBuffet[op] || []).filter((r) => r.cat !== cat);
        });
      }
      return { ...p, config: cfg };
    });
  }

  if (!usuarioAtual) return null;

  const lbl = { display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", boxSizing: "border-box" };
  const btnPrim = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
  const btnSec = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
  const btnSm = { padding: "6px 12px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.15)", color: "#e6edf3", fontSize: "0.8125rem", cursor: "pointer", marginRight: 8 };
  const btnDel = { padding: "6px 12px", borderRadius: 4, border: "1px solid rgba(248,81,73,0.5)", background: "transparent", color: "#f85149", fontSize: "0.8125rem", cursor: "pointer" };

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Tipos de Proposta</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>Gerencie os tipos de orçamento: edite cardápios, adicione ou remova itens, crie novos tipos.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing && (
              <>
                <button type="button" onClick={() => iniciarNovo(false)} style={btnSec}>+ Novo tipo</button>
                <button type="button" onClick={() => iniciarNovo(true)} style={btnPrim}>+ Modelo eventos</button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div style={{ marginBottom: 24, padding: 24, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>{editing === "novo" ? "Novo tipo" : "Editar tipo"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div><label style={lbl}>Nome do tipo *</label><input style={inp} value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Vista Lagoa" className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Subtítulo</label><input style={inp} value={form.subtitulo} onChange={(e) => setForm((p) => ({ ...p, subtitulo: e.target.value }))} placeholder="Ex: Buffet — Clube Naval Piraquê" className="campo-fundo-claro" /></div>
            </div>

            {form.config?.dadosEmpresa && (
              <div style={{ marginBottom: 24, padding: 16, border: BORDER, borderRadius: 8, background: "rgba(0,100,120,0.08)" }}>
                <h4 style={{ margin: "0 0 16px", color: "#00F2FF", fontSize: "1rem" }}>Dados da Empresa (para o contrato)</h4>
                <p style={{ margin: "0 0 16px", color: "#8b949e", fontSize: "0.8rem" }}>Estes dados aparecem no contrato (CNPJ, endereço, conta bancária). Altere aqui para que todos os contratos gerados usem as informações corretas.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Razão social</label><input style={inp} value={form.config.dadosEmpresa.razaoSocial || ""} onChange={(e) => atualizarConfig("dadosEmpresa.razaoSocial", e.target.value)} placeholder="LEQ BAR RESTAURANTE..." className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Nome fantasia</label><input style={inp} value={form.config.dadosEmpresa.nomeFantasia || ""} onChange={(e) => atualizarConfig("dadosEmpresa.nomeFantasia", e.target.value)} placeholder="VISTA LAGOA" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>CNPJ</label><input style={inp} value={form.config.dadosEmpresa.cnpj || ""} onChange={(e) => atualizarConfig("dadosEmpresa.cnpj", e.target.value)} placeholder="08.906.069/0001-90" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Endereço completo</label><input style={inp} value={form.config.dadosEmpresa.endereco || ""} onChange={(e) => atualizarConfig("dadosEmpresa.endereco", e.target.value)} placeholder="Av. Borges de Medeiros..." className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Representante (contrato)</label><input style={inp} value={form.config.dadosEmpresa.representante || ""} onChange={(e) => atualizarConfig("dadosEmpresa.representante", e.target.value)} placeholder="Romulo Aquino" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>RG do representante</label><input style={inp} value={form.config.dadosEmpresa.rgRepresentante || ""} onChange={(e) => atualizarConfig("dadosEmpresa.rgRepresentante", e.target.value)} placeholder="10982605-7" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Banco</label><input style={inp} value={form.config.dadosEmpresa.banco || ""} onChange={(e) => atualizarConfig("dadosEmpresa.banco", e.target.value)} placeholder="SICOOB" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Código do banco</label><input style={inp} value={form.config.dadosEmpresa.bancoCodigo || ""} onChange={(e) => atualizarConfig("dadosEmpresa.bancoCodigo", e.target.value)} placeholder="756" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Agência</label><input style={inp} value={form.config.dadosEmpresa.agencia || ""} onChange={(e) => atualizarConfig("dadosEmpresa.agencia", e.target.value)} placeholder="3001" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>Conta corrente</label><input style={inp} value={form.config.dadosEmpresa.conta || ""} onChange={(e) => atualizarConfig("dadosEmpresa.conta", e.target.value)} placeholder="131.023-2" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>PIX (chave para recebimento)</label><input style={inp} value={form.config.dadosEmpresa.pix || ""} onChange={(e) => atualizarConfig("dadosEmpresa.pix", e.target.value)} placeholder="financeiro@grroma.com.br" className="campo-fundo-claro" /></div>
                  <div><label style={lbl}>E-mail para envio do comprovante</label><input style={inp} type="email" value={form.config.dadosEmpresa.emailComprovante || ""} onChange={(e) => atualizarConfig("dadosEmpresa.emailComprovante", e.target.value)} placeholder="financeiro@grroma.com.br" className="campo-fundo-claro" /></div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Logo da empresa (cabeçalho do contrato)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => { atualizarConfig("dadosEmpresa.logoBase64", r.result); };
                        r.readAsDataURL(f);
                      }} style={{ ...inp, width: "auto", padding: 8 }} className="campo-fundo-claro" />
                      {form.config.dadosEmpresa.logoBase64 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <img src={form.config.dadosEmpresa.logoBase64} alt="Logo" style={{ maxHeight: 40, maxWidth: 120, objectFit: "contain" }} />
                          <button type="button" onClick={() => atualizarConfig("dadosEmpresa.logoBase64", "")} style={btnDel}>Remover</button>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: "0.75rem" }}>A logo será exibida no cabeçalho do contrato. PNG, JPEG ou WebP. Cada tipo de proposta pode ter sua própria marca.</p>
                  </div>
                </div>
              </div>
            )}

            {form.config?.cardapioBuffet && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={lbl}>Título do cardápio</label>
                    <input style={inp} value={form.config.tituloCardapio ?? "Coquetéis"} onChange={(e) => atualizarConfig("tituloCardapio", e.target.value)} placeholder="Ex: Coquetéis, Pratos, Serviços" className="campo-fundo-claro" />
                  </div>
                  <button type="button" onClick={adicionarCategoriaCardapio} style={{ ...btnSm, marginTop: 22 }}>+ Nova categoria</button>
                </div>
                <p style={{ margin: "0 0 12px", color: "#8b949e", fontSize: "0.8rem" }}>Edite o título e as categorias para adequar ao seu ramo. Adicione itens em cada categoria.</p>
                {Object.entries(form.config.cardapioBuffet).filter(([c]) => c !== "miniDeg").map(([cat, itens]) => (
                  <div key={cat} style={{ marginBottom: 16, padding: 12, border: BORDER, borderRadius: 6, background: "rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input style={{ ...inp, flex: 1, fontWeight: 600 }} value={getLabelCategoria(cat)} onChange={(e) => atualizarLabelCategoria(cat, e.target.value)} placeholder="Nome da categoria" className="campo-fundo-claro" />
                      <button type="button" onClick={() => removerCategoriaCardapio(cat)} style={btnDel}>Excluir categoria</button>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {(itens || []).map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <input style={{ ...inp, flex: 1 }} value={item} onChange={(e) => editarItem(cat, idx, e.target.value)} className="campo-fundo-claro" />
                          <button type="button" onClick={() => removerItem(cat, idx)} style={btnDel}>Excluir</button>
                        </div>
                      ))}
                      <form onSubmit={(e) => { e.preventDefault(); const v = e.target.novo?.value?.trim(); if (v) { adicionarItem(cat, v); e.target.reset(); } }} style={{ display: "flex", gap: 8 }}>
                        <input name="novo" style={{ ...inp, flex: 1 }} placeholder="+ Adicionar item" className="campo-fundo-claro" />
                        <button type="submit" style={btnSm}>Adicionar</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.config?.menuDegustacao?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 12px", color: "#00F2FF", fontSize: "1rem" }}>Menu Degustação</h4>
                {form.config.menuDegustacao.map((sub) => (
                  <div key={sub.id} style={{ marginBottom: 16, padding: 12, border: BORDER, borderRadius: 6, background: "rgba(0,0,0,0.15)" }}>
                    <strong style={{ color: "#e6edf3", fontSize: "0.9rem" }}>{sub.label}</strong>
                    {sub.hint && <span style={{ color: "#8b949e", fontSize: "0.8rem", marginLeft: 8 }}>({sub.hint})</span>}
                    <div style={{ marginTop: 8 }}>
                      {(sub.items || []).map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ flex: 1 }}>{item}</span>
                          <button type="button" onClick={() => removerItemMenuDeg(sub.id, idx)} style={btnDel}>Excluir</button>
                        </div>
                      ))}
                      <form onSubmit={(e) => { e.preventDefault(); const v = e.target.novo?.value?.trim(); if (v) { adicionarItemMenuDeg(sub.id, v); e.target.reset(); } }} style={{ display: "flex", gap: 8 }}>
                        <input name="novo" style={{ ...inp, flex: 1 }} placeholder="+ Adicionar item" className="campo-fundo-claro" />
                        <button type="submit" style={btnSm}>Adicionar</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.config?.cardapioBar && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 12px", color: "#00F2FF", fontSize: "1rem" }}>Cardápio Bar</h4>
                {["classicos", "frutas"].map((cat) => (
                  <div key={cat} style={{ marginBottom: 16, padding: 12, border: BORDER, borderRadius: 6, background: "rgba(0,0,0,0.15)" }}>
                    <strong style={{ color: "#e6edf3", fontSize: "0.9rem" }}>{cat === "classicos" ? "Drinks clássicos" : "Caipirinhas (frutas)"}</strong>
                    <div style={{ marginTop: 8 }}>
                      {(form.config.cardapioBar[cat] || []).map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ flex: 1 }}>{item}</span>
                          <button type="button" onClick={() => removerItemBar(cat, idx)} style={btnDel}>Excluir</button>
                        </div>
                      ))}
                      <form onSubmit={(e) => { e.preventDefault(); const v = e.target.novo?.value?.trim(); if (v) { adicionarItemBar(cat, v); e.target.reset(); } }} style={{ display: "flex", gap: 8 }}>
                        <input name="novo" style={{ ...inp, flex: 1 }} placeholder="+ Adicionar item" className="campo-fundo-claro" />
                        <button type="submit" style={btnSm}>Adicionar</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button type="button" onClick={salvar} style={btnPrim}>Salvar</button>
              <button type="button" onClick={() => { setEditing(null); setForm({ nome: "", subtitulo: "", config: null }); navigate("/produtos-orcamento"); }} style={btnSec}>Cancelar</button>
              {editing !== "novo" && (
                <button type="button" onClick={() => navigate(`/nova-proposta/${editing}`)} style={btnSec}>Abrir proposta</button>
              )}
            </div>
          </div>
        ) : null}

        {!editing && (
          <>
            {loading ? <p style={{ color: "#8b949e" }}>Carregando...</p> : tipos.length === 0 ? (
              <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum tipo cadastrado. Crie um novo ou use o modelo eventos.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tipos.map((t) => (
                  <div key={t._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: BORDER, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
                    <div>
                      <strong style={{ color: "#e6edf3", fontSize: "1.1rem" }}>{t.nome}</strong>
                      {t.subtitulo && <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>{t.subtitulo}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => { navigate(`/produtos-orcamento/${t._id}`); }} style={btnSm}>Editar</button>
                      <button type="button" onClick={() => navigate(`/nova-proposta/${t._id}`)} style={btnPrim}>Abrir proposta</button>
                      <button type="button" onClick={() => excluir(t)} style={btnDel}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
