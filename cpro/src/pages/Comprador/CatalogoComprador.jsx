import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { XMLParser } from "fast-xml-parser";
import Swal from "sweetalert2";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const WORK_KEY = "resumo_cotacao_working_v1";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";
const { getDocument, GlobalWorkerOptions, version: pdfjsVersion } = pdfjsLib;
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
function normalizarUnidade(item) {
  let nomeOriginal = (item?.nome || "").trim();
  let nome = nomeOriginal;
  const unidadesEncontradas = [];

  nome = nome.replace(
    /(\d+)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(GR|G|ML|L|KG)\b/gi,
    function (_m, q1, q2, u) {
      unidadesEncontradas.push(
        `${String(q1)}x${String(q2)}${String(u).toUpperCase()}`
      );
      return "";
    }
  );

  nome = nome.replace(
    /(\d+(?:[.,]\d+)?)\s*(KG|G|GR|L|ML)\b/gi,
    function (_m, q1, u) {
      unidadesEncontradas.push(`${String(q1)}${String(u).toUpperCase()}`);
      return "";
    }
  );

  nome = nome.replace(/[-–—]+/g, " ").replace(/\s{2,}/g, " ").trim();

  if (unidadesEncontradas.length === 0) {
    return { ...item, nome: nomeOriginal, unidade: item?.unidade || "" };
  }

  const unidadeFinal = [unidadesEncontradas.join(" "), item?.unidade]
    .filter(Boolean)
    .join(" ")
    .trim();

  return { ...item, nome: nome.trim(), unidade: unidadeFinal };
}
export default function CatalogoComprador() {
  const [preview, setPreview] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [busca, setBusca] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [novoProduto, setNovoProduto] = useState({ nome: "", unidade: "" });
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [estoqueMap, setEstoqueMap] = useState({});
  const [secaoPorNormNome, setSecaoPorNormNome] = useState({});

  /** Carrega a lista sempre a partir do estoque: itens abaixo do mínimo (sugestão de cotação para abastecimento). */
  async function carregarTudo() {
    try {
      const usuarioLogado = JSON.parse(sessionStorage.getItem("usuario"));
      if (!usuarioLogado) {
        Swal.fire("Erro", "Usuário não está logado.", "error");
        navigate("/");
        return;
      }

      const empresaId = usuarioLogado.compradorId || (usuarioLogado.tipo === "comprador" ? usuarioLogado._id : null);
      if (!empresaId) {
        Swal.fire("Erro", "Usuário sem empresa associada.", "error");
        return;
      }

      setUsuarioAtual(usuarioLogado);
      setEmpresa(empresaId);

      const respEstoque = await fetch(`${API_URL}/api/estoque/${empresaId}`);
      const dataEstoque = await respEstoque.json();
      const listaEstoque = Array.isArray(dataEstoque) ? dataEstoque : [];

      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const map = {};
      for (const it of listaEstoque) {
        map[norm(it.nome)] = {
          quantidade: Number(it.quantidade) || 0,
          minimo: Number(it.minimo) || 0,
          maximo: Number(it.maximo) || 0,
          emTransito: Number(it.emTransito) || 0,
        };
      }
      setEstoqueMap(map);

      // Buscar catálogo para obter seções (igual ao Meu Catálogo) e facilitar busca por grupo
      let secaoMap = {};
      try {
        const respCatalogo = await fetch(`${API_URL}/api/catalogos/${empresaId}`);
        if (respCatalogo.ok) {
          const dataCat = await respCatalogo.json();
          const listaCat = Array.isArray(dataCat?.catalogo) ? dataCat.catalogo : [];
          for (const it of listaCat) {
            const nomeNorm = norm((it.nome || it.produto || "").trim());
            if (nomeNorm) secaoMap[nomeNorm] = (it.secao || "").trim() || "Sem Seção";
          }
        }
      } catch (_) {}
      setSecaoPorNormNome(secaoMap);

      // Itens abaixo do mínimo: (quantidade + emTransito) <= minimo → listar para cotação
      // Preenche automaticamente até o máximo quando min/máx estão definidos na página Estoque; demais ficam em 0 para o comprador ajustar
      const abaixoDoMinimo = listaEstoque
        .map((it) => {
          const qtd = Number(it.quantidade) || 0;
          const min = Number(it.minimo) || 0;
          const max = Number(it.maximo) || 0;
          const emTransito = Number(it.emTransito) || 0;
          const total = qtd + emTransito;
          if (total > min) return null;
          const qtyInicial = max > 0 ? Math.max(0, max - qtd - emTransito) : 0;
          const nomeTrim = (it.nome || "").trim();
          const secao = secaoMap[norm(nomeTrim)] || "Sem Seção";
          return {
            nome: nomeTrim,
            unidade: (it.unidade || "un").trim(),
            qty: qtyInicial,
            emFalta: true,
            totalEstoque: total,
            secao: secao || "Sem Seção",
          };
        })
        .filter(Boolean);

      setCatalogo(abaixoDoMinimo);
    } catch (err) {
      console.error("❌ Erro ao carregar estoque:", err);
      Swal.fire("Erro", "Falha ao carregar estoque. Tente novamente.", "error");
    }
  }
  useEffect(() => {
  
  carregarTudo();
}, []);

  // ---------- SALVAR (apenas estado local; a lista vem do estoque e não sobrescreve o catálogo) ----------
  function salvarCatalogo(atualizado) {
    const ordenado = [...atualizado].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
    );
    setCatalogo(ordenado);
  }


  function handleAddProduto(e) {
    e.preventDefault();
    if (!novoProduto.nome.trim()) return alert("Informe o nome do produto.");
    const prod = {
      ...normalizarUnidade(novoProduto),
      secao: secaoPorNormNome[normNome(novoProduto.nome)] || "Sem Seção",
    };
    salvarCatalogo([...(catalogo || []), prod]);
    setNovoProduto({ nome: "", unidade: "" });
  }

  function handleUpdate(index, field, value) {
    const novo = [...catalogo];
    novo[index] = { ...novo[index], [field]: value };
    salvarCatalogo(novo);
  }

  function handleDeleteProduto(index) {
    const novo = catalogo.filter((_it, i) => i !== index);
    salvarCatalogo(novo);
  }

  function handleEditarQuantidade(index, valor) {
    const novoCatalogo = [...catalogo];
    novoCatalogo[index].qty = valor >= 0 ? valor : 0;
    salvarCatalogo(novoCatalogo);
  }

  function adicionarMontante(index) {
    const novoCatalogo = [...catalogo];
    const item = novoCatalogo[index];
    let multiplicador = 10;
    const unidade = (item.unidade || "").toLowerCase();
    if (unidade.includes("cx")) multiplicador = 12;
    if (unidade.includes("fardo")) multiplicador = 10;
    if (unidade.includes("pacote")) multiplicador = 8;
    item.qty = (item.qty || 0) + multiplicador;
    salvarCatalogo(novoCatalogo);
  }

  const normNome = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

