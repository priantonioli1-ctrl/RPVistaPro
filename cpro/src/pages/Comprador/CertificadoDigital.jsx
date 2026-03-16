// Certificado digital da empresa — configuração para integração SEFAZ/NF-e
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";

const API_URL = getApiUrl();
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function CertificadoDigital() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ senha: "", validade: "", arquivo: null });
  const fileInputRef = useRef(null);

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
    fetch(`${API_URL}/api/certificado-empresa/${empresaId}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ configurado: false }))
      .finally(() => setLoading(false));
  }, [usuario]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name || "").toLowerCase();
    if (!ext.endsWith(".pfx") && !ext.endsWith(".p12")) {
      Swal.fire("Atenção", "O certificado deve ser um arquivo .pfx ou .p12 (certificado A1).", "warning");
      return;
    }
    setForm((f) => ({ ...f, arquivo: file }));
    e.target.value = "";
  }

  async function salvar() {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    if (!form.arquivo) {
      Swal.fire("Atenção", "Selecione o arquivo do certificado (.pfx).", "warning");
      return;
    }
    if (!form.senha?.trim()) {
      Swal.fire("Atenção", "Informe a senha do certificado.", "warning");
      return;
    }

    setSalvando(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result || "").split(",")[1] || reader.result;
      if (!base64) {
        Swal.fire("Erro", "Não foi possível ler o arquivo.", "error");
        setSalvando(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/certificado-empresa/${empresaId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({
            certificadoBase64: base64,
            senha: form.senha,
            validadeAte: form.validade || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
        Swal.fire("Sucesso", "Certificado salvo com sucesso.", "success");
        setStatus({ configurado: true, tipo: "A1", validadeAte: form.validade || null });
        setForm({ senha: "", validade: "", arquivo: null });
        setMostrarForm(false);
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      } finally {
        setSalvando(false);
      }
    };
    reader.readAsDataURL(form.arquivo);
  }

  async function remover() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    const conf = await Swal.fire({
      title: "Remover certificado?",
      text: "Você precisará configurá-lo novamente para usar funções que exigem o certificado.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f85149",
      confirmButtonText: "Sim, remover",
    });
    if (!conf.isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/api/certificado-empresa/${empresaId}`, {
        method: "DELETE",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao remover.");
      Swal.fire("Removido", "Certificado removido.", "success");
      setStatus({ configurado: false });
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  if (!usuario) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div className="card-panel" style={{ padding: 24, border: BORDER }}>
          <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>
            Certificado digital da empresa
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
            O certificado digital (e-CNPJ ou e-NF-e A1) permite consultar e baixar XMLs de NF-e diretamente na SEFAZ, manifestar o destino da nota e outras operações. Configure aqui o certificado da sua empresa.
          </p>

          {loading ? (
            <p style={{ color: "#8b949e" }}>Carregando...</p>
          ) : (
            <>
              {status?.configurado ? (
                <div style={boxStatus}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={badgeOk}>Configurado</span>
                    <span style={{ color: "#8b949e" }}>
                      Tipo: {status.tipo || "A1"}
                      {status.validadeAte && ` · Válido até ${new Date(status.validadeAte).toLocaleDateString("pt-BR")}`}
                    </span>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                    <button type="button" onClick={() => setMostrarForm(true)} style={btnSecundario}>
                      Atualizar certificado
                    </button>
                    <button type="button" onClick={remover} style={btnRemover}>
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div style={boxStatus}>
                  <span style={badgeNao}>Não configurado</span>
                  <p style={{ color: "#8b949e", marginTop: 8 }}>
                    Configure o certificado para habilitar a consulta automática de NF-e na SEFAZ.
                  </p>
                  <button type="button" onClick={() => setMostrarForm(true)} style={btnUpload}>
                    Configurar certificado
                  </button>
                </div>
              )}

              {(mostrarForm || !status?.configurado) && (
                <div style={boxForm}>
                  <h3 style={{ margin: "0 0 16px", fontSize: "1.125rem" }}>Enviar certificado (.pfx ou .p12)</h3>
                  <input ref={fileInputRef} type="file" accept=".pfx,.p12" onChange={handleFileSelect} style={{ display: "none" }} />
                  <div style={{ marginBottom: 16 }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={btnSecundario}>
                      {form.arquivo ? form.arquivo.name : "Selecionar arquivo"}
                    </button>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.875rem" }}>
                      Senha do certificado
                    </label>
                    <input
                      type="password"
                      value={form.senha}
                      onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                      placeholder="Senha definida na emissão"
                      style={inputStyle}
                      className="campo-fundo-claro"
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 6, color: "#8b949e", fontSize: "0.875rem" }}>
                      Validade (opcional)
                    </label>
                    <input
                      type="date"
                      value={form.validade}
                      onChange={(e) => setForm((f) => ({ ...f, validade: e.target.value }))}
                      style={inputStyle}
                      className="campo-fundo-claro"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={salvar} style={btnUpload} disabled={salvando || !form.arquivo || !form.senha}>
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                    {status?.configurado && (
                      <button type="button" onClick={() => setMostrarForm(false)} style={btnSecundario}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div style={boxDoc}>
                <h4 style={{ margin: "0 0 12px", color: "#e6edf3" }}>O que você precisa</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#8b949e", fontSize: "0.9375rem", lineHeight: 1.8 }}>
                  <li><strong>Certificado A1</strong> — Arquivo .pfx ou .p12 (e-CNPJ ou e-NF-e válido)</li>
                  <li><strong>Senha</strong> — Definida no momento da aquisição do certificado</li>
                  <li><strong>Aquisição</strong> — Em uma autoridade certificadora (AC): Serasa, Certisign, Soluti, etc.</li>
                  <li><strong>Uso</strong> — Após configurado, o sistema poderá consultar NF-e na SEFAZ (em desenvolvimento)</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const boxStatus = {
  padding: 24,
  background: "rgba(0,0,0,0.2)",
  borderRadius: 8,
  border: BORDER,
  marginBottom: 24,
};

const badgeOk = {
  padding: "6px 14px",
  borderRadius: 4,
  background: "#25C19B",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const badgeNao = {
  padding: "6px 14px",
  borderRadius: 4,
  background: "rgba(139,148,158,0.3)",
  color: "#8b949e",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const btnUpload = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 16,
};

const btnSecundario = {
  padding: "10px 18px",
  borderRadius: 6,
  border: BORDER,
  background: "transparent",
  color: "#8b949e",
  fontWeight: 600,
  cursor: "pointer",
};

const btnRemover = {
  padding: "10px 18px",
  borderRadius: 6,
  border: "1px solid rgba(248,81,73,0.5)",
  background: "transparent",
  color: "#f85149",
  fontWeight: 600,
  cursor: "pointer",
};

const boxForm = {
  padding: 24,
  background: "rgba(0,0,0,0.15)",
  borderRadius: 8,
  border: BORDER,
  marginBottom: 24,
};

const inputStyle = {
  width: "100%",
  maxWidth: 320,
  padding: "10px 14px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
};

const boxDoc = {
  padding: 20,
  background: "rgba(0,242,255,0.05)",
  border: "1px solid rgba(0,242,255,0.2)",
  borderRadius: 8,
};
