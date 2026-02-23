// src/pages/Comprador/FrenteDeLoja.jsx — PDV com cardápio de pratos prontos
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const PRECOS_PDV_KEY = "pdv_precos_v2";

function getPrecosSalvos() {
  try {
    const raw = localStorage.getItem(PRECOS_PDV_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function salvarPreco(chave, preco) {
  const precos = getPrecosSalvos();
  precos[chave] = preco;
  localStorage.setItem(PRECOS_PDV_KEY, JSON.stringify(precos));
}

export default function FrenteDeLoja() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateComanda = location.state?.comandaId ? { id: location.state.comandaId, codigo: location.state.codigoComanda } : null;
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [comandasAbertas, setComandasAbertas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [busca, setBusca] = useState("");
  const [cart, setCart] = useState([]);
  const [desconto, setDesconto] = useState("");
  const [loading, setLoading] = useState(true);
  const [mostrarAvulso, setMostrarAvulso] = useState(false);
  const [avulso, setAvulso] = useState({ nome: "", preco: "", quantidade: "1", unidade: "un" });
  const [codigoBarrasInput, setCodigoBarrasInput] = useState("");
  const barcodeInputRef = useRef(null);

  function getEmpresaId() {
    return usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  }

  useEffect(() => {
    const usuario = sessionStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }
    setUsuarioAtual(JSON.parse(usuario));
  }, [navigate]);

  function getToken() {
    return sessionStorage.getItem("token");
  }

  useEffect(() => {
    if (!usuarioAtual) return;
    const empresaId = getEmpresaId();
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
      fetch(`${API_URL}/api/cardapio-pdv/categorias?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()).catch(() => []),
      fetch(`${API_URL}/api/comandas?status=aberta`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} }).then((r) => r.json()).catch(() => []),
    ])
      .then(([listaCardapio, catsApi, listaComandas]) => {
        setComandasAbertas(Array.isArray(listaComandas) ? listaComandas : []);
        const lista = Array.isArray(listaCardapio) ? listaCardapio : [];
        const itens = lista.filter((p) => p.ativo !== false);
        setProdutos(itens);
        const dosItens = [...new Set(lista.map((p) => (String(p.categoria || "").trim() || "Geral")))];
        const daApi = Array.isArray(catsApi) ? catsApi : [];
        const todas = [...new Set([...dosItens, ...daApi])].filter(Boolean).sort((a, b) => (a === "Geral" ? -1 : b === "Geral" ? 1 : a.localeCompare(b)));
        const cats = todas.length ? todas : ["Geral"];
        setCategorias(cats);
        setCategoriaSelecionada((prev) => (prev && cats.includes(prev) ? prev : cats[0] || ""));
      })
      .catch((err) => {
        console.error("Erro ao carregar produtos:", err);
        setProdutos([]);
        setCategorias([]);
      })
      .finally(() => setLoading(false));
  }, [usuarioAtual]);

  const produtosFiltrados = useMemo(() => {
    const cat = categoriaSelecionada || "";
    const b = (busca || "").trim().toLowerCase();
    return produtos.filter((p) => {
      const matchCat = !cat || (p.categoria || "Geral") === cat;
      const matchBusca =
        !b ||
        (p.nome || "").toLowerCase().includes(b) ||
        (p.codigo || "").toLowerCase().includes(b) ||
        (p.codigoBarras || "").includes(b) ||
        (p.descricao || "").toLowerCase().includes(b);
      return matchCat && matchBusca;
    });
  }, [produtos, categoriaSelecionada, busca]);

  function adicionarPorBarcodeOuCodigo(valor) {
    const v = String(valor || "").trim();
    if (!v) return;
    const item = produtos.find(
      (p) =>
        (p.codigoBarras && String(p.codigoBarras) === v) ||
        (p.codigo && String(p.codigo).toLowerCase() === v.toLowerCase())
    );
    if (item) {
      const preco = item.preco || 0;
      if (preco > 0) {
        adicionarAoCarrinho(item, String(preco), "1");
        setCodigoBarrasInput("");
      } else {
        Swal.fire("Atenção", `"${item.nome}" sem preço. Informe manualmente.`, "warning");
      }
    } else {
      Swal.fire("Não encontrado", `Nenhum produto com código/barras "${v}"`, "warning");
    }
  }

  function handleBarcodeKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      adicionarPorBarcodeOuCodigo(codigoBarrasInput);
    }
  }

  function adicionarAoCarrinho(produto, precoStr, qtdStr) {
    const precoPadrao = produto.preco != null ? Number(produto.preco) : 0;
    const preco = parseFloat(String(precoStr || precoPadrao).replace(",", ".")) || precoPadrao || 0;
    const qtd = parseFloat(String(qtdStr).replace(",", ".")) || 1;
    if (preco <= 0) {
      Swal.fire("Atenção", "Informe o preço unitário ou cadastre o produto com preço no Cardápio PDV.", "warning");
      return;
    }
    if (qtd <= 0) {
      Swal.fire("Atenção", "Informe a quantidade.", "warning");
      return;
    }
    const chave = produto._id ? produto._id : produto.nome;
    salvarPreco(chave, preco);
    setCart((prev) => {
      const existente = prev.find((c) => (c._id && c._id === produto._id) || (c.nome === produto.nome && c.unidade === (produto.unidade || "un")));
      if (existente) {
        return prev.map((c) =>
          c === existente ? { ...c, quantidade: c.quantidade + qtd, precoUnitario: preco } : c
        );
      }
      return [...prev, { _id: produto._id, nome: produto.nome, unidade: produto.unidade || "un", quantidade: qtd, precoUnitario: preco }];
    });
  }

  function adicionarAvulso() {
    const nome = (avulso.nome || "").trim();
    const preco = parseFloat(String(avulso.preco).replace(",", ".")) || 0;
    const qtd = parseFloat(String(avulso.quantidade).replace(",", ".")) || 1;
    if (!nome) {
      Swal.fire("Atenção", "Informe o nome do produto.", "warning");
      return;
    }
    if (preco <= 0) {
      Swal.fire("Atenção", "Informe o preço unitário.", "warning");
      return;
    }
    if (qtd <= 0) {
      Swal.fire("Atenção", "Informe a quantidade.", "warning");
      return;
    }
    const unidade = (avulso.unidade || "un").trim() || "un";
    setCart((prev) => {
      const existente = prev.find((c) => c.nome === nome && c.unidade === unidade);
      if (existente) {
        return prev.map((c) =>
          c === existente ? { ...c, quantidade: c.quantidade + qtd, precoUnitario: preco } : c
        );
      }
      return [...prev, { nome, unidade, quantidade: qtd, precoUnitario: preco }];
    });
    setAvulso({ nome: "", preco: "", quantidade: "1", unidade: "un" });
    setMostrarAvulso(false);
  }

  function alterarQtdCart(index, novaQtd) {
    const n = parseFloat(String(novaQtd).replace(",", ".")) || 0;
    if (n <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, quantidade: n } : c)));
  }

  function removerDoCart(index) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function limparVenda() {
    setCart([]);
    setDesconto("");
  }

  const subtotal = cart.reduce((s, c) => s + c.quantidade * c.precoUnitario, 0);
  const descNumerico = parseFloat(String(desconto).replace(",", ".")) || 0;
  const total = Math.max(0, subtotal - descNumerico);
  const precosSalvos = getPrecosSalvos();

  async function finalizarVenda() {
    if (cart.length === 0) {
      Swal.fire("Atenção", "Adicione itens ao carrinho.", "warning");
      return;
    }
    const formaPgto = await Swal.fire({
      title: "Forma de pagamento",
      html: `
        <select id="forma-pgto" class="swal2-input" style="width:100%;padding:10px">
          <option value="Dinheiro">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="Cartão Débito">Cartão Débito</option>
          <option value="Cartão Crédito">Cartão Crédito</option>
          <option value="Conta assinada">Conta assinada</option>
          <option value="Outro">Outro</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Finalizar venda",
      confirmButtonColor: "#20b5a6",
      preConfirm: () => document.getElementById("forma-pgto").value,
    });
    if (!formaPgto.isConfirmed) return;

    // Aqui poderia gravar a venda em um backend (endpoint de vendas)
    // Por ora, apenas confirma localmente
    Swal.fire({
      title: "Venda finalizada!",
      html: `
        <p style="color:#8b949e;margin-bottom:8px">Total: R$ ${total.toFixed(2)}</p>
        <p style="color:#8b949e;font-size:0.9rem">Forma de pagamento: ${formaPgto.value}</p>
        <p style="color:#e6edf3;margin-top:12px">${cart.length} item(ns) vendido(s)</p>
      `,
      icon: "success",
      confirmButtonColor: "#20b5a6",
    });
    limparVenda();
  }

  async function enviarParaComanda() {
    if (cart.length === 0) {
      Swal.fire("Atenção", "Adicione itens ao carrinho.", "warning");
      return;
    }
    const comandaId = stateComanda?.id;
    if (comandaId) {
      const itens = cart.map((c) => ({ nome: c.nome, unidade: c.unidade || "un", quantidade: c.quantidade, precoUnitario: c.precoUnitario }));
      try {
        const res = await fetch(`${API_URL}/api/comandas/${comandaId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({ itens }),
        });
        if (!res.ok) throw new Error("Erro ao enviar.");
        Swal.fire("Sucesso", `Itens adicionados à ${stateComanda.codigo || "comanda"}.`, "success");
        limparVenda();
        navigate("/comandas");
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      }
      return;
    }
    if (comandasAbertas.length === 0) {
      const { value: codigo } = await Swal.fire({
        title: "Nenhuma comanda aberta",
        input: "text",
        inputPlaceholder: "Ex.: Mesa 1",
        showCancelButton: true,
        confirmButtonText: "Abrir e enviar",
        inputValidator: (v) => (!v || !v.trim() ? "Informe o código" : null),
      });
      if (!codigo) return;
      try {
        const resCreate = await fetch(`${API_URL}/api/comandas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({ codigo: codigo.trim() }),
        });
        const nova = await resCreate.json();
        if (!resCreate.ok) throw new Error(nova.error || "Erro ao criar.");
        const itens = cart.map((c) => ({ nome: c.nome, unidade: c.unidade || "un", quantidade: c.quantidade, precoUnitario: c.precoUnitario }));
        const resPut = await fetch(`${API_URL}/api/comandas/${nova._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({ itens }),
        });
        if (!resPut.ok) throw new Error("Erro ao enviar.");
        Swal.fire("Sucesso", `Comanda "${codigo}" aberta com os itens.`, "success");
        limparVenda();
        navigate("/comandas");
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      }
      return;
    }
    const { value: escolha } = await Swal.fire({
      title: "Enviar para comanda",
      input: "select",
      inputOptions: Object.fromEntries(comandasAbertas.map((c) => [c._id, c.codigo])),
      showCancelButton: true,
      confirmButtonText: "Enviar",
    });
    if (!escolha) return;
    const itens = cart.map((c) => ({ nome: c.nome, unidade: c.unidade || "un", quantidade: c.quantidade, precoUnitario: c.precoUnitario }));
    try {
      const res = await fetch(`${API_URL}/api/comandas/${escolha}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ itens }),
      });
      if (!res.ok) throw new Error("Erro ao enviar.");
      const nome = comandasAbertas.find((c) => c._id === escolha)?.codigo || "comanda";
      Swal.fire("Sucesso", `Itens adicionados à ${nome}.`, "success");
      limparVenda();
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3", minHeight: "calc(100vh - 180px)" }}>
      <div style={pdvLayout}>
        {/* Coluna esquerda: produtos */}
        <div style={colProdutos}>
          <div style={headerProdutos}>
            <input
              type="text"
              placeholder="Buscar por produto, código ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={inputBusca}
              className="campo-fundo-claro"
            />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="🔍 Cód. barras ou código (Enter)"
              value={codigoBarrasInput}
              onChange={(e) => setCodigoBarrasInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              style={{ ...inputBusca, maxWidth: 220 }}
              className="campo-fundo-claro"
              title="Digite o código de barras ou código e pressione Enter para adicionar ao carrinho"
            />
            {categorias.length > 0 && (
              <select
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                style={selectCategoria}
                className="campo-fundo-claro"
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={() => navigate("/cardapio-pdv")} style={btnSecundarioPdv} title="Gerenciar cardápio">
              Cardápio
            </button>
            <button type="button" onClick={() => setMostrarAvulso(!mostrarAvulso)} style={btnAvulso}>
              + Avulso
            </button>
          </div>

          {mostrarAvulso && (
            <div style={boxAvulso}>
              <input
                placeholder="Nome do produto"
                value={avulso.nome}
                onChange={(e) => setAvulso((p) => ({ ...p, nome: e.target.value }))}
                style={inputAvulso}
                className="campo-fundo-claro"
              />
              <input
                placeholder="Preço (R$)"
                value={avulso.preco}
                onChange={(e) => setAvulso((p) => ({ ...p, preco: e.target.value }))}
                style={{ ...inputAvulso, width: 100 }}
                className="campo-fundo-claro"
              />
              <input
                placeholder="Qtd"
                value={avulso.quantidade}
                onChange={(e) => setAvulso((p) => ({ ...p, quantidade: e.target.value }))}
                style={{ ...inputAvulso, width: 70 }}
                className="campo-fundo-claro"
              />
              <input
                placeholder="Un."
                value={avulso.unidade}
                onChange={(e) => setAvulso((p) => ({ ...p, unidade: e.target.value }))}
                style={{ ...inputAvulso, width: 60 }}
                className="campo-fundo-claro"
              />
              <button type="button" onClick={adicionarAvulso} style={btnAdd}>Adicionar</button>
            </div>
          )}

          {loading ? (
            <p style={{ color: "#8b949e", padding: 20 }}>Carregando produtos...</p>
          ) : produtosFiltrados.length === 0 ? (
            <p style={{ color: "#8b949e", padding: 20 }}>
              Nenhum produto no cardápio. Cadastre em <button type="button" onClick={() => navigate("/cardapio-pdv")} style={{ background: "none", border: "none", color: "#00F2FF", cursor: "pointer", textDecoration: "underline" }}>Cardápio PDV</button> ou use &quot;Avulso&quot;.
            </p>
          ) : (
            <div style={listaProdutos}>
              <div style={listaProdutosHeader}>
                <span style={thProduto}>Produto</span>
                <span style={thCategoria}>Categoria</span>
                <span style={thPreco}>Preço</span>
                <span style={thQtd}>Qtd</span>
                <span style={{ width: 48 }} />
              </div>
              {produtosFiltrados.map((p) => {
                const precoPadrao = precosSalvos[p._id] ?? precosSalvos[p.nome] ?? (p.preco != null ? String(p.preco) : "");
                return (
                  <ProdutoLinha
                    key={p._id || `${p.nome}-${p.unidade}`}
                    produto={p}
                    precoPadrao={precoPadrao}
                    onAdicionar={adicionarAoCarrinho}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna direita: carrinho */}
        <div style={colCarrinho}>
          {stateComanda && (
            <div style={{ background: "rgba(0,242,255,0.15)", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: "0.875rem", color: "#00F2FF" }}>
              Adicionando a: <strong>{stateComanda.codigo}</strong>
            </div>
          )}
          <h3 style={{ margin: "0 0 16px", color: "#e6edf3", fontSize: "1.25rem" }}>Carrinho</h3>
          {cart.length === 0 ? (
            <p style={{ color: "#8b949e", fontSize: "0.9375rem" }}>Carrinho vazio. Selecione produtos à esquerda.</p>
          ) : (
            <>
              <div style={listaCart}>
                {cart.map((item, i) => (
                  <div key={i} style={itemCart}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: "#e6edf3", fontSize: "0.9375rem" }}>{item.nome}</strong>
                      <span style={{ color: "#8b949e", fontSize: "0.8125rem", marginLeft: 6 }}>{item.unidade}</span>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(e) => alterarQtdCart(i, e.target.value)}
                      style={inputQtd}
                      className="campo-fundo-claro"
                    />
                    <span style={{ color: "#8b949e", fontSize: "0.875rem", minWidth: 70, textAlign: "right" }}>
                      R$ {(item.quantidade * item.precoUnitario).toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removerDoCart(i)} style={btnRemover} title="Remover">×</button>
                  </div>
                ))}
              </div>
              <div style={totais}>
                <div style={linhaTotal}>
                  <span style={{ color: "#8b949e" }}>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div style={linhaTotal}>
                  <span style={{ color: "#8b949e" }}>Desconto</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    style={{ ...inputQtd, width: 100, textAlign: "right" }}
                    className="campo-fundo-claro"
                  />
                </div>
                <div style={{ ...linhaTotal, fontSize: "1.25rem", fontWeight: 700, marginTop: 12 }}>
                  <span>Total</span>
                  <span style={{ color: "#00F2FF" }}>R$ {total.toFixed(2)}</span>
                </div>
              </div>
              <div style={botoesAcao}>
                <button type="button" onClick={limparVenda} style={btnLimpar}>Limpar</button>
                <button type="button" onClick={enviarParaComanda} style={btnComanda}>Enviar p/ comanda</button>
                <button type="button" onClick={finalizarVenda} style={btnFinalizar}>Finalizar venda</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProdutoLinha({ produto, precoPadrao, onAdicionar }) {
  const [preco, setPreco] = useState(precoPadrao);
  const [qtd, setQtd] = useState("1");

  useEffect(() => {
    setPreco(precoPadrao);
  }, [precoPadrao]);

  return (
    <div style={linhaProduto}>
      <span style={cellNome}>{produto.nome}</span>
      <span style={cellCategoria}>{produto.categoria || "Geral"} · {produto.unidade || "un"}</span>
      <input
        type="text"
        placeholder="Preço"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
        style={inputPreco}
        className="campo-fundo-claro"
      />
      <input
        type="text"
        placeholder="Qtd"
        value={qtd}
        onChange={(e) => setQtd(e.target.value)}
        style={inputQtdProduto}
        className="campo-fundo-claro"
      />
      <button type="button" onClick={() => onAdicionar(produto, preco, qtd)} style={btnAdd} title="Adicionar">+</button>
    </div>
  );
}

const pdvLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 340px",
  gap: 24,
  minHeight: "calc(100vh - 200px)",
  alignItems: "stretch",
};

const colProdutos = {
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
};

const colCarrinho = {
  background: "rgba(0,0,0,0.25)",
  border: BORDER,
  borderRadius: 8,
  padding: 20,
  position: "sticky",
  top: 20,
  height: "fit-content",
  maxHeight: "calc(100vh - 140px)",
  overflow: "auto",
};

const headerProdutos = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const inputBusca = {
  flex: "1 1 200px",
  padding: "10px 14px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
};

const selectCategoria = {
  padding: "10px 14px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  minWidth: 140,
};

const btnAvulso = {
  padding: "10px 18px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-orange)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9375rem",
};
const btnSecundarioPdv = {
  padding: "10px 18px",
  borderRadius: 6,
  border: BORDER,
  background: "transparent",
  color: "#8b949e",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9375rem",
};

const boxAvulso = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
  padding: 12,
  background: "rgba(0,0,0,0.2)",
  borderRadius: 6,
  border: BORDER,
};

const inputAvulso = {
  flex: 1,
  minWidth: 120,
  padding: "8px 12px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.9375rem",
};

const listaProdutos = {
  border: BORDER,
  borderRadius: 8,
  overflow: "hidden",
  background: "rgba(0,0,0,0.15)",
};

const listaProdutosHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  background: "rgba(0,0,0,0.3)",
  borderBottom: BORDER,
};

const thProduto = { flex: "1 1 220px", color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thCategoria = { width: 100, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thPreco = { width: 90, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thQtd = { width: 50, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };

const linhaProduto = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: BORDER,
};

const cellNome = { flex: "1 1 220px", color: "#e6edf3", fontSize: "0.9375rem", minWidth: 0 };
const cellCategoria = { width: 100, color: "#8b949e", fontSize: "0.8125rem", flexShrink: 0 };

const inputPreco = {
  width: 90,
  padding: "6px 10px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.875rem",
};

const inputQtdProduto = {
  width: 50,
  padding: "6px 8px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.875rem",
};

const btnAdd = {
  padding: "6px 14px",
  borderRadius: 4,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
};

const listaCart = {
  maxHeight: 280,
  overflowY: "auto",
  marginBottom: 16,
};

const itemCart = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: BORDER,
};

const inputQtd = {
  width: 60,
  padding: "6px 8px",
  borderRadius: 4,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "0.875rem",
};

const btnRemover = {
  background: "transparent",
  border: "none",
  color: "#f85149",
  fontSize: "1.25rem",
  cursor: "pointer",
  padding: "0 6px",
  lineHeight: 1,
};

const totais = {
  borderTop: BORDER,
  paddingTop: 16,
};

const linhaTotal = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
  fontSize: "1rem",
  color: "#e6edf3",
};

const botoesAcao = {
  display: "flex",
  gap: 12,
  marginTop: 20,
};

const btnComanda = {
  flex: 1,
  padding: "12px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-orange)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const btnLimpar = {
  flex: 1,
  padding: "12px 20px",
  borderRadius: 6,
  border: "1px solid rgba(248,81,73,0.5)",
  background: "transparent",
  color: "#f85149",
  fontWeight: 600,
  cursor: "pointer",
};

const btnFinalizar = {
  flex: 2,
  padding: "12px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1.0625rem",
};