function getStatus(produto) {
  const item = estoqueMap[normNome(produto.nome)];
  if (!item) return "#999";
  const atual = item.quantidade || 0;
  const minimo = item.minimo || 0;
  const emTransito = item.emTransito || 0;
  const total = atual + emTransito;
  if (total <= minimo) return "#e74c3c";
  if (total <= minimo * 1.5) return "#f1c40f";
  return "#27ae60";
}

  // ---------- IMPORTAÇÃO ----------
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = (file.name || "").toLowerCase();

    if (name.endsWith(".txt")) {
      const text = await file.text();
      processarTexto(text);
      return;
    }

    if (name.endsWith(".pdf")) {
      const buf = await file.arrayBuffer();
      const pdf = await getDocument({ data: buf }).promise;
      const linhas = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const rows = new Map();
        for (const it of content.items) {
          const y = Math.round(it.transform[5]);
          const arr = rows.get(y) || [];
          arr.push({ x: it.transform[4], str: it.str });
          rows.set(y, arr);
        }
        const pageLines = [...rows.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, arr]) =>
            arr.sort((a, b) => a.x - b.x).map((t) => t.str).join(" ").trim()
          )
          .filter(Boolean);
        linhas.push(...pageLines);
      }
      processarLinhasDeTexto(linhas);
      return;
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sh = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(sh, { header: 1 }) || [];
      if (!linhas.length) return;
      const headers = (linhas[0] || []).map((h) =>
        String(h || "").toLowerCase().trim()
      );
      let idxNome = headers.findIndex(
        (h) => h.includes("produto") || h.includes("descr")
      );
      let idxUnidade = headers.findIndex(
        (h) =>
          h.includes("unid") ||
          h.includes("kg") ||
          h.includes("ml") ||
          h.includes("l")
      );
      if (idxNome >= 0) linhas.shift();
      const itens = linhas
        .filter((ln) => ln && ln.length > 0)
        .map((ln) => ({
          nome: String(idxNome >= 0 ? ln[idxNome] : ln[0] || "").trim(),
          unidade: idxUnidade >= 0 ? ln[idxUnidade] : ln[1],
        }))
        .filter((it) => it.nome && !/c[oó]digo|produto/i.test(it.nome));
      setPreview(itens);
      return;
    }

    if (name.endsWith(".xml")) {
      const text = await file.text();
      const parser = new XMLParser();
      const xml = parser.parse(text);
      const produtos = [];
      if (xml && xml.produtos) {
        const lista = Array.isArray(xml.produtos.item)
          ? xml.produtos.item
          : [xml.produtos.item];
        lista.forEach((p) => {
          produtos.push({ nome: p.nome || "", unidade: p.unidade || "" });
        });
      }
      if (produtos.length > 0) {
        setPreview(produtos);
        alert(`${produtos.length} produtos lidos do XML com sucesso!`);
      } else {
        alert("Nenhum produto encontrado no arquivo XML.");
      }
      return;
    }
    alert("Formato não suportado. Use .xlsx, .xls, .pdf ou .txt.");
  }

  function processarLinhasDeTexto(linhas) {
    let base = [
      ...new Set(
        (linhas || [])
          .map((l) => l.replace(/\s+/g, " ").trim())
          .filter((l) => l && !/c[oó]digo|produto/i.test(l))
      ),
    ];
    base = base.flatMap((l) =>
      l
        .split(
          /\s{3,}|•|·|–|—|;(?=\s*[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ0-9])|,(?=\s*[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ0-9]{2,})/
        )
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const itens = base.map((nomeCompleto) => {
      const unidadeRegex =
        /\b\d+(?:[.,]\d+)?\s?(?:KG|G|GR|L|ML|UN|UNID|CXS|CX|PCT|PACOTE|BARRA|SACO|PC)\b/i;
      const unidadeEncontrada = nomeCompleto.match(unidadeRegex);
      const unidade = unidadeEncontrada ? unidadeEncontrada[0].trim() : "";
      const unidadeNormalizada = unidade.replace(",", ".");
      const nomeSemUnidade = unidade
        ? nomeCompleto.replace(new RegExp(unidadeRegex, "gi"), "").trim()
        : nomeCompleto.trim();
      return { nome: nomeSemUnidade, unidade: unidadeNormalizada };
    });
    setPreview(itens);
    alert(`${itens.length} produtos identificados com sucesso!`);
  }

  function processarTexto(texto) {
    if (!texto) return;
    texto = texto.replace(/\s+/g, " ").trim();
    let linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linhas.length < 5) {
      linhas = texto
        .split(
          /\s(?=\d+(?:\s?(?:KG|G|GR|L|ML|UN|UNID|CX|PCT|PACOTE|BARRA|SACO|PC)\b)|,|;)/gi
        )
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const itens = [...new Set(linhas)]
      .filter((l) => l.length > 1 && !/c[oó]digo|produto/i.test(l))
      .map((l) => {
        const unidade =
          l.match(
            /\d+(?:\s?(?:KG|G|GR|L|ML|UN|UNID|CX|PCT|PACOTE|BARRA|SACO|PC)\b)/i
          )?.[0] || "";
        return { nome: l.trim(), unidade };
      });
    setPreview(itens);
    alert(`${itens.length} produtos identificados com sucesso!`);
  }

  function confirmarImportacao() {
    if (!preview.length) return alert("Nenhuma lista para importar.");
    const itens = preview.map(normalizarUnidade);
    const novo = (catalogo || []).concat(itens);
    salvarCatalogo(novo);
    setPreview([]);
    alert(`${itens.length} Produtos importados com sucesso!`);
  }

  async function handleDeleteTodos() {
  if (!window.confirm("Tem certeza que deseja excluir todos os produtos?")) return;
  setCatalogo([]);
  if (!empresa) return;
  try {
    await fetch(`${API_URL}/api/catalogos/${empresa}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogo: [] }),
    });
    Swal.fire("Sucesso", "Catálogo excluído com sucesso!", "success");
  } catch (e) {
    console.error(e);
    Swal.fire("Erro", "Não foi possível excluir o catálogo no servidor.", "error");
  }
}
 
  function processarTexto(texto) {
    if (!texto) return;

    // Limpa caracteres duplicados e espaços extras
    texto = texto.replace(/\s+/g, " ").trim();

    // Se o arquivo tiver quebras de linha reais (TXT, XLSX, etc.)
    let linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Se quase não há quebras de linha, tenta detectar separações automáticas
    if (linhas.length < 5) {
      linhas = texto
        // Quebra antes de unidades ou vírgulas (mas mantém o texto completo do produto)
        .split(/\s(?=\d+(?:\s?(?:KG|G|GR|L|ML|UN|UNID|CX|PCT|PACOTE|BARRA|SACO|PC)\b)|,|;)/gi)
        .map(s => s.trim())
        .filter(Boolean);
    }

    // Remove duplicatas e itens genéricos
    const itens = [...new Set(linhas)]
      .filter(l => l.length > 1 && !/c[oó]digo|produto/i.test(l))
      .map(l => {
        // Captura a unidade (se houver)
        const unidade = (l.match(/\d+(?:\s?(?:KG|G|GR|L|ML|UN|UNID|CX|PCT|PACOTE|BARRA|SACO|PC)\b)/i)?.[0] || "").trim();
        return {
          nome: l.trim(),
          unidade,
        };
      });

    setPreview(itens);
    alert(`${itens.length} produtos identificados com sucesso!`);
  }

  function confirmarImportacao() {
    if (!preview.length) {
      alert("Nenhuma lista para importar.");
      return;
    }
    const itens = preview.map((it) => ({
      ...normalizarUnidade(it),
      secao: secaoPorNormNome[normNome(it.nome)] || "Sem Seção",
    }));
    const novo = (catalogo || []).concat(itens);
    salvarCatalogo(novo);
    setPreview([]);
    alert(`${itens.length} Produtos importados com sucesso!`);
  }

  const [filtroSecao, setFiltroSecao] = useState("todas");

  const secoesDisponiveis = useMemo(() => {
    const s = new Set((catalogo || []).map((p) => (p.secao || "Sem Seção").trim()).filter(Boolean));
    return ["Todas as seções", ...Array.from(s).sort((a, b) => (a === "Sem Seção" ? 1 : b === "Sem Seção" ? -1 : a.localeCompare(b)))];
  }, [catalogo]);

  const filtrados = useMemo(() => {
    const q = (busca || "").toLowerCase().trim();
    const byBusca = (catalogo || []).filter((p) => !q || (p.nome || "").toLowerCase().includes(q));
    if (filtroSecao === "todas" || filtroSecao === "Todas as seções") return byBusca;
    return byBusca.filter((p) => (p.secao || "Sem Seção").trim() === filtroSecao);
  }, [catalogo, busca, filtroSecao]);

  const produtosPorSecao = useMemo(() => {
    const grupos = {};
    filtrados.forEach((p) => {
      const secao = (p.secao || "Sem Seção").trim();
      if (!grupos[secao]) grupos[secao] = [];
      grupos[secao].push(p);
    });
    return Object.keys(grupos)
      .sort((a, b) => (a === "Sem Seção" ? 1 : b === "Sem Seção" ? -1 : a.localeCompare(b)))
      .map((secao) => ({
        secao,
        produtos: grupos[secao].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt", { sensitivity: "base" })),
      }));
  }, [filtrados]);
  // ---------- RENDER ----------
  return (
    <div style={{ width: "100%", maxWidth: "none", margin: 0, padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <p style={{ marginBottom: 16, color: "#8b949e", fontSize: "0.95rem" }}>
          Itens abaixo do estoque mínimo. As quantidades são preenchidas automaticamente até o máximo para itens com mínimo e máximo definidos na página Estoque; os demais ficam em zero para você ajustar. Clique em &quot;Gerar Resumo&quot; quando terminar.
        </p>
        <div style={tableCard}>
          {/* Linha 1 - Ir para Estoque */}
          <div style={{ marginBottom: 10, textAlign: "left" }}>
          
          </div>

          {/* Linha 2 - Gerar Resumo */}
          <div style={{ marginBottom: 15, textAlign: "right" }}>
            <button
              onClick={async () => {
  const selecionados = catalogo.filter((p) => (p.qty || 0) > 0);
  if (selecionados.length === 0) {
    Swal.fire("Aviso", "Selecione ao menos um produto para cotar.", "info");
    return;
  }

  const comQuantidadeZero = catalogo.filter((p) => (p.qty || 0) === 0);
  if (comQuantidadeZero.length > 0) {
    const confirmar = await Swal.fire({
      title: "Produtos com estoque baixo",
      html: `Existem <strong>${comQuantidadeZero.length} produto(s)</strong> com quantidade zero que <strong>não entrarão no pedido</strong>. Deseja fazer o pedido mesmo assim?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, fazer pedido",
      cancelButtonText: "Cancelar",
    });
    if (!confirmar.isConfirmed) return;
  }

  try {
    const novosItens = selecionados.map((p) => ({
      nome: p.nome,
      unidade: p.unidade,
      qtd: p.qty,
    }));

    const resp = await fetch(`${API_URL}/api/itens-cotacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprador: empresa, itens: novosItens }),
    });

    if (!resp.ok) throw new Error("Erro ao salvar cotação");

    Swal.fire({
      title: "Cotação gerada!",
      text: `${novosItens.length} produto(s) enviados para o resumo.`,
      icon: "success",
      confirmButtonText: "Ver Resumo",
    }).then(() => navigate("/resumo-cotacao"));
  } catch (err) {
    console.error(err);
    Swal.fire("Erro", "Falha ao enviar cotação ao servidor.", "error");
  }
}}

              style={btnPrimario}
            >
              Gerar Resumo
            </button>
          </div>

          {/* Linha 3 - Buscar produto e filtrar por seção */}
          <div style={{ marginBottom: 15, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={inputBusca}
              className="campo-fundo-claro"
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8b949e", fontSize: "0.9375rem" }}>
              <span>Seção:</span>
              <select
                value={filtroSecao === "todas" ? "todas" : filtroSecao}
                onChange={(e) => setFiltroSecao(e.target.value === "todas" ? "todas" : e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: BORDER,
                  background: CARD_BG,
                  color: "#e6edf3",
                  minWidth: 180,
                }}
                className="campo-fundo-claro"
              >
                {secoesDisponiveis.map((s) => (
                  <option key={s} value={s === "Todas as seções" ? "todas" : s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Linha 4 - Importar arquivo */}
          <div style={{ marginBottom: 20 }}>
            <input 
              type="file" 
              onChange={handleImportFile}
              style={{
                padding: "8px",
                borderRadius: 8,
                border: BORDER,
                background: CARD_BG,
                color: "#e6edf3",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Pré-visualização */}
          {preview.length > 0 && (
            <div style={previewBox}>
              <h3 style={{ color: "#e6edf3", marginBottom: 12 }}>Pré-visualização ({preview.length} itens)</h3>
              {preview.map((it, i) => (
                <p key={i} style={{ color: "#8b949e", marginBottom: 4 }}>{it.nome}</p>
              ))}
              <button onClick={confirmarImportacao} style={btnAdd}>
                Confirmar Importação
              </button>
              <button
                onClick={() => {
                  setPreview([]);
                  alert("Importação cancelada.");
                }}
                style={btnCancelarImport}
              >
                ❌ Cancelar Importação
              </button>
            </div>
          )}

          {/* Adicionar manual */}
          <form onSubmit={handleAddProduto} style={formAdd}>
            <input
              style={inputNome}
              type="text"
              placeholder="Nome do produto"
              value={novoProduto.nome}
              onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
              className="campo-fundo-claro"
            />
            <input
              style={inputUnidade}
              type="text"
              placeholder="Unidade"
              value={novoProduto.unidade}
              onChange={(e) => setNovoProduto({ ...novoProduto, unidade: e.target.value })}
              className="campo-fundo-claro"
            />
            <button type="submit" style={btnAdd}>+</button>
          </form>

          <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleDeleteTodos} style={btnExcluirTodos}>
              Excluir Todos
            </button>
          </div>

          {/* Lista de produtos agrupada por seção (como no Meu Catálogo) */}
          {filtrados.length === 0 ? (
            <div style={emptyBox}>
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div style={lista}>
              {produtosPorSecao.map((grupo) => (
                <div key={grupo.secao} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: "8px 8px 0 0",
                      border: BORDER,
                      borderBottom: "none",
                      fontWeight: 600,
                      color: "#e6edf3",
                      fontSize: "1rem",
                    }}
                  >
                    Seção: {grupo.secao} — {grupo.produtos.length} {grupo.produtos.length === 1 ? "produto" : "produtos"}
                  </div>
                  {grupo.produtos.map((p) => {
                    const i = (catalogo || []).indexOf(p);
                    if (i < 0) return null;
                    return (
                      <div
                        key={`${grupo.secao}-${p.nome}-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px 16px",
                          borderRadius: 0,
                          background: CARD_BG,
                          borderLeft: BORDER,
                          borderRight: BORDER,
                          borderBottom: BORDER,
                        }}
                      >
                        <input
                          value={p.nome}
                          onChange={(e) => handleUpdate(i, "nome", e.target.value)}
                          style={colNome}
                          className="campo-fundo-claro"
                        />

                        <span
                          title={`Ir para o estoque de ${p.nome}`}
                          onClick={() =>
                            (window.location.href = `/estoque?produto=${encodeURIComponent(p.nome)}`)
                          }
                          style={{
                            display: "inline-block",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: getStatus(p),
                            marginRight: 6,
                            cursor: "pointer",
                          }}
                        ></span>

                        <input
                          value={p.unidade || ""}
                          onChange={(e) => handleUpdate(i, "unidade", e.target.value)}
                          style={colUnidade}
                          className="campo-fundo-claro"
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={p.qty || 0}
                            onChange={(e) => handleEditarQuantidade(i, Number(e.target.value))}
                            style={qtyInput}
                            className="campo-fundo-claro"
                          />
                          <button onClick={() => adicionarMontante(i)} style={btnMontante}>
                            +Cx
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteProduto(i)}
                          style={btnDelete}
                          type="button"
                          title="Excluir produto"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="#fff"
                          >
                            <path d="M9 3V4H4V6H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
