// Página pública: funcionário acessa pelo link, faz autenticação facial e solicita itens
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import * as faceapi from "face-api.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

export default function RequisicaoPorLink() {
  const { token } = useParams();
  const [itensEstoque, setItensEstoque] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [empresaId, setEmpresaId] = useState(null);

  // Carregar modelos de reconhecimento facial
  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setLoadingModels(false);
      } catch (err) {
        console.error("Erro ao carregar modelos:", err);
        Swal.fire("Erro", "Não foi possível carregar o sistema de autenticação.", "error");
      }
    }
    loadModels();
  }, []);

  // Decodificar token e carregar estoque
  useEffect(() => {
    if (!token || loadingModels) return;

    try {
      const decoded = atob(token);
      setEmpresaId(decoded);
      
      fetch(`${API_URL}/api/requisicoes/estoque/${encodeURIComponent(token)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Link inválido ou estoque não encontrado.");
          return res.json();
        })
        .then((data) => {
          const lista = Array.isArray(data.itens) ? data.itens : [];
          setItensEstoque(lista);
          const iniciais = {};
          lista.forEach((p) => {
            iniciais[p.nome] = "";
          });
          setQuantidades(iniciais);
        })
        .catch((err) => {
          Swal.fire("Erro", err.message || "Não foi possível carregar os itens disponíveis.", "error");
        })
        .finally(() => setLoading(false));
    } catch (err) {
      Swal.fire("Erro", "Link inválido.", "error");
      setLoading(false);
    }
  }, [token, loadingModels]);

  async function iniciarCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      Swal.fire("Erro", "Não foi possível acessar a câmera.", "error");
    }
  }

  function pararCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function autenticarFuncionario() {
    if (!videoRef.current || !empresaId) {
      Swal.fire("Erro", "Câmera não inicializada ou empresa não identificada.", "error");
      return;
    }

    setAutenticando(true);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        Swal.fire("Erro", "Nenhum rosto detectado. Posicione-se melhor na frente da câmera.", "error");
        setAutenticando(false);
        return;
      }

      const embedding = Array.from(detection.descriptor);

      const res = await fetch(`${API_URL}/api/funcionarios-autorizados/autenticar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresaId, embedding }),
      });

      const data = await res.json();

      if (!data.autenticado) {
        Swal.fire("Não autorizado", "Rosto não reconhecido. Você precisa estar cadastrado como funcionário autorizado.", "error");
        setAutenticando(false);
        pararCamera();
        return;
      }

      setFuncionarioNome(data.funcionario?.nome || "Funcionário");
      setAutenticado(true);
      pararCamera();
      Swal.fire("Autenticado!", `Bem-vindo, ${data.funcionario?.nome || "Funcionário"}!`, "success");
    } catch (err) {
      console.error("Erro na autenticação:", err);
      Swal.fire("Erro", "Falha na autenticação. Tente novamente.", "error");
    } finally {
      setAutenticando(false);
    }
  }

  function handleQtd(nome, valor, maxDisponivel) {
    const v = String(valor).replace(/\D/g, "") || "";
    const num = v === "" ? "" : Math.min(Number(v), maxDisponivel);
    setQuantidades((prev) => ({ ...prev, [nome]: num === "" ? "" : String(num) }));
  }

  async function enviar() {
    if (!autenticado) {
      Swal.fire("Atenção", "Você precisa estar autenticado para enviar a requisição.", "warning");
      return;
    }

    const itens = itensEstoque
      .map((p) => {
        const qtd = Number(quantidades[p.nome]) || 0;
        return { nome: p.nome, unidade: p.unidade || "un", quantidade: qtd, disponivel: p.quantidade };
      })
      .filter((i) => i.quantidade > 0);

    if (itens.length === 0) {
      Swal.fire("Atenção", "Informe a quantidade de pelo menos um item.", "info");
      return;
    }

    const excede = itens.find((i) => i.quantidade > i.disponivel);
    if (excede) {
      Swal.fire(
        "Quantidade inválida",
        `"${excede.nome}": não é possível solicitar mais do que o disponível em estoque (${excede.disponivel} ${excede.unidade}).`,
        "warning"
      );
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/requisicoes/por-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          funcionarioNome,
          setorOrigem: "Requisição por link",
          itens,
        }),
      });
      if (!res.ok) throw new Error("Falha ao enviar requisição.");
      setEnviado(true);
      Swal.fire("Enviado!", "Sua requisição foi registrada com sucesso.", "success");
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível enviar a requisição.", "error");
    } finally {
      setEnviando(false);
    }
  }

  if (loading || loadingModels) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <p style={{ color: "#0F2D3F", textAlign: "center" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de autenticação
  if (!autenticado) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>🔐 Autenticação de Funcionário</h1>
          <p style={{ color: "#0F2D3F", marginBottom: 24, textAlign: "center" }}>
            Para solicitar produtos, você precisa se autenticar usando reconhecimento facial.
          </p>

          {!stream ? (
            <div style={{ textAlign: "center" }}>
              <button onClick={iniciarCamera} style={btnAuth}>
                📷 Iniciar Câmera
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 12,
                    border: "4px solid #25C19B",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={autenticarFuncionario}
                  disabled={autenticando}
                  style={{ ...btnAuth, background: "#25C19B" }}
                >
                  {autenticando ? "Autenticando..." : "✓ Confirmar e Autenticar"}
                </button>
                <button onClick={pararCamera} style={{ ...btnAuth, background: "#FF8882" }}>
                  ❌ Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>✅ Requisição enviada</h1>
          <p style={{ color: "#0F2D3F", marginTop: 12, textAlign: "center" }}>
            Sua requisição foi registrada com sucesso. O responsável pelo estoque receberá e poderá separar os itens.
          </p>
        </div>
      </div>
    );
  }

  if (!itensEstoque.length) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>Sem itens disponíveis</h1>
          <p style={{ color: "#0F2D3F", textAlign: "center" }}>
            Este link não está mais disponível ou não há itens em estoque no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={card}>
        <div style={{ marginBottom: 16, padding: 12, background: "#e8f5e9", borderRadius: 8 }}>
          <p style={{ margin: 0, color: "#2e7d32", fontWeight: 600 }}>
            ✓ Autenticado como: <strong>{funcionarioNome}</strong>
          </p>
        </div>

        <h1 style={title}>📦 Requisição de Produtos</h1>
        <p style={{ color: "#0F2D3F", marginBottom: 24, textAlign: "center" }}>
          Escolha a quantidade desejada de cada item. Só é possível solicitar até o que está disponível em estoque.
        </p>

        <div style={tabelaWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Produto</th>
                <th style={th}>Unidade</th>
                <th style={th}>Disponível</th>
                <th style={th}>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {itensEstoque.map((p) => {
                const maxQtd = Number(p.quantidade) || 0;
                const valorAtual = quantidades[p.nome] || "";
                return (
                  <tr key={p.nome}>
                    <td style={td}>{p.nome}</td>
                    <td style={td}>{p.unidade || "un"}</td>
                    <td style={td}>{maxQtd}</td>
                    <td style={td}>
                      <input
                        type="number"
                        min={0}
                        max={maxQtd}
                        value={valorAtual}
                        onChange={(e) => handleQtd(p.nome, e.target.value, maxQtd)}
                        placeholder="0"
                        style={inputNum}
                        className="campo-fundo-claro"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button type="button" onClick={enviar} disabled={enviando} style={btnEnviar}>
            {enviando ? "Enviando..." : "📤 Enviar Requisição"}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageWrap = {
  minHeight: "100vh",
  background: "#0F2D3F",
  padding: 24,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
};

const card = {
  maxWidth: 720,
  width: "100%",
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
};

const title = { color: "#0F2D3F", marginBottom: 8, fontSize: "1.5rem", textAlign: "center" };

const tabelaWrap = { overflowX: "auto" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { background: "#162232", color: "#fff", padding: 10, textAlign: "left" };
const td = { padding: 10, borderBottom: "1px solid #eee", color: "#333" };
const inputNum = {
  width: 80,
  padding: 8,
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  color: "#1a1a1a",
};

const btnEnviar = {
  background: "#25C19B",
  color: "#0B1C26",
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: "bold",
  cursor: "pointer",
};

const btnAuth = {
  background: "#2980b9",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: "bold",
  cursor: "pointer",
};
