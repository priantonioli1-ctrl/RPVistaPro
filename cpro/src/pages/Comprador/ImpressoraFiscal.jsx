// ImpressoraFiscal.jsx — Cadastro da impressora fiscal para emissão de cupom na venda
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";

const API_URL = getApiUrl();
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function ImpressoraFiscal() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    ativo: true,
    modelo: "",
    tipo: "agente_local",
    urlAgente: "http://localhost:9999",
    porta: "",
    ip: "",
    nomeFantasia: "",
    cnpj: "",
    endereco: "",
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
    setLoading(true);
    fetch(`${API_URL}/api/impressora-fiscal?empresa=${encodeURIComponent(empresaId)}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setForm({
          ativo: !!data.ativo,
          modelo: data.modelo || "",
          tipo: data.tipo || "agente_local",
          urlAgente: data.urlAgente || "http://localhost:9999",
          porta: data.porta || "",
          ip: data.ip || "",
          nomeFantasia: data.nomeFantasia || "",
          cnpj: data.cnpj || "",
          endereco: data.endereco || "",
        });
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

    if (form.ativo && form.tipo === "agente_local" && !form.urlAgente?.trim()) {
      Swal.fire("Atenção", "Informe a URL do agente de impressão.", "warning");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/impressora-fiscal`, {
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
      Swal.fire("Sucesso", "Configuração da impressora fiscal salva.", "success");
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
      <h2 style={{ color: "#e6edf3", fontSize: "1.5rem", marginBottom: 8 }}>Impressora Fiscal</h2>
      <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
        Configure a impressora para que as vendas do PDV sejam impressas automaticamente como cupom fiscal.
      </p>

      {loading ? (
        <p style={{ color: "#8b949e" }}>Carregando...</p>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", border: BORDER, borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ color: "#e6edf3", fontWeight: 600 }}>Ativar impressão fiscal nas vendas</span>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Tipo de impressão</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              style={inputStyle}
              className="campo-fundo-claro"
            >
              <option value="agente_local">Agente local (recomendado)</option>
              <option value="ecf">ECF (impressora fiscal serial/USB)</option>
              <option value="termica">Térmica não fiscal</option>
              <option value="nfce_api">NFC-e via API (SEFAZ)</option>
            </select>
            <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 6 }}>
              {form.tipo === "agente_local" &&
                "Rode o agente local no computador da impressora. Ele recebe os dados e imprime."}
              {form.tipo === "ecf" &&
                "Impressora fiscal Daruma/Bematech conectada via serial ou USB. Requer agente local."}
              {form.tipo === "termica" && "Impressora térmica comum para cupom não fiscal."}
              {form.tipo === "nfce_api" && "Integração futura com API de emissão NFC-e."}
            </p>
          </div>

          {form.tipo === "agente_local" && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>URL do agente de impressão</label>
              <input
                type="url"
                value={form.urlAgente}
                onChange={(e) => setForm((f) => ({ ...f, urlAgente: e.target.value }))}
                placeholder="http://localhost:9999"
                style={inputStyle}
                className="campo-fundo-claro"
              />
              <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 6 }}>
                O agente deve estar rodando no mesmo computador onde o PDV é usado. Veja a pasta{" "}
                <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>
                  agente-impressao/
                </code>{" "}
                no projeto.
              </p>
            </div>
          )}

          {(form.tipo === "ecf" || form.tipo === "termica") && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Modelo da impressora</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  placeholder="Ex: Daruma FS700, Bematech MP-4200"
                  style={inputStyle}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Porta (serial/USB)</label>
                  <input
                    type="text"
                    value={form.porta}
                    onChange={(e) => setForm((f) => ({ ...f, porta: e.target.value }))}
                    placeholder="COM1, /dev/ttyUSB0"
                    style={inputStyle}
                    className="campo-fundo-claro"
                  />
                </div>
                <div>
                  <label style={labelStyle}>IP (se rede)</label>
                  <input
                    type="text"
                    value={form.ip}
                    onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                    placeholder="192.168.1.100"
                    style={inputStyle}
                    className="campo-fundo-claro"
                  />
                </div>
              </div>
            </>
          )}

          <hr style={{ border: "none", borderTop: BORDER, margin: "24px 0" }} />

          <h3 style={{ color: "#e6edf3", fontSize: "1rem", marginBottom: 16 }}>Dados do estabelecimento (cabeçalho do cupom)</h3>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nome fantasia</label>
            <input
              type="text"
              value={form.nomeFantasia}
              onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))}
              placeholder="Nome da loja"
              style={inputStyle}
              className="campo-fundo-claro"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                style={inputStyle}
                className="campo-fundo-claro"
              />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              placeholder="Rua, número, bairro, cidade"
              style={inputStyle}
              className="campo-fundo-claro"
            />
          </div>

          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #20b5a6, #25C19B)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: salvando ? "not-allowed" : "pointer",
            }}
          >
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>

          <div style={{ marginTop: 24, padding: 16, background: "rgba(0,242,255,0.06)", borderRadius: 8, border: "1px solid rgba(0,242,255,0.2)" }}>
            <strong style={{ color: "#00F2FF" }}>Como funciona</strong>
            <p style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 8 }}>
              Ao finalizar uma venda no PDV, os dados são enviados para o agente de impressão local. O agente imprime
              o cupom na impressora configurada. Para impressoras fiscais ECF, é necessário instalar os drivers
              do fabricante (Daruma, Bematech, etc.) e configurar o agente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
