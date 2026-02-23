// PontoBatida.jsx — Registrador eletrônico de ponto (bater ponto)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const TIPOS = [
  { id: "entrada", label: "Entrada", cor: "#25C19B" },
  { id: "intervalo-inicio", label: "Início intervalo", cor: "#f0ad4e" },
  { id: "intervalo-fim", label: "Fim intervalo", cor: "#5bc0de" },
  { id: "saida", label: "Saída", cor: "#d9534f" },
];

export default function PontoBatida() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [identificador, setIdentificador] = useState("");
  const [modo, setModo] = useState("manual"); // manual | facial
  const [loadingModels, setLoadingModels] = useState(true);
  const [stream, setStream] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!u) {
      navigate("/");
      return;
    }
    setUsuarioAtual(u);
    const emp = u?.compradorId || (u?.tipo === "comprador" ? u?._id : null);
    setEmpresaId(emp);
  }, [navigate]);

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ])
      .then(() => setLoadingModels(false))
      .catch(() => setLoadingModels(false));
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  async function baterPonto(tipo) {
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    let ident = identificador?.trim();
    if (modo === "facial" && ident) {
      // ident pode ser o ID retornado pela autenticação facial
    } else if (!ident) {
      Swal.fire("Atenção", "Informe CPF ou matrícula.", "warning");
      return;
    }

    setBuscando(true);
    try {
      const res = await fetch(`${API_URL}/api/ponto/bater`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresaId,
          identificador: ident,
          tipo,
          metodo: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao registrar.");
      setUltimoRegistro({
        tipo,
        dataHora: data.registro?.dataHora || new Date(),
        nome: data.registro?.funcionario?.nome,
      });
      Swal.fire({
        icon: "success",
        title: "Ponto registrado",
        text: `${TIPOS.find((t) => t.id === tipo)?.label || tipo} — ${data.registro?.funcionario?.nome || ""}`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setBuscando(false);
    }
  }

  async function autenticarFacial() {
    if (!videoRef.current || !stream) return;
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      Swal.fire("Aviso", "Nenhum rosto detectado. Posicione-se na câmera.", "warning");
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`${API_URL}/api/funcionarios-autorizados/autenticar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresaId,
          embedding: Array.from(detection.descriptor),
        }),
      });
      const data = await res.json();
      if (!data.autenticado) {
        Swal.fire("Não reconhecido", "Rosto não cadastrado ou não reconhecido.", "warning");
        return;
      }
      setIdentificador(data.funcionario.id);
      Swal.fire("Sucesso", `Olá, ${data.funcionario.nome}! Agora escolha o tipo de batida.`, "success");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setBuscando(false);
    }
  }

  function iniciarCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => setStream(s))
      .catch(() => Swal.fire("Erro", "Não foi possível acessar a câmera.", "error"));
  }

  function pararCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  if (!usuarioAtual || !empresaId) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px", maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem", textAlign: "center" }}>Registrador de Ponto</h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem", textAlign: "center" }}>
          Identifique-se por CPF, matrícula ou reconhecimento facial e registre sua batida.
        </p>

        {/* Modo de identificação */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setModo("manual")}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: modo === "manual" ? "2px solid #00F2FF" : BORDER,
              background: modo === "manual" ? "rgba(0,242,255,0.1)" : "transparent",
              color: "#e6edf3",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            CPF / Matrícula
          </button>
          <button
            type="button"
            onClick={() => setModo("facial")}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: modo === "manual" ? BORDER : "2px solid #00F2FF",
              background: modo === "manual" ? "transparent" : "rgba(0,242,255,0.1)",
              color: "#e6edf3",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reconhecimento facial
          </button>
        </div>

        {modo === "manual" && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, color: "#8b949e", fontSize: "0.875rem" }}>CPF ou matrícula</label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Digite CPF ou matrícula"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 8,
                border: BORDER,
                background: "rgba(0,0,0,0.2)",
                color: "#e6edf3",
                fontSize: "1.125rem",
                textAlign: "center",
              }}
              className="campo-fundo-claro"
              autoFocus
            />
          </div>
        )}

        {modo === "facial" && (
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            {!stream && !identificador ? (
              <button
                type="button"
                onClick={iniciarCamera}
                disabled={loadingModels}
                style={{
                  padding: "14px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gradient-btn-primary)",
                  color: "#0B1C26",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {loadingModels ? "Carregando..." : "Iniciar câmera"}
              </button>
            ) : stream && !identificador ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "2px solid rgba(32,181,166,0.5)" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    onClick={autenticarFacial}
                    disabled={buscando}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--gradient-btn-primary)",
                      color: "#0B1C26",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {buscando ? "Verificando..." : "Identificar"}
                  </button>
                  <button type="button" onClick={pararCamera} style={{ padding: "12px 24px", borderRadius: 8, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: "#25C19B", fontWeight: 600 }}>Identificado. Selecione o tipo de batida abaixo.</p>
            )}
          </div>
        )}

        {/* Botões de batida */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginTop: 32 }}>
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => baterPonto(t.id)}
              disabled={buscando || (modo === "facial" && !identificador)}
              style={{
                padding: "24px 20px",
                borderRadius: 12,
                border: "none",
                background: t.cor,
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.125rem",
                cursor: buscando ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {ultimoRegistro && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 8,
              background: "rgba(37,193,155,0.15)",
              border: "1px solid rgba(37,193,155,0.4)",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#8b949e", fontSize: "0.8125rem" }}>Último registro</div>
            <div style={{ color: "#25C19B", fontWeight: 600, fontSize: "1rem" }}>
              {TIPOS.find((t) => t.id === ultimoRegistro.tipo)?.label} — {ultimoRegistro.nome || "—"} às {new Date(ultimoRegistro.dataHora).toLocaleTimeString("pt-BR")}
            </div>
          </div>
        )}

        <p style={{ marginTop: 24, color: "#8b949e", fontSize: "0.8125rem", textAlign: "center" }}>
          Sistema pronto para integração com registrador físico (hardware). Use a API /api/ponto/bater com dispositivoId.
        </p>
      </main>
    </div>
  );
}
