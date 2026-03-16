// Frente de Loja — PDV tipo farmácia com leitura de código de barras e baixa no estoque
// Leitores USB (modo HID/teclado): basta focar o campo e passar o produto — o leitor "digita" o código e envia Enter
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";
import { totalizarIbsCbs } from "../../utils/reformaTributaria";

const API_URL = getApiUrl();
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

function chaveEstoque(nome, unidade) {
  return `${(nome || "").trim().toLowerCase()}::${(unidade || "un").trim().toLowerCase()}`;
}

export default function FrenteDeLoja() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [estoqueMapa, setEstoqueMapa] = useState(new Map());
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [busca, setBusca] = useState("");
  const [cart, setCart] = useState([]);
  const [desconto, setDesconto] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState("dinheiro");
  const [loading, setLoading] = useState(true);
  const [mostrarAvulso, setMostrarAvulso] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [avulso, setAvulso] = useState({ nome: "", preco: "", quantidade: "1", unidade: "un" });
  const [codigoBarrasInput, setCodigoBarrasInput] = useState("");
  const [finalizando, setFinalizando] = useState(false);
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

  const carregarDados = useCallback(() => {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/cardapio-pdv?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()),
      fetch(`${API_URL}/api/cardapio-pdv/categorias?empresa=${encodeURIComponent(empresaId)}`).then((r) => r.json()).catch(() => []),
      fetch(`${API_URL}/api/estoque/${encodeURIComponent(empresaId)}`).then((r) => r.json()).catch(() => []),
    ])
      .then(([listaCardapio, catsApi, itensEstoque]) => {
        const lista = Array.isArray(listaCardapio) ? listaCardapio : [];
        const arrEst = Array.isArray(itensEstoque) ? itensEstoque : (itensEstoque?.itens ? itensEstoque.itens : []);

        const mapa = new Map();
        const mapaCodigoBarras = new Map();
        arrEst.forEach((i) => {
          const chave = chaveEstoque(i.nome, i.unidade);
          mapa.set(chave, Number(i.quantidade) || 0);
          if ((i.codigoBarras || "").trim()) mapaCodigoBarras.set(chave, i.codigoBarras.trim());
        });
        setEstoqueMapa(mapa);

        const itens = lista
          .filter((p) => p.ativo !== false)
          .map((p) => {
            const chave = chaveEstoque(p.nome, p.unidade || "un");
            const codigoBarrasCat = mapaCodigoBarras.get(chave);
            return !(p.codigoBarras || "").trim() && codigoBarrasCat
              ? { ...p, codigoBarras: codigoBarrasCat }
              : p;
          });
        setProdutos(itens);

        const dosItens = [...new Set(lista.map((p) => (String(p.categoria || "").trim() || "Geral")))];
        const daApi = Array.isArray(catsApi) ? catsApi : [];
        const todas = [...new Set([...dosItens, ...daApi])].filter(Boolean).sort((a, b) => (a === "Geral" ? -1 : b === "Geral" ? 1 : a.localeCompare(b)));
        const cats = todas.length ? todas : ["Geral"];
        setCategorias(cats);
        setCategoriaSelecionada((prev) => (prev && cats.includes(prev) ? prev : cats[0] || ""));
      })
      .catch((err) => {
        console.error("Erro ao carregar:", err);
        setProdutos([]);
        setCategorias([]);
      })
      .finally(() => setLoading(false));
  }, [usuarioAtual]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregarDados();
  }, [usuarioAtual, carregarDados]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

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

  function getEstoqueDisponivel(produto) {
    const chave = chaveEstoque(produto.nome, produto.unidade || "un");
    return estoqueMapa.has(chave) ? estoqueMapa.get(chave) : null;
  }

  function adicionarPorBarcodeOuCodigo(valor) {
    const v = String(valor || "").trim();
    if (!v) return;
    const item = produtos.find(
      (p) =>
        (p.codigoBarras && String(p.codigoBarras) === v) ||
        (p.codigo && String(p.codigo).toLowerCase() === v.toLowerCase())
    );
    if (item) {
      const disp = getEstoqueDisponivel(item);
      if (disp !== null && disp < 1) {
        Swal.fire("Estoque zerado", `"${item.nome}" não possui quantidade em estoque.`, "warning");
        setCodigoBarrasInput("");
        return;
      }
      const preco = item.preco || 0;
      if (preco > 0) {
        adicionarAoCarrinho(item, String(preco), "1");
        setCodigoBarrasInput("");
        barcodeInputRef.current?.focus();
      } else {
        Swal.fire("Atenção", `"${item.nome}" sem preço. Informe manualmente.`, "warning");
      }
    } else {
      Swal.fire("Não encontrado", `Nenhum produto com código/barras "${v}"`, "warning");
      setCodigoBarrasInput("");
      barcodeInputRef.current?.focus();
    }
  }

  function handleBarcodeKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Usar valor do DOM (ref) — leitores USB digitam tão rápido que o state do React pode estar desatualizado
      const valor = barcodeInputRef.current?.value?.trim() || codigoBarrasInput.trim();
      adicionarPorBarcodeOuCodigo(valor);
    }
  }

  function adicionarAoCarrinho(produto, precoStr, qtdStr) {
    const precoPadrao = produto.preco != null ? Number(produto.preco) : 0;
    const preco = parseFloat(String(precoStr || precoPadrao).replace(",", ".")) || precoPadrao || 0;
    const qtd = parseFloat(String(qtdStr).replace(",", ".")) || 1;
    if (preco <= 0) {
        Swal.fire("Atenção", "Informe o preço unitário ou cadastre o produto com preço no Catálogo PDV.", "warning");
      return;
    }
    if (qtd <= 0) {
      Swal.fire("Atenção", "Informe a quantidade.", "warning");
      return;
    }

    const disp = getEstoqueDisponivel(produto);
    if (disp !== null) {
      const qtdNoCart = cart.reduce((s, c) => {
        if ((c._id && c._id === produto._id) || (c.nome === produto.nome && c.unidade === (produto.unidade || "un")))
          return s + c.quantidade;
        return s;
      }, 0);
      const totalApos = qtdNoCart + qtd;
      if (totalApos > disp) {
        Swal.fire(
          "Estoque insuficiente",
          `"${produto.nome}": disponível ${disp} ${produto.unidade || "un"}, não é possível adicionar mais.`,
          "warning"
        );
        return;
      }
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
      return [...prev, { _id: produto._id, nome: produto.nome, unidade: produto.unidade || "un", quantidade: qtd, precoUnitario: preco, categoriaTributaria: produto.categoriaTributaria || "ALÍQUOTA_PADRÃO" }];
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
      return [...prev, { nome, unidade, quantidade: qtd, precoUnitario: preco, categoriaTributaria: "ALÍQUOTA_PADRÃO" }];
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
    const item = cart[index];
    const produto = produtos.find((p) => p.nome === item.nome && (p.unidade || "un") === item.unidade);
    const disp = produto ? getEstoqueDisponivel(produto) : null;
    if (disp !== null && n > disp) {
      Swal.fire("Estoque insuficiente", `Disponível: ${disp} ${item.unidade}`, "warning");
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
    barcodeInputRef.current?.focus();
  }

  const subtotal = cart.reduce((s, c) => s + c.quantidade * c.precoUnitario, 0);
  const { totalIBS, totalCBS } = totalizarIbsCbs(cart);
  const descNumerico = parseFloat(String(desconto).replace(",", ".")) || 0;
  const descontoValor = tipoDesconto === "percentual" ? subtotal * (descNumerico / 100) : descNumerico;
  const total = Math.max(0, subtotal - descontoValor);
  const precosSalvos = getPrecosSalvos();

  async function finalizarVenda() {
    if (cart.length === 0) {
      Swal.fire("Atenção", "Adicione itens ao carrinho.", "warning");
      return;
    }

    const empresaId = getEmpresaId();
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }

    if (descontoValor > 0) {
      const { value: senha } = await Swal.fire({
        title: "Senha para desconto",
        html: `
          <p style="color:#8b949e;font-size:0.9rem;margin-bottom:12px">Para aplicar desconto de R$ ${descontoValor.toFixed(2)}, informe a senha de quem abriu o caixa:</p>
          <input id="senha-desconto" type="password" class="swal2-input" placeholder="Senha" style="width:100%;margin-top:8px" />
        `,
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        confirmButtonColor: "#20b5a6",
        preConfirm: () => document.getElementById("senha-desconto")?.value || "",
      });
      if (!senha) return;
      try {
        const res = await fetch(`${API_URL}/api/caixa/verificar-senha-abertura`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify({ senha }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Senha incorreta.");
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
        return;
      }
    }

    const { value: formaPgto } = await Swal.fire({
      title: "Forma de pagamento",
      html: `
        <select id="forma-pgto" class="swal2-input" style="width:100%;padding:10px;margin-top:8px">
          <option value="Dinheiro">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="Cartão Débito">Cartão Débito</option>
          <option value="Cartão Crédito">Cartão Crédito</option>
          <option value="Vale">Vale</option>
          <option value="Convênio">Convênio</option>
          <option value="Outro">Outro</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Finalizar venda",
      confirmButtonColor: "#20b5a6",
      preConfirm: () => document.getElementById("forma-pgto")?.value || "Dinheiro",
    });

    if (!formaPgto) return;

    setFinalizando(true);
    try {
      const itens = cart.map((c) => ({
        nome: c.nome,
        unidade: c.unidade || "un",
        quantidade: c.quantidade,
        precoUnitario: c.precoUnitario,
        categoriaTributaria: c.categoriaTributaria || "ALÍQUOTA_PADRÃO",
      }));

      const res = await fetch(`${API_URL}/api/vendas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          empresa: empresaId,
          itens,
          formaPagamento: formaPgto,
          desconto: descontoValor,
          operador: usuarioAtual?.nome || "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detalhes?.join?.("\n") || "Erro ao finalizar venda.");

      // Impressão fiscal: enviar dados ao agente local se configurado
      try {
        const cfgRes = await fetch(`${API_URL}/api/impressora-fiscal?empresa=${encodeURIComponent(empresaId)}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        const cfg = await cfgRes.json().catch(() => ({}));
        if (cfg?.ativo && cfg?.urlAgente) {
          const payload = {
            venda: data.venda,
            itens: data.venda?.itens || itens,
            total,
            formaPagamento: formaPgto,
            nomeFantasia: cfg.nomeFantasia || "",
            cnpj: cfg.cnpj || "",
            endereco: cfg.endereco || "",
          };
          await fetch(cfg.urlAgente.replace(/\/$/, "") + "/imprimir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {}); // falha silenciosa (agente pode estar offline)
        }
      } catch (_) {}

      // NFC-e: emitir se configurado
      let nfceInfo = "";
      try {
        const nfceRes = await fetch(`${API_URL}/api/nfce/config?empresa=${encodeURIComponent(empresaId)}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        const nfceCfg = await nfceRes.json().catch(() => ({}));
        if (nfceCfg?.ativo) {
          const emitRes = await fetch(`${API_URL}/api/nfce/emitir`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
            },
            body: JSON.stringify({
              empresa: empresaId,
              venda: {
                itens: data.venda?.itens || itens,
                total,
                formaPagamento: formaPgto,
                desconto: descontoValor,
                observacoes: "",
              },
              contingencia: false,
            }),
          });
          const emitData = await emitRes.json().catch(() => ({}));
          if (emitData?.sucesso && emitData?.chave) {
            nfceInfo = `<p style="color:#25C19B;font-size:0.9rem">✓ NFC-e emitida — Chave: ${emitData.chave.slice(0, 20)}...</p>`;
          }
        }
      } catch (_) {}

      Swal.fire({
        title: "Venda concluída!",
        html: `
          <p style="color:#8b949e;margin-bottom:8px">Total: R$ ${total.toFixed(2)}</p>
          <p style="color:#8b949e;font-size:0.9rem">Pagamento: ${formaPgto}</p>
          <p style="color:#25C19B;margin-top:12px;font-weight:600">✓ Estoque atualizado automaticamente</p>
          ${nfceInfo}
        `,
        icon: "success",
        confirmButtonColor: "#20b5a6",
      });
      limparVenda();
      carregarDados();
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setFinalizando(false);
    }
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3", minHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
      {/* Topo: leitor + botões */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div
          style={{ ...boxBarcode, flex: "1 1 300px", minWidth: 0 }}
          onClick={() => barcodeInputRef.current?.focus()}
          role="group"
          tabIndex={-1}
          aria-label="Clique para ativar o leitor de código de barras"
        >
          <label style={labelBarcode}>Leitor de código de barras</label>
          <input
            ref={barcodeInputRef}
            type="text"
            autoComplete="off"
            placeholder="Passe o produto no leitor ou digite o código e pressione Enter"
            value={codigoBarrasInput}
            onChange={(e) => setCodigoBarrasInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            style={inputBarcode}
            className="campo-fundo-claro"
            autoFocus
            aria-label="Campo do leitor de código de barras"
          />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setMostrarCatalogo(true)} style={btnBuscarProduto} title="Buscar item no catálogo">
            Buscar produto
          </button>
          <button type="button" onClick={() => setMostrarAvulso(!mostrarAvulso)} style={btnAvulso}>
            + Avulso
          </button>
          <button type="button" onClick={() => navigate("/cardapio-pdv")} style={btnSecundarioPdv} title="Gerenciar Catálogo PDV">
            Catálogo PDV
          </button>
        </div>
      </div>

      {mostrarAvulso && (
        <div style={boxAvulso}>
          <input placeholder="Nome" value={avulso.nome} onChange={(e) => setAvulso((p) => ({ ...p, nome: e.target.value }))} style={inputAvulso} className="campo-fundo-claro" />
          <input placeholder="Preço (R$)" value={avulso.preco} onChange={(e) => setAvulso((p) => ({ ...p, preco: e.target.value }))} style={{ ...inputAvulso, width: 100 }} className="campo-fundo-claro" />
          <input placeholder="Qtd" value={avulso.quantidade} onChange={(e) => setAvulso((p) => ({ ...p, quantidade: e.target.value }))} style={{ ...inputAvulso, width: 70 }} className="campo-fundo-claro" />
          <input placeholder="Un." value={avulso.unidade} onChange={(e) => setAvulso((p) => ({ ...p, unidade: e.target.value }))} style={{ ...inputAvulso, width: 60 }} className="campo-fundo-claro" />
          <button type="button" onClick={adicionarAvulso} style={btnAdd}>Adicionar</button>
        </div>
      )}

      {/* Área principal: resumo da compra em tela cheia */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 300 }}>
        <h3 style={{ margin: "0 0 12px", color: "#e6edf3", fontSize: "1.125rem", fontWeight: 600 }}>
          Itens da venda
        </h3>
        {cart.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: BORDER }}>
            <p style={{ color: "#8b949e", fontSize: "1rem" }}>
              Passe o produto no leitor ou clique em &quot;Buscar produto&quot; para adicionar itens.
            </p>
          </div>
        ) : (
          <>
            <div style={tabelaCart}>
              <div style={tabelaCartHeader}>
                <span style={thCartProduto}>Produto</span>
                <span style={thCartQtd}>Qtd</span>
                <span style={thCartPreco}>Preço un.</span>
                <span style={thCartTotal}>Subtotal</span>
                <span style={thCartAcao} />
              </div>
              {cart.map((item, i) => (
                <div key={i} style={tabelaCartRow}>
                  <div style={tdCartProduto}>
                    <strong>{item.nome}</strong>
                    <span style={{ color: "#8b949e", fontSize: "0.8125rem", marginLeft: 8 }}>{item.unidade}</span>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => alterarQtdCart(i, e.target.value)}
                    style={inputQtdGrande}
                    className="campo-fundo-claro"
                  />
                  <span style={tdCartPreco}>R$ {(item.precoUnitario || 0).toFixed(2)}</span>
                  <span style={tdCartTotal}>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
                  <button type="button" onClick={() => removerDoCart(i)} style={btnRemover} title="Remover">×</button>
                </div>
              ))}
            </div>

            {/* Totais e ações */}
            <div style={barraTotais}>
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <div style={linhaTotal}>
                  <span style={{ color: "#8b949e" }}>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {(totalIBS > 0 || totalCBS > 0) && (
                  <>
                    <div style={linhaTotal}>
                      <span style={{ color: "#8b949e", fontSize: "0.8125rem" }}>IBS (Est./Mun.)</span>
                      <span style={{ fontSize: "0.8125rem" }}>R$ {totalIBS.toFixed(2)}</span>
                    </div>
                    <div style={linhaTotal}>
                      <span style={{ color: "#8b949e", fontSize: "0.8125rem" }}>CBS (Federal)</span>
                      <span style={{ fontSize: "0.8125rem" }}>R$ {totalCBS.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div style={linhaTotal}>
                  <span style={{ color: "#8b949e" }}>Desconto</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.875rem", color: "#8b949e" }}>
                      <input type="radio" name="tipoDesconto" checked={tipoDesconto === "dinheiro"} onChange={() => setTipoDesconto("dinheiro")} />
                      R$
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.875rem", color: "#8b949e" }}>
                      <input type="radio" name="tipoDesconto" checked={tipoDesconto === "percentual"} onChange={() => setTipoDesconto("percentual")} />
                      %
                    </label>
                    <input
                      type="text"
                      placeholder={tipoDesconto === "dinheiro" ? "0,00" : "0"}
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      style={{ ...inputQtd, width: 90, textAlign: "right" }}
                      className="campo-fundo-claro"
                    />
                    {tipoDesconto === "percentual" && descNumerico > 0 && (
                      <span style={{ fontSize: "0.8125rem", color: "#8b949e" }}>= R$ {descontoValor.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div style={{ ...linhaTotal, fontSize: "1.25rem", fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: "#00F2FF" }}>R$ {total.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button type="button" onClick={limparVenda} style={btnLimpar}>Limpar</button>
                  <button type="button" onClick={finalizarVenda} style={btnFinalizar} disabled={finalizando}>
                    {finalizando ? "Finalizando..." : "Finalizar venda"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Buscar produto no catálogo */}
      {mostrarCatalogo && (
        <div style={modalOverlay} onClick={() => setMostrarCatalogo(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#e6edf3", fontSize: "1.25rem" }}>Buscar produto</h3>
              <button type="button" onClick={() => setMostrarCatalogo(false)} style={btnFecharModal}>×</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Nome, código ou código de barras..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ ...inputBusca, flex: "1 1 200px" }}
                className="campo-fundo-claro"
              />
              {categorias.length > 0 && (
                <select value={categoriaSelecionada} onChange={(e) => setCategoriaSelecionada(e.target.value)} style={selectCategoria} className="campo-fundo-claro">
                  <option value="">Todas</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto", border: BORDER, borderRadius: 8 }}>
              {loading ? (
                <p style={{ color: "#8b949e", padding: 24 }}>Carregando...</p>
              ) : produtosFiltrados.length === 0 ? (
                <p style={{ color: "#8b949e", padding: 24 }}>Nenhum produto encontrado.</p>
              ) : (
                produtosFiltrados.map((p) => {
                  const disp = getEstoqueDisponivel(p);
                  const precoPadrao = precosSalvos[p._id] ?? precosSalvos[p.nome] ?? (p.preco != null ? String(p.preco) : "");
                  return (
                    <ProdutoLinha key={p._id || `${p.nome}-${p.unidade}`} produto={p} precoPadrao={precoPadrao} estoqueDisp={disp} onAdicionar={adicionarAoCarrinho} />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProdutoLinha({ produto, precoPadrao, estoqueDisp, onAdicionar }) {
  const [preco, setPreco] = useState(precoPadrao);
  const [qtd, setQtd] = useState("1");

  useEffect(() => {
    setPreco(precoPadrao);
  }, [precoPadrao]);

  const podeAdicionar = estoqueDisp === null || estoqueDisp >= (parseFloat(qtd) || 1);

  return (
    <div style={linhaProduto}>
      <span style={cellNome}>{produto.nome}</span>
      <span style={cellEstoque} title={estoqueDisp === null ? "Sem controle" : `Disponível: ${estoqueDisp}`}>
        {estoqueDisp === null ? "—" : estoqueDisp}
      </span>
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
      <button
        type="button"
        onClick={() => onAdicionar(produto, preco, qtd)}
        style={{ ...btnAdd, opacity: podeAdicionar ? 1 : 0.5, cursor: podeAdicionar ? "pointer" : "not-allowed" }}
        title={podeAdicionar ? "Adicionar" : "Estoque insuficiente"}
        disabled={!podeAdicionar}
      >
        +
      </button>
    </div>
  );
}

const btnBuscarProduto = {
  padding: "12px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9375rem",
};

const tabelaCart = {
  flex: 1,
  border: BORDER,
  borderRadius: 8,
  overflow: "hidden",
  background: "rgba(0,0,0,0.2)",
};

const tabelaCartHeader = {
  display: "grid",
  gridTemplateColumns: "1fr 100px 120px 120px 48px",
  gap: 16,
  padding: "14px 20px",
  background: "rgba(0,0,0,0.4)",
  borderBottom: BORDER,
};

const thCartProduto = { color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thCartQtd = { color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thCartPreco = { color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thCartTotal = { color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thCartAcao = { width: 48 };

const tabelaCartRow = {
  display: "grid",
  gridTemplateColumns: "1fr 100px 120px 120px 48px",
  gap: 16,
  alignItems: "center",
  padding: "14px 20px",
  borderBottom: BORDER,
};

const tdCartProduto = { color: "#e6edf3", fontSize: "1rem" };
const tdCartPreco = { color: "#8b949e", fontSize: "0.9375rem" };
const tdCartTotal = { color: "#e6edf3", fontSize: "0.9375rem", fontWeight: 600 };

const inputQtdGrande = {
  width: "100%",
  maxWidth: 100,
  padding: "10px 12px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.3)",
  color: "#e6edf3",
  fontSize: "1rem",
};

const barraTotais = {
  marginTop: 20,
  padding: 20,
  background: "rgba(0,0,0,0.25)",
  border: BORDER,
  borderRadius: 8,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 24,
};

const modalContent = {
  background: "#0d1117",
  border: BORDER,
  borderRadius: 12,
  padding: 24,
  maxWidth: 600,
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
};

const btnFecharModal = {
  background: "transparent",
  border: "none",
  color: "#8b949e",
  fontSize: "1.5rem",
  cursor: "pointer",
  padding: "0 8px",
  lineHeight: 1,
};

const boxBarcode = {
  marginBottom: 20,
  padding: 16,
  background: "linear-gradient(135deg, rgba(0,242,255,0.08), rgba(32,181,166,0.05))",
  border: "1px solid rgba(0,242,255,0.2)",
  borderRadius: 8,
  cursor: "text",
};

const labelBarcode = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#00F2FF",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputBarcode = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 6,
  border: "1px solid rgba(0,242,255,0.3)",
  background: "rgba(0,0,0,0.3)",
  color: "#e6edf3",
  fontSize: "1.125rem",
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

const linkBtn = { background: "none", border: "none", color: "#00F2FF", cursor: "pointer", textDecoration: "underline" };

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

const thProduto = { flex: "1 1 200px", color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thEstoque = { width: 42, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thPreco = { width: 90, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };
const thQtd = { width: 50, color: "#8b949e", fontSize: "0.8125rem", fontWeight: 600 };

const linhaProduto = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: BORDER,
};

const cellNome = { flex: "1 1 200px", color: "#e6edf3", fontSize: "0.9375rem", minWidth: 0 };
const cellEstoque = { width: 42, color: "#8b949e", fontSize: "0.8125rem", flexShrink: 0, textAlign: "center" };

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

const totais = { borderTop: BORDER, paddingTop: 16 };

const linhaTotal = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
  fontSize: "1rem",
  color: "#e6edf3",
};

const botoesAcao = { display: "flex", gap: 12, marginTop: 20 };

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
