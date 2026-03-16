// ConfiguracaoNFCe.jsx — Cadastro para emissão de NFC-e (modelo 65) SEFAZ-RJ
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";

const API_URL = getApiUrl();
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function ConfiguracaoNFCe() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    ativo: false,
    tpAmb: 2,
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    crt: 1,
    csc: "",
    idCsc: 1,
    serie: 1,
    endereco: {
      xLgr: "",
      nro: "",
      xBairro: "",
      cMun: "",
      xMun: "",
      uf: "RJ",
      cep: "",
    },
  });

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?._id && !u?.compradorId) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  function getEmpresaId() {
    return usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
  }

  function getToken() {
    return sessionStorage.getItem("token");
  }

  useEffect(() => {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/nfce/config?empresa=${encodeURIComponent(empresaId)}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        if (data?.cnpj) {
          setForm({
            ativo: !!data.ativo,
            tpAmb: data.tpAmb || 2,
            cnpj: data.cnpj || "",
            razaoSocial: data.razaoSocial || "",
            nomeFantasia: data.nomeFantasia || "",
            inscricaoEstadual: data.inscricaoEstadual || "",
            crt: data.crt || 1,
            csc: data.csc || "",
            idCsc: data.idCsc || 1,
            serie: data.serie || 1,
            endereco: {
              xLgr: data.endereco?.xLgr || "",
              nro: data.endereco?.nro || "",
              xBairro: data.endereco?.xBairro || "",
              cMun: data.endereco?.cMun || "",
              xMun: data.endereco?.xMun || "",
              uf: data.endereco?.uf || "RJ",
              cep: data.endereco?.cep || "",
            },
          });
        }
      })
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, [usuario]);

  async function salvar() {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    if (!form.cnpj?.replace(/\D/g, "").length) {
      Swal.fire("Atenção", "Informe o CNPJ do emitente.", "warning");
      return;
    }
    if (!form.razaoSocial?.trim()) {
      Swal.fire("Atenção", "Informe a razão social.", "warning");
      return;
    }
    if (form.ativo && !form.csc?.trim()) {
      Swal.fire("Atenção", "Informe o CSC (Código de Segurança do Contribuinte) para o QR Code 2.0.", "warning");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/nfce/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ empresa: empresaId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setConfig(data);
      Swal.fire("Sucesso", "Configuração NFC-e salva.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setSalvando(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 6,
    border: BORDER,
    background: "rgba(0,0,0,0.3)",
    color: "#e6edf3",
    fontSize: "0.9375rem",
  };
  const labelStyle = { display: "block", color: "#8b949e", fontSize: "0.8125rem", marginBottom: 6, fontWeight: 600 };

  if (!usuario) return null;

  return (
    <div className="layout-content-inner" style={{ maxWidth: 680 }}>
      <h2 style={{ color: "#e6edf3", fontSize: "1.5rem", marginBottom: 8 }}>Configuração NFC-e</h2>
      <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
        Configure os dados do emitente para emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica) modelo 65 — SEFAZ-RJ.
      </p>

      {loading ? (
        <p style={{ color: "#8b949e" }}>Carregando...</p>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: BORDER, borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} style={{ width: 18, height: 18 }} />
              <span style={{ color: "#e6edf3", fontWeight: 600 }}>Ativar emissão de NFC-e nas vendas</span>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Ambiente</label>
            <select value={form.tpAmb} onChange={(e) => setForm((f) => ({ ...f, tpAmb: Number(e.target.value) }))} style={inputStyle} className="campo-fundo-claro">
              <option value={2}>2 - Homologação</option>
              <option value={1}>1 - Produção</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>CNPJ</label>
              <input type="text" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>Razão social</label>
              <input type="text" value={form.razaoSocial} onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))} placeholder="Nome da empresa" style={inputStyle} className="campo-fundo-claro" />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nome fantasia</label>
            <input type="text" value={form.nomeFantasia} onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))} placeholder="Nome comercial" style={inputStyle} className="campo-fundo-claro" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Inscrição estadual</label>
              <input type="text" value={form.inscricaoEstadual} onChange={(e) => setForm((f) => ({ ...f, inscricaoEstadual: e.target.value }))} placeholder="00000000" style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>CRT (regime tributário)</label>
              <select value={form.crt} onChange={(e) => setForm((f) => ({ ...f, crt: Number(e.target.value) }))} style={inputStyle} className="campo-fundo-claro">
                <option value={1}>1 - Simples Nacional</option>
                <option value={2}>2 - Simples Excesso</option>
                <option value={3}>3 - Regime Normal</option>
              </select>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: BORDER, margin: "24px 0" }} />

          <h3 style={{ color: "#e6edf3", fontSize: "1rem", marginBottom: 16 }}>CSC — QR Code 2.0</h3>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16 }}>Obtenha o CSC no portal da SEFAZ-RJ. Obrigatório para o QR Code de consulta.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>CSC (Código de Segurança)</label>
              <input type="text" value={form.csc} onChange={(e) => setForm((f) => ({ ...f, csc: e.target.value }))} placeholder="Código de 32 caracteres" style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>Id CSC</label>
              <input type="number" min={1} value={form.idCsc} onChange={(e) => setForm((f) => ({ ...f, idCsc: Number(e.target.value) || 1 }))} style={inputStyle} className="campo-fundo-claro" />
            </div>
          </div>

          <h3 style={{ color: "#e6edf3", fontSize: "1rem", marginBottom: 16 }}>Endereço do estabelecimento</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Logradouro</label>
              <input type="text" value={form.endereco.xLgr} onChange={(e) => setForm((f) => ({ ...f, endereco: { ...f.endereco, xLgr: e.target.value } }))} style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>Número</label>
              <input type="text" value={form.endereco.nro} onChange={(e) => setForm((f) => ({ ...f, endereco: { ...f.endereco, nro: e.target.value } }))} style={inputStyle} className="campo-fundo-claro" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input type="text" value={form.endereco.xBairro} onChange={(e) => setForm((f) => ({ ...f, endereco: { ...f.endereco, xBairro: e.target.value } }))} style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>Código município (IBGE)</label>
              <input type="text" value={form.endereco.cMun} onChange={(e) => setForm((f) => ({ ...f, endereco: { ...f.endereco, cMun: e.target.value } }))} placeholder="Ex: 3304557" style={inputStyle} className="campo-fundo-claro" />
            </div>
            <div>
              <label style={labelStyle}>Município</label>
              <input type="text" value={form.endereco.xMun} onChange={(e) => setForm((f) => ({ ...f, endereco: { ...f.endereco, xMun: e.target.value } }))} style={inputStyle} className="campo-fundo-claro" />
            </div>
          </div>

          <button type="button" onClick={salvar} disabled={salvando} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #20b5a6, #25C19B)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer" }}>
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>

          <div style={{ marginTop: 24, padding: 16, background: "rgba(0,242,255,0.06)", borderRadius: 8, border: "1px solid rgba(0,242,255,0.2)" }}>
            <strong style={{ color: "#00F2FF" }}>Pré-requisitos</strong>
            <ul style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 8, paddingLeft: 20 }}>
              <li>Certificado digital A1 configurado em <strong>Certificado Digital</strong></li>
              <li>CSC obtido no portal da SEFAZ-RJ (NFC-e &gt; Código de Segurança)</li>
              <li>Empresa cadastrada na SEFAZ para emissão de NFC-e</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
