// RelatoriosFuncionarios.jsx — Gerar relatórios em PDF
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const TIPOS_RELATORIO = [
  { id: "todos", label: "Todos os funcionários", desc: "Lista completa de funcionários" },
  { id: "por-setor", label: "Por setor/departamento", desc: "Agrupado por departamento" },
  { id: "custo-total", label: "Custo total (folha)", desc: "Soma dos salários por setor e total" },
  { id: "absenteismo", label: "Absenteísmo", desc: "Dias sem batida de entrada no período" },
  { id: "atrasos", label: "Atrasos", desc: "Entradas após o horário esperado" },
];

function formatarData(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleDateString("pt-BR");
}
function formatarMoeda(v) {
  return v != null && !isNaN(v) ? "R$ " + Number(v).toFixed(2).replace(".", ",") : "—";
}
function formatarHora(d) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "—" : x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function RelatoriosFuncionarios() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [historicoPonto, setHistoricoPonto] = useState({});
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("todos");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [horarioEntradaEsperado, setHorarioEntradaEsperado] = useState("08:00");

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
    fetch(`${API_URL}/api/funcionarios-autorizados?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setFuncionarios(Array.isArray(lista) ? lista : []))
      .catch(() => setFuncionarios([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || funcionarios.length === 0 || !["absenteismo", "atrasos"].includes(tipoSelecionado)) return;
    const promises = funcionarios.map((f) =>
      fetch(`${API_URL}/api/ponto/historico?empresa=${encodeURIComponent(empresaId)}&funcionarioId=${f._id}&dataInicio=${dataInicio}&dataFim=${dataFim}`).then((r) => r.json())
    );
    Promise.all(promises).then((listas) => {
      const mapa = {};
      funcionarios.forEach((f, i) => {
        mapa[f._id] = Array.isArray(listas[i]) ? listas[i] : [];
      });
      setHistoricoPonto(mapa);
    });
  }, [empresaId, funcionarios, dataInicio, dataFim, tipoSelecionado]);

  function gerarPDF() {
    if (!funcionarios.length) {
      Swal.fire("Aviso", "Nenhum funcionário para incluir no relatório.", "warning");
      return;
    }
    setGerando(true);
    const doc = new jsPDF({ orientation: "portrait" });
    const hoje = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(14);
    doc.text("Relatório de Funcionários - " + (TIPOS_RELATORIO.find((t) => t.id === tipoSelecionado)?.label || tipoSelecionado), 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + hoje, 14, 22);

    let y = 30;

    if (tipoSelecionado === "todos") {
      doc.autoTable({
        startY: y,
        head: [["Nome", "CPF", "Cargo", "Departamento", "Admissão", "Salário"]],
        body: funcionarios.map((f) => [
          f.nome || "—",
          f.cpf || "—",
          f.cargo || "—",
          f.departamento || "—",
          formatarData(f.dataAdmissao),
          formatarMoeda(f.salario),
        ]),
        theme: "grid",
      });
    } else if (tipoSelecionado === "por-setor") {
      const porSetor = {};
      funcionarios.forEach((f) => {
        const dep = (f.departamento || "").trim() || "Sem departamento";
        if (!porSetor[dep]) porSetor[dep] = [];
        porSetor[dep].push(f);
      });
      Object.entries(porSetor).forEach(([dep, list]) => {
        if (y > 250) {
          doc.addPage();
          y = 15;
        }
        doc.setFontSize(11);
        doc.text("Departamento: " + dep, 14, y);
        y += 6;
        doc.autoTable({
          startY: y,
          head: [["Nome", "Cargo", "Admissão", "Salário"]],
          body: list.map((f) => [f.nome || "—", f.cargo || "—", formatarData(f.dataAdmissao), formatarMoeda(f.salario)]),
          theme: "grid",
        });
        y = doc.lastAutoTable.finalY + 12;
      });
    } else if (tipoSelecionado === "custo-total") {
      const porSetor = {};
      let total = 0;
      funcionarios.forEach((f) => {
        const dep = (f.departamento || "").trim() || "Sem departamento";
        if (!porSetor[dep]) porSetor[dep] = { soma: 0, lista: [] };
        const sal = Number(f.salario) || 0;
        porSetor[dep].soma += sal;
        porSetor[dep].lista.push(f);
        total += sal;
      });
      const body = Object.entries(porSetor).map(([dep, obj]) => [dep, String(obj.lista.length), formatarMoeda(obj.soma)]);
      body.push(["TOTAL", String(funcionarios.length), formatarMoeda(total)]);
      doc.autoTable({
        startY: y,
        head: [["Departamento", "Qtd", "Custo Total"]],
        body,
        theme: "grid",
      });
    } else if (tipoSelecionado === "absenteismo") {
      const diasEsperados = [];
      const dI = new Date(dataInicio);
      const dF = new Date(dataFim + "T23:59:59");
      for (let d = new Date(dI); d <= dF; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) diasEsperados.push(d.toISOString().slice(0, 10));
      }
      const body = funcionarios.map((f) => {
        const batidas = historicoPonto[f._id] || [];
        const diasComEntrada = new Set(batidas.filter((b) => b.tipo === "entrada").map((b) => new Date(b.dataHora).toISOString().slice(0, 10)));
        const ausencias = diasEsperados.filter((dia) => !diasComEntrada.has(dia));
        return [f.nome || "—", f.departamento || "—", String(diasEsperados.length), String(diasComEntrada.size), String(ausencias.length)];
      });
      doc.autoTable({
        startY: y,
        head: [["Funcionário", "Depto", "Dias úteis", "Dias trabalhados", "Ausências"]],
        body,
        theme: "grid",
      });
    } else if (tipoSelecionado === "atrasos") {
      const [h, m] = (horarioEntradaEsperado || "08:00").split(":").map(Number);
      const limite = h * 60 + m;
      const body = [];
      funcionarios.forEach((f) => {
        const batidas = (historicoPonto[f._id] || []).filter((b) => b.tipo === "entrada");
        const atrasos = batidas.filter((b) => {
          const d = new Date(b.dataHora);
          const min = d.getHours() * 60 + d.getMinutes();
          return min > limite;
        });
        if (atrasos.length > 0) {
          body.push([
            f.nome || "—",
            f.departamento || "—",
            String(atrasos.length),
            atrasos.map((a) => formatarHora(a.dataHora)).join(", "),
          ]);
        }
      });
      if (body.length === 0) {
        doc.text("Nenhum atraso registrado no período.", 14, y);
      } else {
        doc.autoTable({
          startY: y,
          head: [["Funcionário", "Depto", "Qtd atrasos", "Horários de entrada"]],
          body,
          theme: "grid",
        });
      }
    }

    doc.save("relatorio-funcionarios-" + tipoSelecionado + "-" + hoje.replace(/\//g, "-") + ".pdf");
    setGerando(false);
    Swal.fire("Sucesso", "Relatório gerado e baixado.", "success");
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>Gerar relatório</h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Selecione o tipo de relatório e clique em Gerar PDF para baixar o documento.
        </p>

        <div style={{ maxWidth: 480, marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, color: "#8b949e", fontSize: "0.8125rem" }}>Tipo de relatório</label>
          <select
            value={tipoSelecionado}
            onChange={(e) => setTipoSelecionado(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: BORDER,
              background: "rgba(0,0,0,0.2)",
              color: "#e6edf3",
              fontSize: "1rem",
            }}
            className="campo-fundo-claro"
          >
            {TIPOS_RELATORIO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 6 }}>{TIPOS_RELATORIO.find((t) => t.id === tipoSelecionado)?.desc}</p>
        </div>

        {["absenteismo", "atrasos"].includes(tipoSelecionado) && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, color: "#8b949e", fontSize: "0.8125rem" }}>Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }}
                className="campo-fundo-claro"
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, color: "#8b949e", fontSize: "0.8125rem" }}>Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }}
                className="campo-fundo-claro"
              />
            </div>
            {tipoSelecionado === "atrasos" && (
              <div>
                <label style={{ display: "block", marginBottom: 4, color: "#8b949e", fontSize: "0.8125rem" }}>Horário esperado entrada</label>
                <input
                  type="time"
                  value={horarioEntradaEsperado}
                  onChange={(e) => setHorarioEntradaEsperado(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.2)", color: "#e6edf3" }}
                  className="campo-fundo-claro"
                />
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={gerarPDF}
            disabled={loading || gerando}
            style={{
              padding: "12px 24px",
              borderRadius: 6,
              border: "none",
              background: "var(--gradient-btn-primary)",
              color: "#0B1C26",
              fontWeight: 600,
              cursor: loading || gerando ? "not-allowed" : "pointer",
            }}
          >
            {gerando ? "Gerando..." : "Gerar PDF"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/cadastro-funcionarios")}
            style={{
              padding: "12px 24px",
              borderRadius: 6,
              border: BORDER,
              background: "transparent",
              color: "#8b949e",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </div>

        {loading && <p style={{ color: "#8b949e", marginTop: 16 }}>Carregando funcionários...</p>}
      </main>
    </div>
  );
}
