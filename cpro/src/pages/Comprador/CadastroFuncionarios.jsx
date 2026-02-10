import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

export default function CadastroFuncionarios() {
  const [nome, setNome] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setLoadingModels(false);
    }
    loadModels();
  }, []);

  async function iniciarCamera() {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    setStream(mediaStream);
    videoRef.current.srcObject = mediaStream;
  }

  function pararCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  async function capturarFoto() {
    if (!videoRef.current) return;

    const detection = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      Swal.fire("Erro", "Nenhum rosto detectado.", "error");
      return;
    }

    const embedding = Array.from(detection.descriptor);

    const resp = await fetch(`${API_URL}/api/funcionarios-autorizados/cadastrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, embedding }),
    });

    const data = await resp.json();

    if (data.error) {
      Swal.fire("Erro", data.error, "error");
      return;
    }

    Swal.fire("Sucesso", "Funcionário cadastrado!", "success");
    pararCamera();
    setNome("");
  }

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ padding: 24, display: "flex", justifyContent: "center", minHeight: "60px" }}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          {loadingModels ? (
            <div style={{ 
              background: CARD_BG, 
              border: BORDER, 
              borderRadius: 12, 
              padding: 40, 
              textAlign: "center",
              color: "#8b949e"
            }}>
              <p>Carregando modelos...</p>
            </div>
          ) : (
            <div style={{
              background: CARD_BG,
              border: BORDER,
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              color: "#e6edf3"
            }}>
              <label style={{ display: "block", marginBottom: 12, fontSize: "1rem", fontWeight: 600, color: "#e6edf3" }}>
                Nome do Funcionário
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 20,
                  padding: "12px",
                  borderRadius: 8,
                  border: BORDER,
                  background: "#fff",
                  color: "#1a1a1a",
                  fontSize: "0.9375rem"
                }}
                className="campo-fundo-claro"
                placeholder="Digite o nome"
              />

              <button
                onClick={iniciarCamera}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#25C19B",
                  color: "#0B1C26",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 16,
                  fontSize: "0.9375rem"
                }}
              >
                📷 Iniciar Câmera
              </button>

              {stream && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      margin: "16px 0",
                      borderRadius: 12,
                      border: "4px solid #25C19B"
                    }}
                  />

                  <button
                    onClick={capturarFoto}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#25C19B",
                      color: "#0B1C26",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      marginBottom: 16,
                      fontSize: "0.9375rem"
                    }}
                  >
                    📸 Capturar Foto & Cadastrar
                  </button>

                  <button
                    onClick={pararCamera}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#FF8882",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9375rem"
                    }}
                  >
                    ❌ Desligar Câmera
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}