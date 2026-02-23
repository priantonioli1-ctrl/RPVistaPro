// Orcamentos.jsx — Venda Personalizada: lista de orçamentos por categoria
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const FRONT_URL = window.location.origin;
const BORDER = "1px solid rgba(255,255,255,0.08)";

const CAMPOS_PADRAO = [
  { id: "nome", label: "Nome completo", tipo: "texto", obrigatorio: true, ordem: 0 },
  { id: "cpfCnpj", label: "CPF/CNPJ", tipo: "texto", obrigatorio: false, ordem: 1 },
  { id: "email", label: "E-mail", tipo: "email", obrigatorio: false, ordem: 2 },
  { id: "telefone", label: "Telefone", tipo: "telefone", obrigatorio: false, ordem: 3 },
  { id: "endereco", label: "Endereço", tipo: "texto", obrigatorio: false, ordem: 4 },
  { id: "cidade", label: "Cidade", tipo: "texto", obrigatorio: false, ordem: 5 },
  { id: "estado", label: "Estado", tipo: "texto", obrigatorio: false, ordem: 6 },
  { id: "cep", label: "CEP", tipo: "texto", obrigatorio: false, ordem: 7 },
];

const PERGUNTAS_PADRAO = [
  { id: "tipo_festa", pergunta: "Qual tipo de festa?", tipo: "texto", obrigatorio: false, ordem: 0 },
  { id: "qtd_pessoas", pergunta: "Para quantas pessoas?", tipo: "numero", obrigatorio: false, ordem: 1 },
];

// Categorias conforme solicitado
const CATEGORIAS = [
  { id: "nao_enviado", label: "Proposta não enviada", statuses: ["rascunho", "aguardando_cliente"], cor: "#f0883e" },
  { id: "em_negociacao", label: "Em negociação", statuses: ["proposta_enviada"], cor: "#00F2FF" },
  { id: "aceito", label: "Aceitos", statuses: ["confirmado"], cor: "#25C19B" },
  { id: "aceito_pago", label: "Aceitos e pagos", statuses: ["pago"], cor: "#3fb950" },
];

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}