const pageOuter = {
  background: "#0F2D3F",             // 🔹 fundo novo
  minHeight: "100vh",
  color: "#fff",
};
const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#0F2D3F",
  height: 66,                        // ajuste a altura aqui se quiser
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
};
const topLeft = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};
const helloText = {
  fontSize: "1rem",
  opacity: 0.95,
};
const btnSair = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const mainWrap = {
  width: "100%",
  margin: "24px 0 40px",
  padding: "0 12px 40px",
};
const tableCard = {
  width: "100%",
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  padding: 20,
  color: "#e6edf3",
};
const titleNew = {
  textAlign: "center",
  color: "#ffffff",
  margin: "8px 0 16px",
  fontSize: "3rem",
  fontWeight: 700,
};
const btnVoltar = {
  background: "#FF8882",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
};
const btnIrEstoque = {
  background: "#25C19B",
  color: "#162232",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnPrimario = {
  background: "#25C19B",
  color: "#0B1C26",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
};
const inputBusca = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: BORDER,
  fontSize: "0.9375rem",
  background: "#fff",
  color: "#1a1a1a",
};
const previewBox = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 10,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  padding: 16,
  marginBottom: 12,
  color: "#e6edf3",
};
const btnCancelarImport = {
  background: "#FF8882",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  margin: "4px",
};
const formAdd = {
  display: "flex",
  gap: 8,
  marginBottom: 12,
  alignItems: "center",
};
const inputNome = {
  flex: 3,
  padding: "10px 12px",
  borderRadius: 8,
  border: BORDER,
  background: "#fff",
  color: "#1a1a1a",
};
const inputUnidade = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 8,
  border: BORDER,
  textAlign: "center",
  background: "#fff",
  color: "#1a1a1a",
};
const btnAdd = {
  background: "#FF8882",
  color: "#162232",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnExcluirTodos = {
  background: "#F6A46A",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
  marginTop: 8,
};
const lista = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 10,
};
const colNome = {
  flex: 3,
  border: BORDER,
  borderRadius: 8,
  background: "#fff",
  padding: "8px 12px",
  color: "#1a1a1a",
};
const colUnidade = {
  flex: 1,
  border: BORDER,
  borderRadius: 8,
  background: "#fff",
  textAlign: "center",
  padding: "8px 12px",
  color: "#1a1a1a",
};
const qtyInput = {
  width: 90,
  textAlign: "center",
  borderRadius: 8,
  border: BORDER,
  padding: "8px 10px",
  fontWeight: "bold",
  background: "#fff",
  color: "#1a1a1a",
};
const btnMontante = {
  background: "#25C19B",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnDelete = {
  width: 34,
  height: 34,
  background: "#FF8882",
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const emptyBox = {
  background: CARD_BG,
  border: BORDER,
  padding: 20,
  borderRadius: 10,
  textAlign: "center",
  color: "#8b949e",
  fontStyle: "italic",
};