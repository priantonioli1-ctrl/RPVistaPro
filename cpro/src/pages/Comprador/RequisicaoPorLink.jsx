// Página pública: funcionário acessa pelo link, opcionalmente autentica por rosto e solicita itens do catálogo (por categoria)
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import * as faceapi from "face-api.js";

// Em produção (rpvistapro.com.br) usar sempre a API no Render; evita link travar em "Carregando catálogo"
function getApiUrl() {
  const env = process.env.REACT_APP_API_URL;
  if (env && !env.includes("localhost")) return env;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://rpvistapro.onrender.com";
  }
  return env || "http://localhost:4001";
}
const API_URL = getApiUrl();

function chaveItem(nome, unidade) {
  return `${nome}::${unidade || "un"}`;
}

export default function RequisicaoPorLink() {
  const { token } = useParams();
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [quantidades, setQuantidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [nomeManual, setNomeManual] = useState("");
  const [usarNomeManual, setUsarNomeManual] = useState(false);
  const [setorOrigem, setSetorOrigem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [erroCarregar, setErroCarregar] = useState(null);

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
        setLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  // Carregar catálogo com estoque por token (categorias + itens com quantidade disponível)
  function carregarCatalogo() {
    if (!token) return;
    setLoading(true);
    setErroCarregar(null);
    let decoded;
    try {
      decoded = atob(token);
      setEmpresaId(decoded);
    } catch {
      setLoading(false);
      setErroCarregar("Link inválido.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (Render free pode demorar)

    fetch(`${getApiUrl()}/api/requisicoes/catalogo-com-estoque/${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Catálogo não encontrado." : "Não foi possível carregar o catálogo.");
        return res.json();
      })
      .then((data) => {
        const cats = Array.isArray(data.categorias) ? data.categorias : [];
        const lista = Array.isArray(data.itens) ? data.itens : [];
        setCategorias(cats);
        setItens(lista);
        setCategoriaSelecionada((prev) => (prev ? prev : cats[0] || ""));
        const iniciais = {};
        lista.forEach((p) => {
          iniciais[chaveItem(p.nome, p.unidade)] = "";
        });
        setQuantidades(iniciais);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          setErroCarregar("O servidor demorou para responder. Tente novamente.");
        } else {
          setErroCarregar(err.message || "Não foi possível carregar o catálogo. Verifique sua conexão.");
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }

  useEffect(() => {
    carregarCatalogo();
  }, [token]);

  const itensDaCategoria = itens.filter((i) => (i.secao || "Sem seção") === categoriaSelecionada);

  async function iniciarCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      Swal.fire("Erro", "Não foi possível acessar a câmera.", "error");
    }
  }

  function pararCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
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
        Swal.fire("Erro", "Nenhum rosto detectado. Posicione-se na frente da câmera.", "error");
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
        Swal.fire("Não autorizado", "Rosto não reconhecido. Cadastre-se como funcionário autorizado.", "error");
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

  function confirmarNomeManual() {
    const nome = (nomeManual || "").trim();
    if (!nome) {
      Swal.fire("Atenção", "Informe seu nome para continuar.", "warning");
      return;
    }
    setFuncionarioNome(nome);
    setAutenticado(true);
  }

  function handleQtd(chave, valor, maxDisponivel) {
    const v = String(valor).replace(/\D/g, "") || "";
    const num = v === "" ? "" : Math.min(Number(v), maxDisponivel);
    setQuantidades((prev) => ({ ...prev, [chave]: num === "" ? "" : String(num) }));
  }

  async function enviar() {
    const nomeSolicitante = funcionarioNome || (nomeManual || "").trim();
    if (!nomeSolicitante) {
      Swal.fire("Atenção", "Você precisa estar autenticado ou informar seu nome para enviar.", "warning");
      return;
    }

    const itensEnvio = itens
      .map((p) => {
        const chave = chaveItem(p.nome, p.unidade);
        const qtd = Number(quantidades[chave]) || 0;
        return {
          nome: p.nome,
          unidade: p.unidade || "un",
          quantidade: qtd,
          disponivel: p.quantidadeDisponivel ?? 0,
        };
      })
      .filter((i) => i.quantidade > 0);

    if (itensEnvio.length === 0) {
      Swal.fire("Atenção", "Informe a quantidade de pelo menos um item.", "info");
      return;
    }

    const excede = itensEnvio.find((i) => i.quantidade > i.disponivel);
    if (excede) {
      Swal.fire(
        "Quantidade inválida",
        `"${excede.nome}": não é possível solicitar mais do que o disponível (${excede.disponivel} ${excede.unidade}).`,
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
          funcionarioNome: nomeSolicitante,
          setorOrigem: setorOrigem.trim() || "Requisição por link",
          observacoes: observacoes.trim(),
          itens: itensEnvio.map(({ nome, unidade, quantidade }) => ({ nome, unidade, quantidade })),
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

  if (loading && !erroCarregar) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <p style={{ color: "#0F2D3F", textAlign: "center" }}>Carregando catálogo...</p>
          <p style={{ color: "#666", textAlign: "center", fontSize: "0.875rem", marginTop: 8 }}>
            Na primeira vez pode levar alguns segundos.
          </p>
        </div>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>Não foi possível carregar</h1>
          <p style={{ color: "#0F2D3F", textAlign: "center", marginBottom: 20 }}>
            {erroCarregar}
          </p>
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={carregarCatalogo} style={btnAuth}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!itens.length) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>Sem itens no catálogo</h1>
          <p style={{ color: "#0F2D3F", textAlign: "center" }}>
            Este link não está disponível ou o catálogo ainda não possui itens cadastrados.
          </p>
        </div>
      </div>
    );
  }

  // Tela de identificação: facial ou nome manual
  if (!autenticado) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <h1 style={title}>🔐 Identificação</h1>
          <p style={{ color: "#0F2D3F", marginBottom: 24, textAlign: "center" }}>
            Para solicitar produtos, identifique-se por reconhecimento facial ou informe seu nome abaixo.
          </p>

          {!usarNomeManual ? (
            <>
              {!stream ? (
                <div style={{ textAlign: "center" }}>
                  <button onClick={iniciarCamera} style={btnAuth} disabled={loadingModels}>
                    {loadingModels ? "Carregando..." : "📷 Identificar por reconhecimento facial"}
                  </button>
                  <p style={{ marginTop: 16, color: "#666", fontSize: "0.9rem" }}>
                    ou
                  </p>
                  <button
                    type="button"
                    onClick={() => setUsarNomeManual(true)}
                    style={{ ...btnAuth, background: "#6c757d", marginTop: 8 }}
                  >
                    Informar meu nome
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: "100%", maxWidth: 400, borderRadius: 4, border: "4px solid #20b5a6" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={autenticarFuncionario}
                      disabled={autenticando}
                      style={{ ...btnAuth, background: "var(--gradient-btn-primary)" }}
                    >
                      {autenticando ? "Autenticando..." : "✓ Confirmar"}
                    </button>
                    <button onClick={pararCamera} style={{ ...btnAuth, background: "#FF8882" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ color: "#0F2D3F", fontWeight: 600 }}>Seu nome</label>
              <input
                type="text"
                value={nomeManual}
                onChange={(e) => setNomeManual(e.target.value)}
                placeholder="Ex.: Maria Silva"
                style={inputText}
                className="campo-fundo-claro"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={confirmarNomeManual} style={{ ...btnAuth, background: "var(--gradient-btn-primary)" }}>
                  Continuar
                </button>
                <button onClick={() => setUsarNomeManual(false)} style={{ ...btnAuth, background: "#6c757d" }}>
                  Voltar
                </button>
              </div>
            </div>
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
            Sua requisição foi registrada. O responsável pelo estoque poderá separar os itens.
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
            ✓ Solicitante: <strong>{funcionarioNome}</strong>
          </p>
        </div>

        <h1 style={title}>📦 Requisição de Produtos</h1>
        <p style={{ color: "#0F2D3F", marginBottom: 16, textAlign: "center" }}>
          Escolha a categoria e a quantidade de cada item. Só é possível solicitar até o disponível em estoque.
        </p>

        {categorias.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#0F2D3F", fontWeight: 600, display: "block", marginBottom: 8 }}>
              Categoria do produto
            </label>
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              style={select}
              className="campo-fundo-claro"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#666", fontSize: "0.875rem" }}>Setor (opcional)</label>
          <input
            type="text"
            value={setorOrigem}
            onChange={(e) => setSetorOrigem(e.target.value)}
            placeholder="Ex.: Cozinha, Bar..."
            style={{ ...inputText, marginTop: 4 }}
            className="campo-fundo-claro"
          />
        </div>

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
              {itensDaCategoria.map((p) => {
                const chave = chaveItem(p.nome, p.unidade);
                const maxQtd = Number(p.quantidadeDisponivel) || 0;
                const valorAtual = quantidades[chave] || "";
                return (
                  <tr key={chave}>
                    <td style={td}>{p.nome}{p.marca ? ` — ${p.marca}` : ""}</td>
                    <td style={td}>{p.unidade || "un"}</td>
                    <td style={td}>{maxQtd}</td>
                    <td style={td}>
                      <input
                        type="number"
                        min={0}
                        max={maxQtd}
                        value={valorAtual}
                        onChange={(e) => handleQtd(chave, e.target.value, maxQtd)}
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

        {itensDaCategoria.length === 0 && categoriaSelecionada && (
          <p style={{ color: "#666", textAlign: "center", marginTop: 12 }}>
            Nenhum item nesta categoria no momento.
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={{ color: "#666", fontSize: "0.875rem" }}>Observações (opcional)</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: Urgente para evento às 18h"
            rows={2}
            style={{ ...inputText, marginTop: 4, resize: "vertical" }}
            className="campo-fundo-claro"
          />
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
  background: "transparent",
  borderRadius: 4,
  padding: 24,
};

const title = { color: "#0F2D3F", marginBottom: 8, fontSize: "1.5rem", textAlign: "center" };

const select = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#e6edf3",
  fontSize: "1rem",
};

const inputText = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#e6edf3",
  fontSize: "1rem",
  boxSizing: "border-box",
};

const tabelaWrap = { overflowX: "auto" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { background: "#162232", color: "#fff", padding: 10, textAlign: "left" };
const td = { padding: 10, borderBottom: "1px solid #eee", color: "#333" };
const inputNum = {
  width: 80,
  padding: 8,
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#e6edf3",
};

const btnEnviar = {
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  border: "none",
  borderRadius: 4,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: "bold",
  cursor: "pointer",
};

const btnAuth = {
  background: "var(--gradient-btn-orange)",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "12px 24px",
  fontSize: "1rem",
  fontWeight: "bold",
  cursor: "pointer",
};
