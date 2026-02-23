import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const styles = {
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  inputBusca: {
    flex: 2,
    minWidth: 200,
    padding: "10px 12px",
    borderRadius: 4,
    border: BORDER,
    background: "rgba(0,0,0,0.2)",
    color: "#e6edf3",
    fontSize: "1rem",
  },
  formCard: {
    padding: "20px 0 24px",
    marginBottom: 24,
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "16px 20px",
    marginBottom: 16,
    alignItems: "end",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 4,
    border: BORDER,
    background: "transparent",
    color: "#e6edf3",
    fontSize: "0.9375rem",
  },
  btnPrincipal: {
    background: "var(--gradient-btn-primary)",
    color: "#0B1C26",
    border: "none",
    borderRadius: 4,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1rem",
  },
  btnSecundario: {
    background: "rgba(255,255,255,0.12)",
    color: "#e6edf3",
    border: BORDER,
    borderRadius: 4,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9375rem",
  },
  btnExcluir: {
    background: "transparent",
    color: "#f85149",
    border: "1px solid rgba(248,81,73,0.5)",
    borderRadius: 4,
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  btnRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: "0.8125rem",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    display: "block",
    marginBottom: 6,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  cardRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 20px",
    padding: "16px 20px",
    borderBottom: BORDER,
  },
  cardItem: {
    minWidth: 120,
  },
  empty: {
    color: "#8b949e",
    fontStyle: "italic",
    fontSize: "1rem",
    textAlign: "center",
    marginTop: 24,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#e6edf3",
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    borderBottom: BORDER,
    color: "#8b949e",
    fontWeight: 600,
    fontSize: "0.8125rem",
    textTransform: "uppercase",
  },
  td: {
    padding: "12px",
    borderBottom: BORDER,
    verticalAlign: "middle",
  },
};

