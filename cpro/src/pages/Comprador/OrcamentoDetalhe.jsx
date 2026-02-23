// OrcamentoDetalhe.jsx — Ficha do cliente, componentes e contrato
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

const STATUS_OPCOES = [
  { value: "rascunho", label: "Proposta não enviada" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "proposta_enviada", label: "Em negociação" },
  { value: "confirmado", label: "Aceito" },
  { value: "pago", label: "Aceito e pago" },
];
const FRONT_URL = window.location.origin;
const BORDER = "1px solid rgba(255,255,255,0.08)";

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}

export default function OrcamentoDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [orc, setOrc] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("ficha");
  const [buscaProd, setBuscaProd] = useState("");
  const [catFiltro, setCatFiltro] = useState("");

  const empresaId = JSON.parse(sessionStorage.getItem("usuario") || "{}")?.compradorId || JSON.parse(sessionStorage.getItem("usuario") || "{}")?._id;

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u || !u._id) { navigate("/"); return; }
  }, [navigate]);

  useEffect(() => {
    if (!id || !empresaId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/orcamentos/${id}`).then((r) => r.json()),
      fetch(`${API_URL}/api/produtos-orcamento?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
    ])
      .then(([ev, prods]) => {
        if (ev.error) throw new Error(ev.error);
        setOrc(ev);
        setProdutos(Array.isArray(prods) ? prods : []);
      })
      .catch((err) => {
        Swal.fire("Erro", err.message, "error");
        navigate("/orcamentos");
      })
      .finally(() => setLoading(false));
  }, [id, empresaId, navigate]);

  const produtosFiltrados = useMemo(() => {
    const b = buscaProd.trim().toLowerCase();
    const cat = catFiltro || "";
    return produtos.filter((p) => {
      const matchBusca = !b || (p.nome || "").toLowerCase().includes(b) || (p.categoria || "").toLowerCase().includes(b);
      const matchCat = !cat || (p.categoria || "Geral") === cat;
      return matchBusca && matchCat;
    });
  }, [produtos, buscaProd, catFiltro]);

  const categorias = useMemo(() => {
    const cats = [...new Set(produtos.map((p) => ((p.categoria || "Geral").trim() || "Geral")))].filter(Boolean).sort();
    return [...new Set(["Geral", ...cats])].sort();
  }, [produtos]);

  async function salvar(dados) {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/orcamentos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error("Erro ao salvar.");
      const ev = await res.json();
      setOrc(ev);
      Swal.fire("Salvo", "Alterações salvas.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  function adicionarItem(prod) {
    const itens = [...(orc.itens || [])];
    const existente = itens.find((i) => i.produtoId === prod._id || i.nome === prod.nome);
    if (existente) {
      existente.quantidade = (existente.quantidade || 1) + 1;
    } else {
      itens.push({
        produtoId: prod._id,
        nome: prod.nome,
        descricao: prod.descricao,
        quantidade: 1,
        precoUnitario: prod.preco || 0,
        unidade: prod.unidade || "un",
      });
    }
    salvar({ itens });
  }

  function alterarQtd(index, novaQtd) {
    const n = parseFloat(String(novaQtd).replace(",", ".")) || 0;
    const itens = [...(orc.itens || [])];
    if (n <= 0) itens.splice(index, 1);
    else itens[index] = { ...itens[index], quantidade: n };
    salvar({ itens });
  }

  function removerItem(index) {
    const itens = (orc.itens || []).filter((_, i) => i !== index);
    salvar({ itens });
  }

  function imprimirContrato() {
    const e = orc;
    const cl = e?.cliente || {};
    const itensHtml = (e?.itens || []).map((i) => `<tr><td>${(i.nome || "").replace(/</g, "&lt;")}</td><td>${i.quantidade}</td><td>${(i.unidade || "un").replace(/</g, "&lt;")}</td><td>R$ ${(i.precoUnitario || 0).toFixed(2)}</td><td>R$ ${((i.quantidade || 0) * (i.precoUnitario || 0)).toFixed(2)}</td></tr>`).join("");
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contrato - ${(e?.codigo || "Orçamento").replace(/</g, "&lt;")}</title>
<style>body{font-family:sans-serif;padding:24px;max-width:700px;margin:0 auto;font-size:14px}
h1{font-size:1.25rem;border-bottom:1px solid #333;padding-bottom:8px}
h2{font-size:1rem;margin-top:24px;color:#444}
table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px;border:1px solid #ddd}
.th{text-align:left;background:#f5f5f5}
</style></head><body>
<h1>CONTRATO / ORÇAMENTO COMERCIAL</h1>
<p><em>Documento gerado em ${new Date().toLocaleString("pt-BR")}</em></p>

<h2>1. DADOS DO CLIENTE</h2>
<table>
<tr><td class="th" width="180">Nome completo</td><td>${(cl.nome || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">CPF</td><td>${(cl.cpf || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">E-mail</td><td>${(cl.email || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">Telefone</td><td>${(cl.telefone || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">Endereço</td><td>${(cl.endereco || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">Cidade / Estado / CEP</td><td>${(cl.cidade || "—").replace(/</g, "&lt;")} / ${(cl.estado || "—").replace(/</g, "&lt;")} / ${(cl.cep || "—").replace(/</g, "&lt;")}</td></tr>
</table>

<h2>2. DETALHES DO SERVIÇO / EVENTO / OBRA</h2>
<table>
<tr><td class="th">Data prevista</td><td>${formatarData(e?.dataEvento)}</td></tr>
<tr><td class="th">Tipo (evento, obra, serviço)</td><td>${(e?.tipoEvento || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">Local ou endereço</td><td>${(e?.localEvento || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="th">Observações</td><td>${(e?.qtdConvidados ? `Qtd. convidados: ${e.qtdConvidados}` : "—").replace(/</g, "&lt;")}</td></tr>
</table>

<h2>3. COMPONENTES ADQUIRIDOS</h2>
<table>
<tr><th class="th">Descrição</th><th>Qtd</th><th>Un.</th><th>Preço unit.</th><th>Total</th></tr>
${itensHtml || "<tr><td colspan='5'>Nenhum item</td></tr>"}
</table>
<p style="margin-top:16px;font-weight:700;font-size:1.1rem">VALOR TOTAL: R$ ${(e?.valorTotal || 0).toFixed(2).replace(".", ",")}</p>

<p style="margin-top:32px;font-size:0.9rem;color:#666">Contrato gerado automaticamente com os dados e itens do orçamento.</p>
</body></html>`;
    const w = window.open("", "_blank", "width=750,height=900");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  }

  function gerarPdfContrato() {
    const e = orc;
    const cl = e?.cliente || {};
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let y = 20;
    doc.setFontSize(16);
    doc.text("CONTRATO / ORÇAMENTO COMERCIAL", 20, y); y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento gerado em ${new Date().toLocaleString("pt-BR")}`, 20, y); y += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("1. DADOS DO CLIENTE", 20, y); y += 8;
    doc.setFontSize(10);
    const camposCliente = [
      ["Nome", cl.nome || "—"], ["CPF", cl.cpf || "—"], ["E-mail", cl.email || "—"],
      ["Telefone", cl.telefone || "—"], ["Endereço", cl.endereco || "—"],
      ["Cidade/Estado/CEP", `${cl.cidade || ""} / ${cl.estado || ""} / ${cl.cep || ""}`],
    ];
    camposCliente.forEach(([lbl, val]) => {
      doc.setFont(undefined, "bold");
      doc.text(`${lbl}: `, 20, y);
      doc.setFont(undefined, "normal");
      doc.text(String(val).substring(0, 90), 20 + doc.getTextWidth(`${lbl}: `), y);
      y += 7;
    });
    y += 4;
    doc.setFont(undefined, "bold");
    doc.text("2. DETALHES DO SERVIÇO / EVENTO / OBRA", 20, y); y += 8;
    doc.setFont(undefined, "normal");
    doc.text(`Data prevista: ${formatarData(e?.dataEvento)} | Tipo: ${e?.tipoEvento || "—"} | Local: ${e?.localEvento || "—"}`, 20, y); y += 10;
    doc.setFont(undefined, "bold");
    doc.text("3. COMPONENTES ADQUIRIDOS", 20, y); y += 8;
    doc.text("Descrição", 20, y); doc.text("Qtd", 112, y); doc.text("Un.", 132, y); doc.text("Preço unit.", 152, y); doc.text("Total", 182, y); y += 7;
    doc.setFont(undefined, "normal");
    (e?.itens || []).forEach((item) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const tot = (item.quantidade || 0) * (item.precoUnitario || 0);
      doc.text((item.nome || "").substring(0, 35), 20, y); doc.text(String(item.quantidade), 112, y); doc.text((item.unidade || "un").substring(0, 3), 132, y); doc.text(`R$ ${(item.precoUnitario || 0).toFixed(2)}`, 152, y); doc.text(`R$ ${tot.toFixed(2)}`, 182, y); y += 7;
    });
    y += 8;
    doc.setFont(undefined, "bold");
    doc.text(`VALOR TOTAL: R$ ${(e?.valorTotal || 0).toFixed(2)}`, 20, y);
    doc.save(`Contrato-${(e?.codigo || "orcamento").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    Swal.fire("Sucesso", "PDF gerado e salvo.", "success");
  }

  function copiarLink() {
    const url = `${FRONT_URL}/orcamento/${orc?.tokenAcesso}`;
    navigator.clipboard.writeText(url).then(() => Swal.fire("Copiado!", "Link copiado para a área de transferência.", "success")).catch(() => Swal.fire("Erro", "Não foi possível copiar.", "error"));
  }

  if (loading || !orc) return <div style={{ padding: 40, color: "#8b949e" }}>Carregando...</div>;

  const cl = orc.cliente || {};

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>{orc.codigo || "Orçamento"}</h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>R$ {(orc.valorTotal || 0).toFixed(2)} · {orc.itens?.length || 0} itens</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <label style={{ color: "#8b949e", fontSize: "0.8125rem" }}>Situação:</label>
              <select value={orc.status || "rascunho"} onChange={(e) => salvar({ status: e.target.value })} style={{ ...inp, width: "auto", minWidth: 180 }} className="campo-fundo-claro">
                {STATUS_OPCOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/orcamentos")} style={btnSec}>← Voltar</button>
            <button type="button" onClick={copiarLink} style={btnSec}>Copiar link do cliente</button>
            <button type="button" onClick={() => setAba("contrato")} style={btnPrim}>Confeccionar contrato</button>
          </div>
        </div>

        <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          {["ficha", "produtos", "contrato"].map((a) => (
            <button key={a} type="button" onClick={() => setAba(a)} style={{ ...btnTab, ...(aba === a ? btnTabActive : {}) }}>{a === "ficha" ? "Ficha do cliente" : a === "produtos" ? "Componentes" : "Contrato"}</button>
          ))}
        </div>

        {aba === "ficha" && (
          <div style={secao}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>Dados do cliente</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {["nome", "cpf", "email", "telefone", "endereco", "cidade", "estado", "cep"].map((campo) => (
                <div key={campo}>
                  <label style={lbl}>{campo === "nome" ? "Nome" : campo === "endereco" ? "Endereço" : campo.charAt(0).toUpperCase() + campo.slice(1)}</label>
                  <input style={inp} value={cl[campo] || ""} onChange={(e) => setOrc((p) => ({ ...p, cliente: { ...(p.cliente || {}), [campo]: e.target.value } }))} onBlur={(e) => salvar({ cliente: { [campo]: e.target.value } })} placeholder={campo} className="campo-fundo-claro" />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Data prevista</label>
                <input type="date" style={inp} value={orc.dataEvento ? new Date(orc.dataEvento).toISOString().slice(0, 10) : ""} onChange={(e) => setOrc((p) => ({ ...p, dataEvento: e.target.value }))} onBlur={(e) => salvar({ dataEvento: e.target.value })} className="campo-fundo-claro" />
              </div>
              <div><label style={lbl}>Tipo (evento, obra, serviço)</label><input style={inp} value={orc.tipoEvento || ""} onChange={(e) => setOrc((p) => ({ ...p, tipoEvento: e.target.value }))} onBlur={(e) => salvar({ tipoEvento: e.target.value })} placeholder="Ex.: Casamento, Reforma, Instalação" className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Local ou endereço</label><input style={inp} value={orc.localEvento || ""} onChange={(e) => setOrc((p) => ({ ...p, localEvento: e.target.value }))} onBlur={(e) => salvar({ localEvento: e.target.value })} className="campo-fundo-claro" /></div>
              <div><label style={lbl}>Observações</label><input style={inp} value={orc.qtdConvidados ?? ""} onChange={(e) => setOrc((p) => ({ ...p, qtdConvidados: e.target.value }))} onBlur={(e) => salvar({ qtdConvidados: e.target.value })} placeholder="Ex.: qtd. convidados" className="campo-fundo-claro" /></div>
            </div>
          </div>
        )}

        {aba === "produtos" && (
          <div style={secao}>
            <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>Selecione os componentes para o orçamento</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <input type="text" placeholder="Buscar..." value={buscaProd} onChange={(e) => setBuscaProd(e.target.value)} style={inp} className="campo-fundo-claro" />
              <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} style={inp} className="campo-fundo-claro">
                <option value="">Todas</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {produtosFiltrados.map((p) => (
                <div key={p._id} style={cardProd}>
                  <strong>{p.nome}</strong>
                  <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>R$ {(p.preco || 0).toFixed(2)}</span>
                  <button type="button" onClick={() => adicionarItem(p)} style={btnAdd}>+ Adicionar</button>
                </div>
              ))}
            </div>
            {produtosFiltrados.length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic" }}>Cadastre produtos na página Produtos.</p>}

            <h3 style={{ margin: "24px 0 12px", color: "#e6edf3" }}>Itens selecionados</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(orc.itens || []).map((i, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: BORDER }}>
                  <span style={{ flex: 1 }}>{i.nome}</span>
                  <input type="number" min="0.01" step="1" value={i.quantidade} onChange={(e) => alterarQtd(idx, e.target.value)} style={{ width: 60, padding: 6, borderRadius: 4, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }} className="campo-fundo-claro" />
                  <span style={{ minWidth: 80 }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</span>
                  <button type="button" onClick={() => removerItem(idx)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}>×</button>
                </li>
              ))}
            </ul>
            {(orc.itens || []).length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhum item. Selecione acima.</p>}
          </div>
        )}

        {aba === "contrato" && (
          <div style={secao}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#e6edf3" }}>Contrato</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={imprimirContrato} style={btnPrim}>Imprimir</button>
                <button type="button" onClick={gerarPdfContrato} style={btnSec}>Gerar PDF</button>
              </div>
            </div>
            <p style={{ color: "#8b949e", marginBottom: 16 }}>Contrato preenchido automaticamente com os dados do cliente e itens adquiridos.</p>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 24, borderRadius: 8, border: BORDER, fontSize: "0.9rem" }}>
              <h4 style={{ margin: "0 0 12px", color: "#e6edf3" }}>CONTRATO / ORÇAMENTO COMERCIAL</h4>
              <p style={{ margin: "0 0 8px" }}><strong>1. Dados do cliente:</strong> {cl.nome || "—"} | CPF: {cl.cpf || "—"} | E-mail: {cl.email || "—"} | Tel: {cl.telefone || "—"}</p>
              <p style={{ margin: "0 0 8px" }}><strong>2. Detalhes:</strong> Data: {formatarData(orc.dataEvento)} | Tipo: {orc.tipoEvento || "—"} | Local: {orc.localEvento || "—"}</p>
              <p style={{ margin: "0 0 8px" }}><strong>3. Componentes:</strong></p>
              <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
                {(orc.itens || []).map((i, idx) => (
                  <li key={idx}>{i.quantidade}x {i.nome} — R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</li>
                ))}
              </ul>
              <p style={{ margin: 0, fontWeight: 700, color: "#00F2FF", fontSize: "1rem" }}>VALOR TOTAL: R$ {(orc.valorTotal || 0).toFixed(2)}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const secao = { padding: 24, border: BORDER, borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 24 };
const lbl = { display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3", boxSizing: "border-box" };
const btnPrim = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSec = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" };
const btnTab = { padding: "10px 18px", borderRadius: 6, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer" };
const btnTabActive = { background: "rgba(0,242,255,0.15)", color: "#00F2FF", borderColor: "rgba(0,242,255,0.4)" };
const cardProd = { padding: 16, border: BORDER, borderRadius: 6, background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 8 };
const btnAdd = { padding: "8px 14px", borderRadius: 4, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" };