export default function Orcamentos() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [criando, setCriando] = useState(false);
  const [linkNovoOrcamento, setLinkNovoOrcamento] = useState(null);
  const [camposDados, setCamposDados] = useState(() => JSON.parse(JSON.stringify(CAMPOS_PADRAO)));
  const [perguntasCustom, setPerguntasCustom] = useState(() => JSON.parse(JSON.stringify(PERGUNTAS_PADRAO)));
  const [modalModelos, setModalModelos] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [salvandoModelo, setSalvandoModelo] = useState(false);

  const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) { navigate("/"); return; }
    setUsuarioAtual(u);
  }, [navigate]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    fetch(`${API_URL}/api/orcamentos?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setOrcamentos(Array.isArray(lista) ? lista : []))
      .catch(() => setOrcamentos([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  useEffect(() => {
    if (modalModelos && empresaId) {
      fetch(`${API_URL}/api/modelos-ficha-orcamento?empresa=${encodeURIComponent(empresaId)}`)
        .then((r) => r.json())
        .then((lista) => setModelos(Array.isArray(lista) ? lista : []))
        .catch(() => setModelos([]));
    }
  }, [modalModelos, empresaId]);

  async function salvarModelo() {
    const nome = await Swal.fire({
      title: "Salvar modelo",
      input: "text",
      inputLabel: "Nome do modelo (ex.: Ficha Casamento, Ficha Reforma)",
      inputPlaceholder: "Digite o nome",
      showCancelButton: true,
      inputValidator: (v) => (!v || !v.trim() ? "Informe o nome" : null),
    }).then((r) => r.isConfirmed ? r.value?.trim() : null);
    if (!nome || !empresaId) return;
    setSalvandoModelo(true);
    try {
      const res = await fetch(`${API_URL}/api/modelos-ficha-orcamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, nome, camposDados, perguntasCustom }),
      });
      if (!res.ok) throw new Error("Erro ao salvar.");
      Swal.fire("Sucesso", "Modelo salvo. Use 'Acessar modelos' para carregá-lo depois.", "success");
      setModalModelos(false);
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvandoModelo(false);
    }
  }

  function carregarModelo(m) {
    setCamposDados(JSON.parse(JSON.stringify(m.camposDados || [])));
    setPerguntasCustom(JSON.parse(JSON.stringify(m.perguntasCustom || [])));
    setModalModelos(false);
  }

  async function criarOrcamento() {
    const codigo = (novoCodigo || "").trim() || `Orçamento ${new Date().toISOString().slice(0, 10)}`;
    if (!empresaId) return;
    setCriando(true);
    setLinkNovoOrcamento(null);
    try {
      const res = await fetch(`${API_URL}/api/orcamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, codigo, fichaConfig: { camposDados, perguntasCustom } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar.");
      const link = `${FRONT_URL}/orcamento/${data.tokenAcesso}`;
      setLinkNovoOrcamento({ id: data._id, link, codigo: data.codigo || codigo });
      setNovoCodigo("");
      setOrcamentos((prev) => [data, ...prev]);
      Swal.fire("Sucesso", "Orçamento criado. Copie o link e envie ao cliente.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setCriando(false);
    }
  }

  function copiarLink(link) {
    navigator.clipboard.writeText(link)
      .then(() => Swal.fire("Copiado!", "Link copiado para a área de transferência.", "success"))
      .catch(() => Swal.fire("Erro", "Não foi possível copiar.", "error"));
  }

  const orcPorCategoria = (cat) =>
    orcamentos.filter((o) => cat.statuses.includes(o.status || "rascunho"));

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>Venda Personalizada</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>Orçamentos para eventos, obras ou serviços. O cliente preenche a ficha pelo link.</p>
          </div>
          <button type="button" onClick={() => navigate("/produtos-orcamento")} style={btnSec}>Componentes</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          {/* Canto esquerdo: link para novo orçamento */}
          <div style={{ ...secao, position: "sticky", top: 24, flex: "0 0 440px", minWidth: 360, maxWidth: 480, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3", fontSize: "1.1rem" }}>Novo orçamento</h3>
            <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16 }}>Configure a ficha e crie o orçamento. O cliente preenche pelo link.</p>
            <input
              type="text"
              placeholder="Código (ex.: Casamento Silva, Reforma Cozinha)"
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value)}
              style={inputStyle}
              className="campo-fundo-claro"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={salvarModelo} disabled={salvandoModelo} style={{ ...btnSec, flex: 1 }}>{salvandoModelo ? "Salvando..." : "Salvar modelo"}</button>
              <button type="button" onClick={() => setModalModelos(true)} style={{ ...btnSec, flex: 1 }}>Acessar modelos</button>
            </div>
            <h4 style={{ margin: "20px 0 10px", color: "#e6edf3", fontSize: "0.95rem" }}>Campos de dados do cliente</h4>
            <p style={{ color: "#8b949e", fontSize: "0.8rem", marginBottom: 10 }}>Edite o rótulo de cada campo. O cliente verá esses campos ao preencher.</p>
            {camposDados.map((c, i) => (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input style={{ ...inputStyle, flex: 1 }} value={c.label} onChange={(e) => setCamposDados((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="campo-fundo-claro" />
              </div>
            ))}
            <h4 style={{ margin: "20px 0 10px", color: "#e6edf3", fontSize: "0.95rem" }}>Perguntas customizadas</h4>
            <p style={{ color: "#8b949e", fontSize: "0.8rem", marginBottom: 10 }}>Ex.: Qual tipo de festa? Para quantas pessoas? Edite ou adicione.</p>
            {perguntasCustom.map((p, i) => (
              <div key={p.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ ...inputStyle, flex: 1 }} value={p.pergunta} onChange={(e) => setPerguntasCustom((prev) => prev.map((x, j) => j === i ? { ...x, pergunta: e.target.value } : x))} placeholder="Pergunta" className="campo-fundo-claro" />
                <select style={{ ...inputStyle, width: 90 }} value={p.tipo} onChange={(e) => setPerguntasCustom((prev) => prev.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))} className="campo-fundo-claro">
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                  <option value="data">Data</option>
                </select>
                <button type="button" onClick={() => setPerguntasCustom((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", padding: "4px 8px" }} title="Remover">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setPerguntasCustom((prev) => [...prev, { id: "q" + Date.now(), pergunta: "Nova pergunta", tipo: "texto", obrigatorio: false, ordem: prev.length }])} style={{ ...btnSec, marginBottom: 16, width: "100%" }}>+ Adicionar pergunta</button>
            <button type="button" onClick={criarOrcamento} disabled={criando} style={{ ...btnPrim, width: "100%" }}>
              {criando ? "Criando..." : "+ Criar e gerar link"}
            </button>
            {linkNovoOrcamento && (
              <div style={{ marginTop: 20, padding: 16, background: "rgba(0,242,255,0.08)", borderRadius: 8, border: "1px solid rgba(0,242,255,0.3)" }}>
                <p style={{ margin: "0 0 8px", fontSize: "0.8125rem", color: "#8b949e" }}>Link para o cliente:</p>
                <code style={{ fontSize: "0.8125rem", wordBreak: "break-all", display: "block", color: "#00F2FF", marginBottom: 12 }}>{linkNovoOrcamento.link}</code>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => copiarLink(linkNovoOrcamento.link)} style={btnPrim}>Copiar link</button>
                  <button type="button" onClick={() => navigate("/orcamentos/" + linkNovoOrcamento.id)} style={btnSec}>Abrir orçamento</button>
                </div>
              </div>
            )}
          </div>

          {/* Lista de orçamentos por categoria */}
          <div style={{ flex: 1, minWidth: 320 }}>
            {loading ? (
              <p style={{ color: "#8b949e" }}>Carregando...</p>
            ) : orcamentos.length === 0 ? (
              <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum orçamento. Crie um novo no canto esquerdo e envie o link ao cliente.</p>
            ) : (
              CATEGORIAS.map((cat) => {
                const lista = orcPorCategoria(cat);
                if (lista.length === 0) return null;
                return (
                  <div key={cat.id} style={{ marginBottom: 28 }}>
                    <h3 style={{ margin: "0 0 12px", color: cat.cor, fontSize: "1rem", fontWeight: 700, textTransform: "uppercase" }}>
                      {cat.label} ({lista.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {lista.map((o) => (
                        <div
                          key={o._id}
                          onClick={() => navigate("/orcamentos/" + o._id)}
                          style={{ ...card, cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                            <div>
                              <strong style={{ color: "#e6edf3", fontSize: "1.05rem", display: "block" }}>{o.codigo || "Orçamento"}</strong>
                              <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>Cliente: {o.cliente?.nome || "—"}</p>
                              <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.875rem" }}>Data prevista: {formatarData(o.dataEvento)} · {(o.itens || []).length} itens</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#00F2FF" }}>R$ {(o.valorTotal || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {!loading && orcamentos.length > 0 && CATEGORIAS.every((c) => orcPorCategoria(c).length === 0) && (
              <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum orçamento nas categorias exibidas.</p>
            )}
          </div>
        </div>
        {modalModelos && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setModalModelos(false)}>
            <div style={{ background: "#161b22", padding: 24, borderRadius: 12, maxWidth: 480, width: "90%", maxHeight: "80vh", overflowY: "auto", border: BORDER }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>Modelos preestabelecidos</h3>
              <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16 }}>Selecione um modelo para carregar os campos e perguntas.</p>
              {modelos.length === 0 ? (
                <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum modelo salvo. Configure a ficha e clique em &quot;Salvar modelo&quot;.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {modelos.map((m) => (
                    <button key={m._id} type="button" onClick={() => carregarModelo(m)} style={{ ...btnSec, textAlign: "left", padding: 12 }}>
                      <strong style={{ display: "block" }}>{m.nome}</strong>
                      <span style={{ fontSize: "0.8125rem", color: "#8b949e" }}>{(m.camposDados || []).length} campos · {(m.perguntasCustom || []).length} perguntas</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setModalModelos(false)} style={{ ...btnSec, marginTop: 16, width: "100%" }}>Fechar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const secao = { padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)" };
const btnPrim = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSec = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
const inputStyle = { padding: "10px 14px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", width: "100%", boxSizing: "border-box" };
const card = { padding: 16, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.04)" };
