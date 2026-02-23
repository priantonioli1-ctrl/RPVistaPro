// FichaFuncionario.jsx — Ficha completa de RH do funcionário
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const TIPOS_ANEXO = [
  { id: "contrato", label: "Contrato" },
  { id: "atestado", label: "Atestado" },
  { id: "advertencia", label: "Advertência" },
  { id: "carta-demissao", label: "Carta de demissão" },
  { id: "outro", label: "Outro" },
];

const TIPOS_OCORRENCIA = [
  { id: "positiva", label: "Positiva", cor: "#25C19B" },
  { id: "negativa", label: "Negativa", cor: "#f85149" },
  { id: "neutra", label: "Neutra", cor: "#8b949e" },
];

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}

function formatarDataHora(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleString("pt-BR");
}

const secao = {
  marginBottom: 32,
  padding: 24,
  border: BORDER,
  borderRadius: 8,
  background: "rgba(255,255,255,0.03)",
};
const tituloSecao = { margin: "0 0 16px", color: "#e6edf3", fontSize: "1.125rem", fontWeight: 700 };
const inputDark = {
  padding: "10px 12px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.9375rem",
  width: "100%",
  boxSizing: "border-box",
};
const label = { display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.8125rem", textTransform: "uppercase" };

export default function FichaFuncionario() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Novo anexo
  const [novoAnexoTipo, setNovoAnexoTipo] = useState("contrato");
  const [novoAnexoNome, setNovoAnexoNome] = useState("");
  const [novoAnexoDesc, setNovoAnexoDesc] = useState("");
  const [novoAnexoData, setNovoAnexoData] = useState("");
  const [uploadandoAnexo, setUploadandoAnexo] = useState(false);

  // Nova ocorrência
  const [novaOcorrDesc, setNovaOcorrDesc] = useState("");
  const [novaOcorrTipo, setNovaOcorrTipo] = useState("neutra");
  const [novaOcorrData, setNovaOcorrData] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/funcionarios-autorizados/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFuncionario(data);
      })
      .catch((err) => {
        Swal.fire("Erro", err.message || "Não foi possível carregar.", "error");
        navigate("/cadastro-funcionarios");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function salvar(update) {
    if (!id) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/funcionarios-autorizados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setFuncionario((prev) => ({ ...prev, ...update }));
      Swal.fire("Sucesso", "Alterações salvas.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvando(false);
    }
  }

  function adicionarAnexo() {
    const nome = novoAnexoNome.trim();
    if (!nome) {
      Swal.fire("Atenção", "Escolha um arquivo ou informe o nome do documento.", "warning");
      return;
    }
    const anexos = [...(funcionario.anexos || []), { tipo: novoAnexoTipo, nome, descricao: novoAnexoDesc.trim() || undefined, data: novoAnexoData || undefined }];
    salvar({ anexos });
    setNovoAnexoNome("");
    setNovoAnexoDesc("");
    setNovoAnexoData("");
  }

  async function handleEscolherArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadandoAnexo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        const anexos = [...(funcionario.anexos || []), { tipo: novoAnexoTipo, nome: data.nome || file.name, url: data.url, descricao: novoAnexoDesc.trim() || undefined, data: novoAnexoData || undefined }];
        salvar({ anexos });
        setNovoAnexoDesc("");
        setNovoAnexoData("");
        Swal.fire("Sucesso", "Arquivo anexado com sucesso.", "success");
      } else {
        const msg = data.error || (res.status === 404 ? "API de upload não encontrada. Verifique se o backend está rodando na porta 4001." : "Falha ao enviar arquivo.");
        Swal.fire("Erro", msg, "error");
      }
    } catch (err) {
      const msg = err.message?.includes("Failed to fetch") ? "Não foi possível conectar ao servidor. Verifique se o backend está rodando." : (err.message || "Falha ao enviar arquivo.");
      Swal.fire("Erro", msg, "error");
    } finally {
      setUploadandoAnexo(false);
      e.target.value = "";
    }
  }

  function removerAnexo(index) {
    const anexos = (funcionario.anexos || []).filter((_, i) => i !== index);
    salvar({ anexos });
  }

  function adicionarOcorrencia() {
    const desc = novaOcorrDesc.trim();
    if (!desc) {
      Swal.fire("Atenção", "Descreva a ocorrência.", "warning");
      return;
    }
    const registros = [...(funcionario.registrosOcorrencia || []), { data: novaOcorrData, descricao: desc, tipo: novaOcorrTipo }];
    salvar({ registrosOcorrencia: registros });
    setNovaOcorrDesc("");
    setNovaOcorrData(new Date().toISOString().slice(0, 10));
  }

  function removerOcorrencia(index) {
    const registros = (funcionario.registrosOcorrencia || []).filter((_, i) => i !== index);
    salvar({ registrosOcorrencia: registros });
  }

  function imprimirFicha() {
    const f = funcionario;
    const janela = window.open("", "_blank", "width=700,height=900");
    const anexosHtml = (f.anexos || []).map((a) => `<tr><td>${TIPOS_ANEXO.find((t) => t.id === a.tipo)?.label || a.tipo}</td><td>${(a.nome || "").replace(/</g, "&lt;")}</td><td>${(a.descricao || "—").replace(/</g, "&lt;")}</td><td>${formatarData(a.data)}</td></tr>`).join("");
    const ocorrenciasHtml = (f.registrosOcorrencia || []).map((o) => `<tr><td>${formatarData(o.data)}</td><td>${(o.tipo || "neutra").toUpperCase()}</td><td>${(o.descricao || "").replace(/</g, "&lt;")}</td></tr>`).join("");
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ficha - ${(f.nome || "").replace(/</g, "&lt;")}</title>
<style>body{font-family:sans-serif;padding:24px;max-width:650px;margin:0 auto;font-size:13px}
h1{font-size:1.25rem;border-bottom:1px solid #333;padding-bottom:8px}
h2{font-size:1rem;margin-top:20px;color:#444}.campo{margin:6px 0}
.label{color:#666;font-size:0.75rem}.valor{font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:8px}td,th{padding:6px 8px;border:1px solid #ddd;text-align:left}
th{background:#f5f5f5}.situacao-ativo{color:green}.situacao-desligado{color:#c00}
.ocorrencia-positiva{color:green}.ocorrencia-negativa{color:#c00}
</style></head><body>
<h1>Ficha de Funcionário — RPVistaPro</h1>
<p><em>Gerado em ${new Date().toLocaleString("pt-BR")}</em></p>

<h2>1. Dados cadastrais</h2>
<table><tr><td class="label">Nome</td><td class="valor">${(f.nome || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">CPF</td><td>${(f.cpf || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">E-mail</td><td>${(f.email || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">Telefone</td><td>${(f.telefone || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">Cargo</td><td>${(f.cargo || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">Departamento</td><td>${(f.departamento || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">Matrícula</td><td>${(f.matricula || "—").replace(/</g, "&lt;")}</td></tr>
<tr><td class="label">Data admissão</td><td>${formatarData(f.dataAdmissao)}</td></tr>
<tr><td class="label">Salário</td><td>${f.salario != null ? "R$ " + Number(f.salario).toFixed(2).replace(".", ",") : "—"}</td></tr>
</table>

<h2>2. Situação</h2>
<table><tr><td class="label">Status</td><td class="situacao-${f.situacao || "ativo"}">${(f.situacao || "ativo") === "ativo" ? "Ativo" : "Desligado"}</td></tr>
${(f.situacao || "") === "desligado" ? `<tr><td class="label">Data desligamento</td><td>${formatarData(f.dataDesligamento)}</td></tr><tr><td class="label">Motivo</td><td>${(f.motivoDesligamento || "—").replace(/</g, "&lt;")}</td></tr>` : ""}
</table>

<h2>3. Documentos anexados</h2>
${(f.anexos || []).length === 0 ? "<p>Nenhum documento.</p>" : `<table><tr><th>Tipo</th><th>Nome</th><th>Descrição</th><th>Data</th></tr>${anexosHtml}</table>`}

<h2>4. Registro de ocorrências</h2>
<p style="color:#666;font-size:0.85rem">Histórico de fatos relevantes, positivos ou negativos, notificados ou não.</p>
${(f.registrosOcorrencia || []).length === 0 ? "<p>Nenhum registro.</p>" : `<table><tr><th>Data</th><th>Tipo</th><th>Descrição</th></tr>${ocorrenciasHtml}</table>`}
</body></html>`;
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      janela.print();
      janela.close();
    }, 600);
  }

  function gerarPDF() {
    const f = funcionario;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let y = 20;

    doc.setFontSize(18);
    doc.text("Ficha de Funcionário", 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 20, y);
    y += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("1. Dados cadastrais", 20, y);
    y += 8;

    const dados = [
      ["Nome", f.nome || "—"],
      ["CPF", f.cpf || "—"],
      ["E-mail", f.email || "—"],
      ["Telefone", f.telefone || "—"],
      ["Cargo", f.cargo || "—"],
      ["Departamento", f.departamento || "—"],
      ["Matrícula", f.matricula || "—"],
      ["Data admissão", formatarData(f.dataAdmissao)],
      ["Salário", f.salario != null ? "R$ " + Number(f.salario).toFixed(2).replace(".", ",") : "—"],
    ];
    dados.forEach(([label, valor]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label + ":", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(valor).slice(0, 80), 50, y);
      y += 7;
    });
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("2. Situação", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Status: " + ((f.situacao || "ativo") === "ativo" ? "Ativo" : "Desligado"), 20, y);
    y += 7;
    if ((f.situacao || "") === "desligado") {
      doc.text("Data desligamento: " + formatarData(f.dataDesligamento), 20, y);
      y += 7;
      doc.text("Motivo: " + (f.motivoDesligamento || "—"), 20, y);
      y += 10;
    } else {
      y += 5;
    }

    if ((f.anexos || []).length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("3. Documentos anexados", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      (f.anexos || []).forEach((a) => {
        doc.text(`• ${TIPOS_ANEXO.find((t) => t.id === (a.tipo || "outro"))?.label || "Outro"}: ${(a.nome || "—").slice(0, 60)}`, 25, y);
        y += 6;
      });
      y += 5;
    }

    if ((f.registrosOcorrencia || []).length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("4. Registro de ocorrências", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      (f.registrosOcorrencia || []).slice().reverse().slice(0, 15).forEach((o) => {
        doc.text(`${formatarData(o.data)} — ${(o.tipo || "neutra")}: ${(o.descricao || "").slice(0, 70)}`, 25, y);
        y += 7;
      });
    }

    doc.save(`ficha-${(f.nome || "funcionario").replace(/\s+/g, "-")}.pdf`);
    Swal.fire("Sucesso", "PDF gerado e baixado.", "success");
  }

  async function excluirFuncionario() {
    const conf = await Swal.fire({
      title: "Excluir funcionário?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });
    if (!conf.isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/api/funcionarios-autorizados/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        Swal.fire("Sucesso", "Funcionário removido.", "success");
        navigate("/cadastro-funcionarios");
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir");
      }
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível excluir.", "error");
    }
  }

  if (loading || !funcionario) return <div style={{ padding: 40, color: "#8b949e" }}>Carregando...</div>;

  const f = funcionario;
  const estaDesligado = (f.situacao || "ativo") === "desligado";

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px", maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem" }}>{f.nome || "Funcionário"}</h1>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: "0.9375rem" }}>
              {f.cargo || "—"} {f.departamento ? ` · ${f.departamento}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/cadastro-funcionarios")} style={{ padding: "8px 16px", borderRadius: 6, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer" }}>
              ← Voltar
            </button>
            <button type="button" onClick={() => navigate("/folha-ponto/" + id)} style={{ padding: "8px 16px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" }}>
              Folha de ponto
            </button>
            <button type="button" onClick={imprimirFicha} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" }}>
              Imprimir ficha
            </button>
            <button type="button" onClick={gerarPDF} style={{ padding: "8px 16px", borderRadius: 6, border: BORDER, background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" }}>
              Gerar PDF
            </button>
            <button type="button" onClick={excluirFuncionario} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(248,81,73,0.5)", background: "transparent", color: "#f85149", fontWeight: 600, cursor: "pointer" }}>
              Excluir
            </button>
          </div>
        </div>

        {/* 1. Dados cadastrais */}
        <section style={secao}>
          <h2 style={tituloSecao}>1. Dados cadastrais</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <div><label style={label}>Nome</label><input style={inputDark} value={f.nome || ""} onChange={(e) => setFuncionario((p) => ({ ...p, nome: e.target.value }))} onBlur={() => salvar({ nome: funcionario.nome })} placeholder="Nome completo" className="campo-fundo-claro" /></div>
            <div><label style={label}>CPF</label><input style={inputDark} value={f.cpf || ""} onChange={(e) => setFuncionario((p) => ({ ...p, cpf: e.target.value }))} onBlur={() => salvar({ cpf: funcionario.cpf })} placeholder="CPF" className="campo-fundo-claro" /></div>
            <div><label style={label}>E-mail</label><input style={inputDark} type="email" value={f.email || ""} onChange={(e) => setFuncionario((p) => ({ ...p, email: e.target.value }))} onBlur={() => salvar({ email: funcionario.email })} placeholder="E-mail" className="campo-fundo-claro" /></div>
            <div><label style={label}>Telefone</label><input style={inputDark} value={f.telefone || ""} onChange={(e) => setFuncionario((p) => ({ ...p, telefone: e.target.value }))} onBlur={() => salvar({ telefone: funcionario.telefone })} placeholder="Telefone" className="campo-fundo-claro" /></div>
            <div><label style={label}>Cargo</label><input style={inputDark} value={f.cargo || ""} onChange={(e) => setFuncionario((p) => ({ ...p, cargo: e.target.value }))} onBlur={() => salvar({ cargo: funcionario.cargo })} placeholder="Cargo" className="campo-fundo-claro" /></div>
            <div><label style={label}>Departamento</label><input style={inputDark} value={f.departamento || ""} onChange={(e) => setFuncionario((p) => ({ ...p, departamento: e.target.value }))} onBlur={() => salvar({ departamento: funcionario.departamento })} placeholder="Departamento" className="campo-fundo-claro" /></div>
            <div><label style={label}>Matrícula</label><input style={inputDark} value={f.matricula || ""} onChange={(e) => setFuncionario((p) => ({ ...p, matricula: e.target.value }))} onBlur={() => salvar({ matricula: funcionario.matricula })} placeholder="Matrícula" className="campo-fundo-claro" /></div>
            <div><label style={label}>Data admissão</label><input style={inputDark} type="date" value={f.dataAdmissao ? new Date(f.dataAdmissao).toISOString().slice(0, 10) : ""} onChange={(e) => setFuncionario((p) => ({ ...p, dataAdmissao: e.target.value }))} onBlur={() => salvar({ dataAdmissao: funcionario.dataAdmissao })} className="campo-fundo-claro" /></div>
            <div><label style={label}>Salário (R$)</label><input style={inputDark} type="number" step="0.01" min="0" value={f.salario != null ? f.salario : ""} onChange={(e) => setFuncionario((p) => ({ ...p, salario: e.target.value ? Number(e.target.value) : null }))} onBlur={() => salvar({ salario: funcionario.salario })} placeholder="0,00" className="campo-fundo-claro" /></div>
          </div>
        </section>

        {/* 2. Situação */}
        <section style={secao}>
          <h2 style={tituloSecao}>2. Situação</h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <label style={label}>Status</label>
              <select
                style={inputDark}
                value={f.situacao || "ativo"}
                onChange={(e) => {
                  const v = e.target.value;
                  setFuncionario((p) => ({ ...p, situacao: v, dataDesligamento: v === "desligado" ? (p.dataDesligamento || new Date().toISOString().slice(0, 10)) : null }));
                  salvar({ situacao: v, dataDesligamento: v === "desligado" ? (f.dataDesligamento || new Date().toISOString().slice(0, 10)) : null, ativo: v === "ativo" });
                }}
                className="campo-fundo-claro"
              >
                <option value="ativo">Ativo</option>
                <option value="desligado">Desligado</option>
              </select>
            </div>
            {estaDesligado && (
              <>
                <div><label style={label}>Data desligamento</label><input style={inputDark} type="date" value={f.dataDesligamento ? new Date(f.dataDesligamento).toISOString().slice(0, 10) : ""} onChange={(e) => { setFuncionario((p) => ({ ...p, dataDesligamento: e.target.value })); salvar({ dataDesligamento: e.target.value }); }} className="campo-fundo-claro" /></div>
                <div style={{ flex: 1, minWidth: 200 }}><label style={label}>Motivo desligamento</label><input style={inputDark} value={f.motivoDesligamento || ""} onChange={(e) => setFuncionario((p) => ({ ...p, motivoDesligamento: e.target.value }))} onBlur={() => salvar({ motivoDesligamento: funcionario.motivoDesligamento })} placeholder="Ex.: Pedido de demissão, acordo, justa causa..." className="campo-fundo-claro" /></div>
              </>
            )}
          </div>
        </section>

        {/* 3. Documentos anexados */}
        <section style={secao}>
          <h2 style={tituloSecao}>3. Documentos anexados</h2>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16 }}>Contratos, atestados, advertências, cartas de demissão e outros. Escolha um arquivo do computador.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <select style={{ ...inputDark, width: "auto" }} value={novoAnexoTipo} onChange={(e) => setNovoAnexoTipo(e.target.value)} className="campo-fundo-claro">
              {TIPOS_ANEXO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,image/*"
              onChange={handleEscolherArquivo}
              style={{ display: "none" }}
              id="escolher-arquivo-ficha"
            />
            <button type="button" onClick={() => document.getElementById("escolher-arquivo-ficha").click()} disabled={uploadandoAnexo} style={{ padding: "10px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.08)", color: "#e6edf3", fontWeight: 600, cursor: "pointer" }}>
              {uploadandoAnexo ? "Enviando..." : "Escolher arquivo"}
            </button>
            <input style={{ ...inputDark, width: 140 }} type="date" value={novoAnexoData} onChange={(e) => setNovoAnexoData(e.target.value)} placeholder="Data" className="campo-fundo-claro" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input style={{ ...inputDark, maxWidth: 400 }} placeholder="Descrição (opcional)" value={novoAnexoDesc} onChange={(e) => setNovoAnexoDesc(e.target.value)} className="campo-fundo-claro" />
          </div>
          <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 8 }}>Ou adicione manualmente (sem arquivo):</p>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <input style={{ ...inputDark, width: 220 }} placeholder="Nome do documento" value={novoAnexoNome} onChange={(e) => setNovoAnexoNome(e.target.value)} className="campo-fundo-claro" />
            <button type="button" onClick={adicionarAnexo} style={{ padding: "10px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#e6edf3", fontWeight: 600, cursor: "pointer" }}>Adicionar sem arquivo</button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(f.anexos || []).map((a, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                <div>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{TIPOS_ANEXO.find((t) => t.id === (a.tipo || "outro"))?.label || "Outro"}</span>
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "#00F2FF", textDecoration: "underline" }}>{a.nome || "Abrir arquivo"}</a>
                  ) : (
                    <span>{a.nome || "—"}</span>
                  )}
                  {a.descricao && <span style={{ color: "#8b949e", marginLeft: 8, fontSize: "0.875rem" }}>— {a.descricao}</span>}
                  {a.data && <span style={{ color: "#8b949e", marginLeft: 8, fontSize: "0.875rem" }}>({formatarData(a.data)})</span>}
                </div>
                <button type="button" onClick={() => removerAnexo(i)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", padding: "0 8px" }} title="Remover">×</button>
              </li>
            ))}
          </ul>
          {(f.anexos || []).length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic", marginTop: 12 }}>Nenhum documento anexado.</p>}
        </section>

        {/* 4. Registro de ocorrências */}
        <section style={secao}>
          <h2 style={tituloSecao}>4. Registro de ocorrências</h2>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16 }}>Histórico de fatos relevantes do funcionário, positivos ou negativos, não notificados e não formalizados em advertências, para conhecimento da equipe de gestão.</p>
          <div style={{ marginBottom: 16 }}>
            <textarea
              style={{ ...inputDark, minHeight: 80 }}
              placeholder="Descreva a ocorrência..."
              value={novaOcorrDesc}
              onChange={(e) => setNovaOcorrDesc(e.target.value)}
              className="campo-fundo-claro"
            />
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <input type="date" style={inputDark} value={novaOcorrData} onChange={(e) => setNovaOcorrData(e.target.value)} className="campo-fundo-claro" />
              <select style={{ ...inputDark, width: "auto" }} value={novaOcorrTipo} onChange={(e) => setNovaOcorrTipo(e.target.value)} className="campo-fundo-claro">
                {TIPOS_OCORRENCIA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button type="button" onClick={adicionarOcorrencia} style={{ padding: "10px 18px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" }}>Registrar ocorrência</button>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(f.registrosOcorrencia || []).slice().reverse().map((o, idx) => {
              const i = (f.registrosOcorrencia?.length || 0) - 1 - idx;
              return (
                <li key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: BORDER }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, marginRight: 8, color: TIPOS_OCORRENCIA.find((t) => t.id === (o.tipo || "neutra"))?.cor }}>{formatarData(o.data)}</span>
                    <span style={{ color: "#8b949e", fontSize: "0.875rem" }}>— {TIPOS_OCORRENCIA.find((t) => t.id === (o.tipo || "neutra"))?.label}</span>
                    <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{o.descricao}</p>
                  </div>
                  <button type="button" onClick={() => removerOcorrencia(i)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", alignSelf: "flex-start" }} title="Remover">×</button>
                </li>
              );
            })}
          </ul>
          {(f.registrosOcorrencia || []).length === 0 && <p style={{ color: "#8b949e", fontStyle: "italic", marginTop: 12 }}>Nenhum registro de ocorrência.</p>}
        </section>
      </main>
    </div>
  );
}
