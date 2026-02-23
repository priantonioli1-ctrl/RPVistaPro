// src/pages/Comprador/SaidaMercadorias.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

function chaveItem(nome, unidade) {
  return `${nome}::${unidade || "un"}`;
}

export default function SaidaMercadorias() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [requisicoes, setRequisicoes] = useState([]);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const navigate = useNavigate();

  // Catálogo para confecção de requisição direto na página
  const [catalogComEstoque, setCatalogComEstoque] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [quantidadesRequisicao, setQuantidadesRequisicao] = useState({});
  const [solicitante, setSolicitante] = useState("");
  const [setorRequisicao, setSetorRequisicao] = useState("");
  const [observacoesRequisicao, setObservacoesRequisicao] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [enviandoRequisicao, setEnviandoRequisicao] = useState(false);

  useEffect(() => {
    const usuario = sessionStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }

    const dados = JSON.parse(usuario);
    setUsuarioAtual(dados);
    carregarRequisicoes(dados);
  }, [navigate]);

  useEffect(() => {
    if (!usuarioAtual) return;
    const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) return;

    setLoadingCatalog(true);
    Promise.all([
      fetch(`${API_URL}/api/catalogos/${empresaId}`).then((r) => r.json()),
      fetch(`${API_URL}/api/estoque/${empresaId}`).then((r) => r.json()),
    ])
      .then(([dataCat, itensEstoque]) => {
        const listaCat = Array.isArray(dataCat?.catalogo) ? dataCat.catalogo : [];
        const itensEst = Array.isArray(itensEstoque) ? itensEstoque : (itensEstoque?.itens ? itensEstoque.itens : []);
        const mapaEstoque = new Map();
        itensEst.forEach((i) => {
          const chave = `${(i.nome || "").trim().toLowerCase()}::${(i.unidade || "un").trim().toLowerCase()}`;
          mapaEstoque.set(chave, Number(i.quantidade) || 0);
        });
        const itens = listaCat.map((item) => {
          const nome = (item.nome || "").trim();
          const unidade = (item.unidade || "").trim() || "un";
          const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
          const quantidadeDisponivel = mapaEstoque.get(chave) ?? 0;
          return {
            secao: (item.secao || "").trim() || "Sem seção",
            nome,
            marca: (item.marca || "").trim(),
            unidade,
            quantidadeDisponivel,
          };
        });
        setCatalogComEstoque(itens);
        const cats = [...new Set(itens.map((i) => (i.secao || "Sem seção").trim() || "Sem seção"))].filter(Boolean).sort();
        setCategorias(cats);
        setCategoriaSelecionada((prev) => prev || cats[0] || "");
        const iniciais = {};
        itens.forEach((p) => {
          iniciais[chaveItem(p.nome, p.unidade)] = "";
        });
        setQuantidadesRequisicao(iniciais);
      })
      .catch((err) => {
        console.error("Erro ao carregar catálogo/estoque:", err);
        Swal.fire("Aviso", "Não foi possível carregar o catálogo para requisição.", "warning");
      })
      .finally(() => setLoadingCatalog(false));
  }, [usuarioAtual]);

  async function carregarRequisicoes(usuario) {
    try {
      const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
      if (!empresaId) {
        Swal.fire("Erro", "Empresa não identificada.", "error");
        return;
      }

      const res = await fetch(`${API_URL}/api/requisicoes?empresa=${encodeURIComponent(empresaId)}`);
      const lista = await res.json();
      setRequisicoes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Erro ao carregar requisições:", err);
      Swal.fire("Erro", "Não foi possível carregar as requisições.", "error");
    }
  }

  function gerarLinkRequisicao() {
    if (!usuarioAtual) return "";
    const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) return "";
    
    const token = btoa(empresaId);
    return `${typeof window !== "undefined" ? window.location.origin : ""}/requisicao-link/${token}`;
  }

  function copiarLink() {
    const link = gerarLinkRequisicao();
    if (!link) {
      Swal.fire("Erro", "Não foi possível gerar o link.", "error");
      return;
    }

    navigator.clipboard.writeText(link).then(() => {
      setLinkCopiado(true);
      Swal.fire("Link copiado!", "Envie este link para o funcionário que precisa solicitar produtos.", "success");
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  }

  function handleQtdRequisicao(chave, valor, maxDisponivel) {
    const v = String(valor).replace(/\D/g, "") || "";
    const num = v === "" ? "" : Math.min(Number(v), maxDisponivel);
    setQuantidadesRequisicao((prev) => ({ ...prev, [chave]: num === "" ? "" : String(num) }));
  }

  async function criarRequisicaoNaPagina() {
    const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }
    const nomeSol = (solicitante || "").trim();
    if (!nomeSol) {
      Swal.fire("Atenção", "Informe o nome do solicitante.", "warning");
      return;
    }

    const itensEnvio = catalogComEstoque
      .map((p) => {
        const chave = chaveItem(p.nome, p.unidade);
        const qtd = Number(quantidadesRequisicao[chave]) || 0;
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

    setEnviandoRequisicao(true);
    try {
      const res = await fetch(`${API_URL}/api/requisicoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresaId,
          setorOrigem: setorRequisicao.trim() || "Requisição pela página",
          criadoPor: nomeSol,
          prioridade: "Normal",
          observacoes: observacoesRequisicao.trim(),
          itens: itensEnvio.map(({ nome, unidade, quantidade }) => ({ nome, unidade, quantidade })),
        }),
      });
      if (!res.ok) throw new Error("Falha ao criar requisição.");
      Swal.fire("Sucesso", "Requisição criada com sucesso.", "success");
      setSolicitante("");
      setSetorRequisicao("");
      setObservacoesRequisicao("");
      const iniciais = {};
      catalogComEstoque.forEach((p) => {
        iniciais[chaveItem(p.nome, p.unidade)] = "";
      });
      setQuantidadesRequisicao(iniciais);
      carregarRequisicoes(usuarioAtual);
    } catch (err) {
      console.error("Erro ao criar requisição:", err);
      Swal.fire("Erro", err.message || "Não foi possível criar a requisição.", "error");
    } finally {
      setEnviandoRequisicao(false);
    }
  }

  function getEmpresaId() {
    return usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  }

  async function atualizarStatus(req, novoStatus) {
    const confirmar = await Swal.fire({
      title: `Alterar status para "${novoStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#20b5a6",
    });

    if (!confirmar.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/requisicoes/${req._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");
      const atualizada = await res.json();

      // Se finalizou, dá baixa no estoque automaticamente
      if (novoStatus === "Entregue") {
        await darBaixaNoEstoque(atualizada);
      }

      setRequisicoes((prev) =>
        prev.map((r) => (r._id === atualizada._id ? atualizada : r))
      );

      Swal.fire("Sucesso", "Status atualizado com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      Swal.fire("Erro", "Falha ao atualizar a requisição.", "error");
    }
  }

  async function darBaixaNoEstoque(req) {
    try {
      const empresaId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
      if (!empresaId) {
        Swal.fire("Erro", "Empresa não identificada.", "error");
        return;
      }

      // Carrega estoque atual
      const resEstoque = await fetch(`${API_URL}/api/estoque/${empresaId}`);
      if (!resEstoque.ok) throw new Error("Erro ao carregar estoque");
      
      let estoqueAtual = await resEstoque.json();
      if (!Array.isArray(estoqueAtual)) estoqueAtual = [];

      // Atualiza quantidades (dá baixa)
      req.itens.forEach((item) => {
        estoqueAtual = estoqueAtual.map((p) =>
          p.nome === item.nome
            ? {
                ...p,
                quantidade: Math.max(0, (Number(p.quantidade) || 0) - (Number(item.quantidade) || 0)),
                ultimaAtualizacao: new Date().toISOString(),
              }
            : p
        );
      });

      // Salva estoque atualizado
      await fetch(`${API_URL}/api/estoque/${empresaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: estoqueAtual }),
      });

      Swal.fire("Sucesso", "Baixa realizada no estoque com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao dar baixa:", err);
      Swal.fire("Erro", "Não foi possível dar baixa no estoque.", "error");
    }
  }

  const coresStatus = {
    Pendente: "#FF8882",
    "Em Separação": "#F6A46A",
    Entregue: "#25C19B",
    Cancelada: "#8b949e",
  };

  if (!usuarioAtual) return null;

  const linkRequisicao = gerarLinkRequisicao();
  const requisicoesPendentes = requisicoes.filter((r) => r.status === "Pendente" || r.status === "Em Separação");
  const requisicoesEntregues = requisicoes.filter((r) => r.status === "Entregue");

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        {/* Seção: Fazer requisição direto na página (catálogo) */}
        <div style={boxReq}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
              Requisição
            </h2>
            <button
              type="button"
              onClick={copiarLink}
              style={linkRequisicao ? btnGerarLink : { ...btnGerarLink, opacity: 0.7, cursor: "not-allowed" }}
              disabled={!linkRequisicao}
              title="Gera o link de requisição e copia para a área de transferência. Envie o link para o funcionário solicitar produtos."
            >
              {linkCopiado ? "Link copiado!" : "Gerar link"}
            </button>
          </div>
          <p style={{ color: "#8b949e", marginBottom: 16, fontSize: "0.9375rem" }}>
            Use o catálogo abaixo para montar uma requisição e registrar a saída. Escolha a categoria e informe as quantidades e o nome do solicitante.
          </p>

          {loadingCatalog ? (
            <p style={{ color: "#8b949e" }}>Carregando catálogo...</p>
          ) : catalogComEstoque.length === 0 ? (
            <p style={{ color: "#8b949e" }}>Nenhum item no catálogo. Cadastre itens em Catálogo e Controle de estoque.</p>
          ) : (
            <>
              {categorias.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>
                    Categoria
                  </label>
                  <select
                    value={categoriaSelecionada}
                    onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    style={selectDark}
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
                <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Solicitante (obrigatório)</label>
                <input
                  type="text"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  placeholder="Nome de quem está solicitando"
                  style={inputDark}
                  className="campo-fundo-claro"
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ color: "#8b949e", fontSize: "0.875rem", display: "block", marginBottom: 6 }}>Setor (opcional)</label>
                  <input
                    type="text"
                    value={setorRequisicao}
                    onChange={(e) => setSetorRequisicao(e.target.value)}
                    placeholder="Ex.: Cozinha, Bar"
                    style={inputDark}
                    className="campo-fundo-claro"
                  />
                </div>
                <button
                  type="button"
                  onClick={criarRequisicaoNaPagina}
                  disabled={enviandoRequisicao}
                  style={{ ...btn, background: "var(--gradient-btn-primary)", color: "#0B1C26", padding: "10px 20px", fontSize: "1rem", flexShrink: 0 }}
                >
                  {enviandoRequisicao ? "Criando..." : "Criar requisição"}
                </button>
              </div>

              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "60px" }} />
                    <col style={{ width: "90px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...thDark, padding: "8px 10px", textAlign: "left" }}>Produto</th>
                      <th style={{ ...thDark, padding: "8px 10px", width: 80, textAlign: "left" }}>Un.</th>
                      <th style={{ ...thDark, padding: "8px 10px", width: 60, textAlign: "center" }}>Disp.</th>
                      <th style={{ ...thDark, padding: "8px 10px", width: 90, textAlign: "center" }}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogComEstoque
                      .filter((i) => (i.secao || "Sem seção") === categoriaSelecionada)
                      .map((p) => {
                        const chave = chaveItem(p.nome, p.unidade);
                        const maxQtd = Number(p.quantidadeDisponivel) || 0;
                        const valorAtual = quantidadesRequisicao[chave] || "";
                        return (
                          <tr key={chave} style={{ borderBottom: BORDER }}>
                            <td style={{ padding: "8px 10px", color: "#e6edf3" }}>{p.nome}{p.marca ? ` — ${p.marca}` : ""}</td>
                            <td style={{ padding: "8px 10px", color: "#8b949e", textAlign: "left" }}>{p.unidade || "un"}</td>
                            <td style={{ padding: "8px 10px", color: "#8b949e", textAlign: "center" }}>{maxQtd}</td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <input
                                type="number"
                                min={0}
                                max={maxQtd}
                                value={valorAtual}
                                onChange={(e) => handleQtdRequisicao(chave, e.target.value, maxQtd)}
                                placeholder="0"
                                style={inputNumDark}
                                className="campo-fundo-claro"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#8b949e", fontSize: "0.875rem" }}>Observações (opcional)</label>
                <textarea
                  value={observacoesRequisicao}
                  onChange={(e) => setObservacoesRequisicao(e.target.value)}
                  placeholder="Ex.: Urgente"
                  rows={2}
                  style={{ ...inputDark, resize: "vertical" }}
                  className="campo-fundo-claro"
                />
              </div>

            </>
          )}
        </div>

        {/* Seção: Requisições Pendentes */}
        {requisicoesPendentes.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
              Requisições Pendentes
            </h2>
            {requisicoesPendentes.map((req) => (
              <div key={req._id} style={boxReq}>
                <div style={reqHeader}>
                  <div>
                    <strong style={{ fontSize: "1.125rem", color: "#e6edf3" }}>
                      #{req.numero || req._id?.slice(-6)}
                    </strong>
                    <br />
                    <small style={{ color: "#8b949e", fontSize: "0.875rem" }}>
                      Solicitado por: <b>{req.funcionarioNome || req.criadoPor || "Funcionário"}</b>
                      {req.setorOrigem && ` — ${req.setorOrigem}`}
                      <br />
                      {new Date(req.createdAt || Date.now()).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <span style={{ ...badgeStatus, background: coresStatus[req.status] || "#8b949e" }}>
                    {req.status}
                  </span>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={{ color: "#e6edf3", fontSize: "0.9375rem", fontWeight: 600, marginBottom: 8 }}>
                    Itens solicitados:
                  </h3>
                  <ul style={{ paddingLeft: 20, margin: 0, color: "#e6edf3" }}>
                    {req.itens?.map((it, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        <b>{it.nome}</b> — {it.quantidade} {it.unidade || "un"}
                      </li>
                    ))}
                  </ul>
                </div>

                {req.observacoes && (
                  <div style={{ marginTop: 12, padding: 12, borderBottom: BORDER }}>
                    <strong style={{ color: "#8b949e", fontSize: "0.875rem" }}>Observações:</strong>
                    <p style={{ color: "#e6edf3", margin: "4px 0 0", fontSize: "0.9375rem" }}>{req.observacoes}</p>
                  </div>
                )}

                <div style={acoes}>
                  {req.status === "Pendente" && (
                    <button
                      style={{ ...btn, background: "#F6A46A" }}
                      onClick={() => atualizarStatus(req, "Em Separação")}
                    >
                      Iniciar Separação
                    </button>
                  )}

                  {req.status === "Em Separação" && (
                    <button
                      style={{ ...btn, background: "var(--gradient-btn-primary)" }}
                      onClick={() => atualizarStatus(req, "Entregue")}
                    >
                      Marcar como Entregue e Dar Baixa
                    </button>
                  )}

                  {req.status !== "Entregue" && req.status !== "Cancelada" && (
                    <button
                      style={{ ...btn, background: "transparent", border: "1px solid rgba(248,81,73,0.5)", color: "#f85149" }}
                      onClick={() => atualizarStatus(req, "Cancelada")}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Seção: Requisições Entregues (Histórico) */}
        {requisicoesEntregues.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16, color: "#e6edf3", fontSize: "1.25rem", fontWeight: 700 }}>
              Requisições Entregues
            </h2>
            {requisicoesEntregues.map((req) => (
              <div key={req._id} style={{ ...boxReq, opacity: 0.8 }}>
                <div style={reqHeader}>
                  <div>
                    <strong style={{ fontSize: "1.125rem", color: "#e6edf3" }}>
                      #{req.numero || req._id?.slice(-6)}
                    </strong>
                    <br />
                    <small style={{ color: "#8b949e", fontSize: "0.875rem" }}>
                      Entregue para: <b>{req.funcionarioNome || req.criadoPor || "Funcionário"}</b>
                      <br />
                      {req.dataEntrega 
                        ? `Entregue em ${new Date(req.dataEntrega).toLocaleString("pt-BR")}`
                        : new Date(req.updatedAt || req.createdAt).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <span style={{ ...badgeStatus, background: coresStatus.Entregue }}>
                    Entregue
                  </span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <ul style={{ paddingLeft: 20, margin: 0, color: "#e6edf3" }}>
                    {req.itens?.map((it, i) => (
                      <li key={i} style={{ marginBottom: 4, fontSize: "0.9375rem" }}>
                        {it.nome} — {it.quantidade} {it.unidade || "un"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {requisicoes.length === 0 && (
          <p style={{ textAlign: "center", color: "#8b949e", fontStyle: "italic", fontSize: "1.0625rem", marginTop: 40 }}>
            Nenhuma requisição encontrada.
          </p>
        )}
      </main>
    </div>
  );
}

const mainWrap = {
  width: "100%",
  margin: "24px 0",
  padding: "0 20px 40px",
  boxSizing: "border-box",
};

const boxReq = {
  color: "#e6edf3",
  padding: 24,
  marginBottom: 18,
  borderBottom: BORDER,
};

const reqHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
};

const badgeStatus = {
  padding: "6px 14px",
  borderRadius: 4,
  fontWeight: 600,
  color: "#fff",
  fontSize: "0.875rem",
};

const acoes = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: BORDER,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const btn = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
  color: "#fff",
};

const btnCopiar = {
  ...btn,
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
};

const btnGerarLink = {
  ...btn,
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  padding: "10px 20px",
  fontSize: "1rem",
};

const inputLink = {
  flex: 1,
  minWidth: 200,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "transparent",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};

const selectDark = {
  width: "100%",
  maxWidth: 320,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
};

const inputDark = {
  width: "100%",
  maxWidth: 400,
  padding: "10px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
  boxSizing: "border-box",
};

const thDark = {
  background: "rgba(255,255,255,0.06)",
  color: "#8b949e",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const inputNumDark = {
  width: 72,
  padding: "6px 8px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};

