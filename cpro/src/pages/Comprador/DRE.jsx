// DRE.jsx — Demonstração do Resultado do Exercício
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CATEGORIAS = [
  { id: "cmv", label: "CMV (Custo das Mercadorias Vendidas)" },
  { id: "deducoes", label: "Deduções (impostos, devoluções)" },
  { id: "vendas", label: "Despesas com vendas" },
  { id: "administrativas", label: "Despesas administrativas" },
  { id: "financeiras", label: "Despesas financeiras" },
  { id: "receita_financeira", label: "Receita financeira" },
  { id: "ir_csll", label: "IR e CSLL" },
  { id: "outras", label: "Outras despesas" },
];

function formatarMoeda(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

function formatarData(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DRE() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [dre, setDre] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ categoria: "administrativas", descricao: "", valor: "", data: "" });

  const apiUrl = typeof getApiUrl === "function" ? getApiUrl() : "http://localhost:4001";
  const token = sessionStorage.getItem("token");

  function getEmpresaId() {
    return usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null) || usuario?.empresa;
  }

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?._id) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  function getDatasPadrao() {
    const h = new Date();
    const ini = new Date(h.getFullYear(), h.getMonth(), 1);
    const f = new Date(h.getFullYear(), h.getMonth() + 1, 0);
    return {
      ini: ini.toISOString().slice(0, 10),
      fim: f.toISOString().slice(0, 10),
    };
  }

  useEffect(() => {
    if (!usuario?._id || !token) return;
    const { ini: iniPadrao, fim: fimPadrao } = getDatasPadrao();
    if (!inicio) setInicio(iniPadrao);
    if (!fim) setFim(fimPadrao);
  }, [usuario]);

  async function carregar() {
    if (!token || !getEmpresaId()) return;
    const ini = inicio || getDatasPadrao().ini;
    const fimVal = fim || getDatasPadrao().fim;
    setLoading(true);
    try {
      const [resDre, resDesp] = await Promise.all([
        fetch(`${apiUrl}/api/dre?inicio=${ini}&fim=${fimVal}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/dre/despesas?inicio=${ini}&fim=${fimVal}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resDre.ok) {
        const data = await resDre.json();
        setDre(data);
      } else setDre(null);
      if (resDesp.ok) {
        const lista = await resDesp.json();
        setDespesas(Array.isArray(lista) ? lista : []);
      } else setDespesas([]);
    } catch (err) {
      console.error(err);
      setDre(null);
      setDespesas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!usuario?._id) return;
    carregar();
  }, [usuario?._id, inicio, fim]);

  async function salvarDespesa(e) {
    e.preventDefault();
    if (!form.valor || Number(form.valor) <= 0) {
      Swal.fire({ title: "Atenção", text: "Informe um valor válido.", icon: "warning", confirmButtonText: "Ok" });
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/dre/despesas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          categoria: form.categoria,
          descricao: form.descricao,
          valor: Number(form.valor),
          data: form.data || new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erro ao salvar.");
      }
      setMostrarForm(false);
      setForm({ categoria: "administrativas", descricao: "", valor: "", data: "" });
      carregar();
      Swal.fire({ title: "Salvo!", text: "Despesa registrada.", icon: "success", confirmButtonText: "Ok" });
    } catch (err) {
      Swal.fire({ title: "Erro", text: err?.message || "Não foi possível salvar.", icon: "error", confirmButtonText: "Ok" });
    }
  }

  async function excluirDespesa(id) {
    const { isConfirmed } = await Swal.fire({
      title: "Excluir despesa?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${apiUrl}/api/dre/despesas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        carregar();
        Swal.fire({ title: "Excluído!", icon: "success", confirmButtonText: "Ok" });
      } else throw new Error("Erro ao excluir.");
    } catch (err) {
      Swal.fire({ title: "Erro", text: err?.message || "Não foi possível excluir.", icon: "error", confirmButtonText: "Ok" });
    }
  }

  if (!usuario?._id) return null;

  const d = dre?.dre || {};
  const estiloLinha = (negativo) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: BORDER,
    color: negativo ? "#f85149" : "#e6edf3",
    fontSize: "0.9375rem",
  });
  const estiloLinhaTotal = (negativo) => ({
    ...estiloLinha(negativo),
    fontWeight: 700,
    background: "rgba(0,242,255,0.06)",
    fontSize: "1rem",
  });

  return (
    <div className="layout-content-inner" style={{ maxWidth: 900, margin: "0 auto", color: "#e6edf3" }}>
      <h2 style={{ marginBottom: 8, fontSize: "1.5rem", fontWeight: 700 }}>DRE — Demonstração do Resultado do Exercício</h2>
      <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
        Consolida receitas de vendas e despesas no período. Adicione despesas manualmente para compor o resultado.
      </p>

      {/* Filtro de período */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>De:</label>
        <input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
        />
        <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Até:</label>
        <input
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
        />
        <button
          type="button"
          onClick={() => carregar()}
          style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" }}
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#8b949e" }}>Carregando...</p>
      ) : (
        <>
          {/* Tabela DRE */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: BORDER, borderRadius: 8, overflow: "hidden", marginBottom: 32 }}>
            <div style={{ padding: "16px 20px", borderBottom: BORDER, background: "rgba(0,242,255,0.08)" }}>
              <h3 style={{ margin: 0, color: "#00F2FF", fontSize: "1.125rem", fontWeight: 700 }}>
                Período: {dre?.periodo?.inicio ? formatarData(dre.periodo.inicio) : "—"} a {dre?.periodo?.fim ? formatarData(dre.periodo.fim) : "—"}
              </h3>
              {dre?.qtdeVendas != null && (
                <span style={{ color: "#8b949e", fontSize: "0.8125rem" }}>{dre.qtdeVendas} vendas no período</span>
              )}
            </div>
            <div style={{ padding: 0 }}>
              <div style={estiloLinha()}>
                <span>1. Receita bruta de vendas</span>
                <span>{formatarMoeda(d.receitaBruta)}</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) Deduções da receita</span>
                <span>({formatarMoeda(d.deducoes)})</span>
              </div>
              <div style={estiloLinhaTotal()}>
                <span>2. Receita líquida</span>
                <span>{formatarMoeda(d.receitaLiquida)}</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) CMV (Custo das mercadorias vendidas)</span>
                <span>({formatarMoeda(d.cmv)})</span>
              </div>
              <div style={estiloLinhaTotal(d.lucroBruto < 0)}>
                <span>3. Lucro bruto</span>
                <span>{formatarMoeda(d.lucroBruto)}</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) Despesas com vendas</span>
                <span>({formatarMoeda(d.despesasVendas)})</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) Despesas administrativas</span>
                <span>({formatarMoeda(d.despesasAdministrativas)})</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) Outras despesas</span>
                <span>({formatarMoeda(d.outrasDespesas)})</span>
              </div>
              <div style={estiloLinhaTotal(d.lucroOperacional < 0)}>
                <span>4. Lucro operacional (EBIT)</span>
                <span>{formatarMoeda(d.lucroOperacional)}</span>
              </div>
              <div style={estiloLinha(d.receitaFinanceira > 0)}>
                <span style={{ paddingLeft: 24 }}>(+) Receita financeira</span>
                <span>{formatarMoeda(d.receitaFinanceira)}</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) Despesas financeiras</span>
                <span>({formatarMoeda(d.despesasFinanceiras)})</span>
              </div>
              <div style={estiloLinha()}>
                <span style={{ paddingLeft: 24 }}>(=) Resultado financeiro</span>
                <span style={{ color: (d.resultadoFinanceiro || 0) >= 0 ? "#27ae60" : "#f85149" }}>{formatarMoeda(d.resultadoFinanceiro)}</span>
              </div>
              <div style={estiloLinhaTotal(d.lair < 0)}>
                <span>5. Resultado antes do IR e CSLL (LAIR)</span>
                <span>{formatarMoeda(d.lair)}</span>
              </div>
              <div style={estiloLinha(true)}>
                <span style={{ paddingLeft: 24 }}>(-) IR e CSLL</span>
                <span>({formatarMoeda(d.irCsll)})</span>
              </div>
              <div style={{ ...estiloLinhaTotal(d.lucroLiquido < 0), background: "rgba(0,242,255,0.12)", fontSize: "1.125rem" }}>
                <span>6. Lucro líquido do exercício</span>
                <span style={{ color: (d.lucroLiquido || 0) >= 0 ? "#27ae60" : "#f85149", fontWeight: 800 }}>
                  {formatarMoeda(d.lucroLiquido)}
                </span>
              </div>
            </div>
          </div>

          {/* Botão adicionar despesa */}
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setMostrarForm(!mostrarForm)}
              style={{
                padding: "12px 24px",
                borderRadius: 6,
                border: BORDER,
                background: mostrarForm ? "transparent" : "var(--gradient-btn-primary)",
                color: mostrarForm ? "#8b949e" : "#0B1C26",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {mostrarForm ? "Cancelar" : "+ Lançar despesa ou receita"}
            </button>
          </div>

          {/* Form de despesa */}
          {mostrarForm && (
            <form onSubmit={salvarDespesa} style={{ background: "rgba(255,255,255,0.04)", border: BORDER, borderRadius: 8, padding: 24, marginBottom: 24 }}>
              <h4 style={{ margin: "0 0 16px", color: "#00F2FF", fontSize: "1rem" }}>Nova despesa / receita</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", color: "#8b949e", fontSize: "0.8125rem", marginBottom: 4 }}>Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "#8b949e", fontSize: "0.8125rem", marginBottom: 4 }}>Descrição (opcional)</label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Aluguel mensal, Energia..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ display: "block", color: "#8b949e", fontSize: "0.8125rem", marginBottom: 4 }}>Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                      placeholder="0,00"
                      required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ display: "block", color: "#8b949e", fontSize: "0.8125rem", marginBottom: 4 }}>Data</label>
                    <input
                      type="date"
                      value={form.data || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: BORDER, background: "rgba(0,0,0,0.3)", color: "#e6edf3" }}
                    />
                  </div>
                </div>
                <button type="submit" style={{ padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Lista de despesas lançadas */}
          {despesas.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: BORDER, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: BORDER }}>
                <h4 style={{ margin: 0, color: "#00F2FF", fontSize: "1rem" }}>Lançamentos do período</h4>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {despesas.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 20px",
                      borderBottom: BORDER,
                    }}
                  >
                    <div>
                      <span style={{ color: "#e6edf3", fontWeight: 500 }}>{CATEGORIAS.find((c) => c.id === item.categoria)?.label || item.categoria}</span>
                      {item.descricao && <span style={{ color: "#8b949e", fontSize: "0.875rem", marginLeft: 8 }}>— {item.descricao}</span>}
                      <span style={{ color: "#8b949e", fontSize: "0.8125rem", display: "block", marginTop: 2 }}>{formatarData(item.data)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: ["receita_financeira"].includes(item.categoria) ? "#27ae60" : "#f85149", fontWeight: 600 }}>
                        {["receita_financeira"].includes(item.categoria) ? "" : "-"} {formatarMoeda(Math.abs(item.valor))}
                      </span>
                      <button
                        type="button"
                        onClick={() => excluirDespesa(item._id)}
                        style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid rgba(248,81,73,0.5)", background: "transparent", color: "#f85149", cursor: "pointer", fontSize: "0.8125rem" }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