export default function CadastroFuncionarios() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [anexos, setAnexos] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [stream, setStream] = useState(null);
  const [embeddingFacial, setEmbeddingFacial] = useState(null);
  const videoRef = useRef(null);
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    cargo: "",
    departamento: "",
    dataAdmissao: "",
    salario: "",
    matricula: "",
  });

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
    const MODEL_URL = "/models";
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => setLoadingModels(false))
      .catch(() => setLoadingModels(false));
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    fetch(`${API_URL}/api/funcionarios-autorizados?empresa=${encodeURIComponent(empresaId)}`)
      .then((r) => r.json())
      .then((lista) => setFuncionarios(Array.isArray(lista) ? lista : []))
      .catch(() => setFuncionarios([]))
      .finally(() => setLoading(false));
  }, [empresaId]);

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleAnexar(e) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadando(true);
    try {
      const novos = [...anexos];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          novos.push({ nome: data.nome || files[i].name, url: data.url, tipo: "outro" });
        }
      }
      setAnexos(novos);
    } catch (err) {
      Swal.fire("Erro", "Falha ao enviar arquivo. Tente novamente.", "error");
    } finally {
      setUploadando(false);
      e.target.value = "";
    }
  }

  function removerAnexo(index) {
    setAnexos((prev) => prev.filter((_, i) => i !== index));
  }

  async function iniciarCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
    } catch (err) {
      Swal.fire("Erro", "Não foi possível acessar a câmera.", "error");
    }
  }

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  function pararCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function capturarRosto() {
    if (!videoRef.current) return;
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      Swal.fire("Aviso", "Nenhum rosto detectado. Posicione o rosto na câmera.", "warning");
      return;
    }
    setEmbeddingFacial(Array.from(detection.descriptor));
    Swal.fire("Sucesso", "Rosto capturado para reconhecimento facial.", "success");
  }

  function limparForm() {
    setForm({
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      cargo: "",
      departamento: "",
      dataAdmissao: "",
      salario: "",
      matricula: "",
    });
    setAnexos([]);
    setEmbeddingFacial(null);
    pararCamera();
  }

  async function adicionarFuncionario() {
    if (!form.nome?.trim()) {
      Swal.fire("Aviso", "Informe o nome do funcionário.", "warning");
      return;
    }
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/api/funcionarios-autorizados/cadastrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresaId,
          nome: form.nome.trim(),
          cpf: form.cpf.trim() || undefined,
          email: form.email.trim() || undefined,
          telefone: form.telefone.trim() || undefined,
          cargo: form.cargo.trim() || undefined,
          departamento: form.departamento.trim() || undefined,
          dataAdmissao: form.dataAdmissao || undefined,
          anexos,
          embedding: embeddingFacial && embeddingFacial.length ? embeddingFacial : undefined,
          salario: form.salario ? Number(form.salario) : null,
          matricula: form.matricula?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      Swal.fire("Sucesso", "Funcionário cadastrado.", "success");
      limparForm();
      const listRes = await fetch(`${API_URL}/api/funcionarios-autorizados?empresa=${encodeURIComponent(empresaId)}`);
      const lista = await listRes.json();
      if (Array.isArray(lista)) setFuncionarios(lista);
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível cadastrar.", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirFuncionario(id) {
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
        setFuncionarios((prev) => prev.filter((f) => f._id !== id));
        Swal.fire("Sucesso", "Funcionário removido.", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir");
      }
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível excluir.", "error");
    }
  }

  const filtrados = funcionarios.filter(
    (f) =>
      !filtro ||
      (f.nome || "").toLowerCase().includes(filtro.toLowerCase()) ||
      (f.cpf || "").replace(/\D/g, "").includes(filtro.replace(/\D/g, "")) ||
      (f.email || "").toLowerCase().includes(filtro.toLowerCase()) ||
      (f.cargo || "").toLowerCase().includes(filtro.toLowerCase())
  );

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <div style={styles.actions}>
        <input
          placeholder="Buscar funcionário (nome, CPF, email, cargo)..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={styles.inputBusca}
        />
        <button type="button" onClick={() => navigate("/relatorios-funcionarios")} style={styles.btnPrincipal}>
          Gerar relatório
        </button>
      </div>

      {/* Bloco: Adicionar novo funcionário */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
          Adicionar novo funcionário
        </h2>
        <div style={styles.formCard}>
          <div style={styles.formRow}>
            <div style={{ ...styles.formField, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Nome completo</label>
              <input
                placeholder="Nome"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>CPF</label>
              <input
                placeholder="CPF"
                value={form.cpf}
                onChange={(e) => handleChange("cpf", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Telefone</label>
              <input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formField}>
              <label style={styles.label}>Cargo</label>
              <input
                placeholder="Cargo"
                value={form.cargo}
                onChange={(e) => handleChange("cargo", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Departamento</label>
              <input
                placeholder="Departamento"
                value={form.departamento}
                onChange={(e) => handleChange("departamento", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Data admissão</label>
              <input
                type="date"
                value={form.dataAdmissao}
                onChange={(e) => handleChange("dataAdmissao", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Salário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.salario}
                onChange={(e) => handleChange("salario", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Matrícula</label>
              <input
                placeholder="Matrícula (para ponto)"
                value={form.matricula}
                onChange={(e) => handleChange("matricula", e.target.value)}
                style={styles.input}
                className="campo-fundo-claro"
              />
            </div>
          </div>
          <div style={{ ...styles.btnRow, marginTop: 16, marginBottom: 16, justifyContent: "space-between" }}>
            <div style={styles.btnRow}>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls"
                onChange={handleAnexar}
                style={{ display: "none" }}
                id="anexar-func"
              />
              <button
                type="button"
                onClick={() => document.getElementById("anexar-func").click()}
                disabled={uploadando}
                style={styles.btnSecundario}
              >
                {uploadando ? "Enviando..." : "Escolher arquivos"}
              </button>
              {anexos.length > 0 && (
                <span style={{ fontSize: "0.875rem", color: "#8b949e" }}>
                  {anexos.length} arquivo(s) selecionado(s)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={adicionarFuncionario}
              disabled={salvando}
              style={styles.btnPrincipal}
            >
              {salvando ? "Salvando..." : "Adicionar funcionário"}
            </button>
          </div>
        </div>

        {/* Reconhecimento facial (opcional) */}
        <div style={{ marginTop: 24, padding: 24, border: BORDER, borderRadius: 4, background: "rgba(0,0,0,0.15)", maxWidth: 480 }}>
          <h3 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1rem", fontWeight: 600 }}>
            Reconhecimento facial (opcional)
          </h3>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", marginBottom: 16, lineHeight: 1.4 }}>
            Capture o rosto do funcionário para permitir autenticação por reconhecimento facial depois.
          </p>
          {loadingModels ? (
            <p style={{ color: "#8b949e", fontSize: "0.875rem" }}>Carregando modelos de detecção...</p>
          ) : (
            <>
              {!stream && !embeddingFacial && (
                <button type="button" onClick={iniciarCamera} style={styles.btnSecundario}>
                  Iniciar câmera
                </button>
              )}
              {stream && !embeddingFacial && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      maxWidth: 320,
                      borderRadius: 4,
                      border: "2px solid rgba(32,181,166,0.5)",
                    }}
                  />
                  <div style={styles.btnRow}>
                    <button type="button" onClick={capturarRosto} style={styles.btnPrincipal}>
                      Capturar rosto
                    </button>
                    <button type="button" onClick={pararCamera} style={styles.btnExcluir}>
                      Desligar câmera
                    </button>
                  </div>
                </div>
              )}
              {embeddingFacial && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <span style={{ color: "#25C19B", fontWeight: 600, fontSize: "0.9375rem" }}>
                    Rosto capturado — será usado no cadastro ao clicar em &quot;Adicionar funcionário&quot;
                  </span>
                  <div style={styles.btnRow}>
                    <button
                      type="button"
                      onClick={() => { setEmbeddingFacial(null); pararCamera(); }}
                      style={styles.btnSecundario}
                    >
                      Descartar e capturar de novo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {anexos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {anexos.map((a, i) => (
              <span
                key={i}
                style={{
                  fontSize: "0.8125rem",
                  color: "#8b949e",
                  background: "rgba(255,255,255,0.06)",
                  padding: "6px 12px",
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {a.nome}
                <button type="button" onClick={() => removerAnexo(i)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", padding: 0, fontSize: "1rem" }} title="Remover">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lista simplificada: nome e situação — clique abre ficha completa */}
      <h2 style={{ marginBottom: 12, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
        Funcionários
      </h2>
      {loading ? (
        <p style={styles.empty}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p style={styles.empty}>Nenhum funcionário cadastrado. Use o formulário acima para adicionar.</p>
      ) : (
        <div style={{ border: BORDER, borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderBottom: BORDER, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase" }}>
            <span style={{ flex: 1 }}>Nome</span>
            <span style={{ width: 100 }}>Situação</span>
          </div>
          {filtrados.map((f, idx) => (
            <div
              key={f._id}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/ficha-funcionario/" + f._id)}
              onKeyDown={(e) => e.key === "Enter" && navigate("/ficha-funcionario/" + f._id)}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: idx < filtrados.length - 1 ? BORDER : "none",
                cursor: "pointer",
                background: "transparent",
                transition: "background 0.15s",
              }}
            >
              <span style={{ flex: 1, color: "#e6edf3", fontWeight: 500 }}>{f.nome || "—"}</span>
              <span style={{ width: 100, color: (f.situacao || "ativo") === "ativo" ? "#25C19B" : "#f85149", fontWeight: 600 }}>
                {(f.situacao || "ativo") === "ativo" ? "Ativo" : "Desligado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
