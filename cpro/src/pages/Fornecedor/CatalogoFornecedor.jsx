// src/pages/Comprador/CatalogoFornecedor.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";


const AZUL_FUNDO = "#0F2D3F";
const VERDE = "#25C19B";
const SALMAO = "#FF8882";
const LARANJA = "#F6A46A";
const TEXTO_ESCURO = "#1F2E45";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const SEC_CORES = [
  "Seção",
  "Bebidas",
  "Bebidas Destiladas",
  "Cervejas",
  "Chás",
  "Estoque Seco",
  "Frutos do Mar",
  "Hortifruti",
  "Proteínas e Congelados",
  "Congelados",
  "Laticínios",
  "Higiene e Limpeza",
  "Mercearia",
  "Padaria / Confeitaria",
  "Outros",
];

// ---------- utils ----------
const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseBooleanCell = (val) => {
  const v = normalize(String(val));
  if (!v) return false;
  if (["sim", "yes", "true", "1", "x", "ok"].includes(v)) return true;
  if (v.startsWith("s")) return true; // s -> sim
  return false;
};

const rowShape = (r) => ({
  secao: r.secao || "",
  produto: r.produto || "",
  marca: r.marca || "",
  gramatura: r.gramatura || "",
  similar: !!r.similar,
  codigo: r.codigo || "",
  preco: r.preco || 0,
});

// tenta mapear um título para um campo
const mapHeaderToField = (h) => {
  const t = normalize(h);

  // Seção / Grupo / Categoria
  if (/(secao|seçao|seção|sessao|grupo|categoria|setor|departamento|tipo|familia)/.test(t))
    return "secao";

  // Produto
  if (/(produto|item|descricao|descri|nome|nome do produto|descricao produto)/.test(t))
    return "produto";

  // Marca
  if (/(marca|brand|fabricante)/.test(t)) return "marca";

  // Gramatura / Unidade / Embalagem
  if (/(gramatura|unidade|peso|volume|tamanho|embalagem|quantidade|qtd)/.test(t))
    return "gramatura";
  
  // Preço
  if (/(preco|preço|valor|price|r\$|venda|custo)/.test(t))
    return "preco";

  // Similar
  if (/(aceita.*similar|similar|permite.*similar|substituicao|substituição|similares)/.test(t))
    return "similar";

  // Código
  if (/(codigo|c[oó]digo|cod|c[oó]d|sku|ref|referencia|referência|c[oó]d produto|cod produto)/.test(t))
    return "codigo";

  return null;
};

// encontra a linha de cabeçalho: varre primeiras N linhas e escolhe a que tiver "produto" + (secao/marca/gramatura/codigo/similar)
function detectarLinhaCabecalho(matriz, maxScan = 12) {
const metas = ["produto", "secao", "marca", "gramatura", "preco", "similar", "codigo"];  for (let i = 0; i < Math.min(maxScan, matriz.length); i++) {
    const row = (matriz[i] || []).map((h) => normalize(h));

    // ignora linhas vazias ou com "MODELO DE TABELA"
    const linhaStr = row.join(" ");
    if (!linhaStr || /modelo\s+de\s+tabela/.test(linhaStr)) continue;

    // mapeia quantos campos reconhecíveis existem
    let temProduto = false;
    let score = 0;

    row.forEach((h) => {
      const f = mapHeaderToField(h);
      if (f) {
        score++;
        if (f === "produto") temProduto = true;
      }
    });

    // regra: precisa ter "produto" + ao menos outro campo
    if (temProduto && score >= 2) {
      return i;
    }
  }
  return -1;
}

export default function CatalogoFornecedor() {
  const navigate = useNavigate();

  const [empresaKey, setEmpresaKey] = useState("catalogo_fornecedor");
  const [linhas, setLinhas] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroSecao, setFiltroSecao] = useState("todas");

  // Campos do "Adicionar Novo"
  const [novo, setNovo] = useState({
    secao: "",
    produto: "",
    marca: "",
    gramatura: "",
    similar: true,
    codigo: "",
    preco: ""
  });

 useEffect(() => {
  async function carregarCatalogo() {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    const empresa = usuario?.nome || usuario?.empresa || "";
    const fornecedorId = usuario?._id;
    
    if (!empresa || !fornecedorId) {
      Swal.fire("Erro", "Usuário sem empresa associada.", "error");
      return;
    }

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
    const token = sessionStorage.getItem("token");

    try {
      // 1) Buscar clientes do fornecedor
      const resClientes = await fetch(`${API_URL}/api/fornecedores/${fornecedorId}/clientes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      let clientesIds = [];
      if (resClientes.ok) {
        const dataClientes = await resClientes.json();
        clientesIds = Array.isArray(dataClientes.clientes) 
          ? dataClientes.clientes.map((c) => c._id || c.compradorId).filter(Boolean)
          : [];
      }

      // Se não tiver clientes selecionados, mostrar mensagem
      if (clientesIds.length === 0) {
        Swal.fire({
          title: "Nenhum cliente selecionado",
          text: "Selecione seus clientes na página 'Clientes' para ver os produtos no catálogo.",
          icon: "info",
          confirmButtonText: "OK",
        });
        setLinhas([]);
        return;
      }

      // 2) Buscar catálogos apenas dos clientes selecionados
      const todosItens = [];
      for (const clienteId of clientesIds) {
        try {
          const resCatalogo = await fetch(`${API_URL}/api/catalogos/${clienteId}`);
          if (resCatalogo.ok) {
            const catalogoData = await resCatalogo.json();
            const lista = Array.isArray(catalogoData.catalogo) 
              ? catalogoData.catalogo 
              : Array.isArray(catalogoData) 
              ? catalogoData 
              : [];
            
            lista.forEach((item) => {
              todosItens.push({
                secao: item.secao || "",
                nome: item.nome || item.produto || "",
                marca: item.marca || "",
                unidade: item.unidade || item.gramatura || "",
                similar: item.similar !== false,
                codigo: item.codigo || "",
              });
            });
          }
        } catch (err) {
          console.warn(`Erro ao carregar catálogo do cliente ${clienteId}:`, err);
        }
      }

      // Remover duplicatas (mesmo nome + unidade)
      const norm = (s = "") => String(s).toLowerCase().trim();
      const chave = (nome, unidade) => `${norm(nome)}::${norm(unidade)}`;
      const mapaItens = new Map();
      
      todosItens.forEach((item) => {
        const key = chave(item.nome, item.unidade);
        if (!mapaItens.has(key)) {
          mapaItens.set(key, item);
        }
      });

      const itensUnicos = Array.from(mapaItens.values());

      // 3) Buscar preços do fornecedor
      let meusPrecos = {};
      try {
        const resFornecedor = await fetch(`${API_URL}/api/catalogos-fornecedores/${encodeURIComponent(empresa)}`);
        if (resFornecedor.ok) {
          const dataF = await resFornecedor.json();
          const listaF = Array.isArray(dataF.catalogo) ? dataF.catalogo : [];
          listaF.forEach((item) => {
            meusPrecos[chave(item.nome, item.unidade)] = Number(item.preco) || 0;
          });
        }
      } catch (_) {}

      // 4) Mesclar: produtos dos clientes + preços do fornecedor
      const adaptado = itensUnicos.map((item) => {
        const key = chave(item.nome, item.unidade);
        return {
          secao: item.secao || "",
          produto: item.nome || "",
          marca: item.marca || "",
          gramatura: item.unidade || "",
          similar: item.similar !== false,
          codigo: item.codigo || "",
          preco: meusPrecos[key] ?? "",
        };
      });

      setLinhas(adaptado);
    } catch (err) {
      console.error("❌ Erro ao carregar catálogo:", err);
      Swal.fire("Erro", "Não foi possível carregar o catálogo do servidor.", "error");
      setLinhas([]);
    }
  }

  carregarCatalogo();
}, []);

 // Salvar no estado (ordenado)
const salvarLocal = (arr) => {
  const ordenado = [...arr].sort((a, b) => {
    const s = normalize(a.secao).localeCompare(normalize(b.secao));
    if (s !== 0) return s;
    return normalize(a.produto).localeCompare(normalize(b.produto));
  });
  setLinhas(ordenado);
};
  // 🔹 Importar Excel (fixo para formato "Clube Piraquê")
async function importarArquivo(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const matr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Procura o índice da linha que contém "Seção"
    const headerIndex = matr.findIndex(
      (row) =>
        row.some((cell) =>
          normalize(cell).startsWith("secao") ||
          normalize(cell).startsWith("seção")
        )
    );

    if (headerIndex === -1) {
      Swal.fire("Erro", "Não encontrei cabeçalho com 'Seção'.", "error");
      return;
    }

    // Extrai apenas as linhas de dados abaixo do cabeçalho
    const dataRows = matr.slice(headerIndex + 1).filter((r) => r.some(Boolean));

    if (!dataRows.length) {
      Swal.fire("Nada importado", "Nenhuma linha válida encontrada.", "warning");
      return;
    }

    // Índices fixos conforme a planilha
    const rows = dataRows.map((r) => ({
      secao: r[0]?.toString().trim() || "",
      produto: r[1]?.toString().trim() || "",
      marca: r[2]?.toString().trim() || "",
      gramatura: r[3]?.toString().trim() || "",
      similar: normalize(r[4]) === "sim",
      codigo: r[5]?.toString().trim() || "",
      preco: parseFloat((r[6] || "0").toString().replace(",", ".")) || 0, // 👈 novo campo
    }));

    const validos = rows.filter((r) => r.produto);
    if (!validos.length) {
      Swal.fire("Nada importado", "Nenhuma linha de produto encontrada.", "warning");
      return;
    }

    const combinado = dedupMerge(linhas, validos);
    salvarLocal(combinado);

    Swal.fire({
      title: "Importação concluída!",
      text: `Foram importados ${validos.length} itens com sucesso.`,
      icon: "success",
      timer: 2500,
    });
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Erro na importação",
      "Ocorreu um erro ao ler a planilha. Verifique o formato e tente novamente.",
      "error"
    );
  } finally {
    e.target.value = "";
  }
}

 // Deduplicação por (produto + gramatura + codigo)
function dedupMerge(base, novos) {
  const keyOf = (r) =>
    `${normalize(r.produto)}|${normalize(r.gramatura)}|${normalize(r.codigo)}`;
  const mapa = new Map();

  base.forEach((r) => mapa.set(keyOf(r), r));

  novos.forEach((r) => {
    const existente = mapa.get(keyOf(r)) || {};
    // preserva preço anterior se o novo não tiver
    const preco = r.preco !== undefined && r.preco !== "" ? r.preco : existente.preco || "";
    mapa.set(keyOf(r), { ...existente, ...r, preco });
  });

  return Array.from(mapa.values());
}
  // Adicionar manual
  function adicionarLinha() {
    if (!novo.produto.trim()) {
      Swal.fire("Produto obrigatório", "Informe ao menos o nome do produto.", "info");
      return;
    }
    salvarLocal([...linhas, rowShape(novo)]);
    setNovo({
      secao: "",
      produto: "",
      marca: "",
      gramatura: "",
      similar: true,
      codigo: "",
      preco: "",
    });
  }

  // Editar célula inline
  function edit(index, field, value) {
    const cp = [...linhas];
    cp[index] = { ...cp[index], [field]: field === "similar" ? !!value : value };
    setLinhas(cp);
  }

  // Remover linha
  function remover(index) {
    const cp = linhas.filter((_, i) => i !== index);
    salvarLocal(cp);
  }

 async function salvar() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  const empresa = (usuario?.nome || usuario?.empresa || "").toString().trim();
  if (!empresa) {
    Swal.fire("Erro", "Usuário sem empresa associada.", "error");
    return;
  }

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  try {
    // Só envia itens com nome (produto) preenchido — o backend exige nome obrigatório
    const catalogo = linhas
      .filter((r) => (r.produto || "").toString().trim())
      .map((r) => ({
        nome: (r.produto || "").toString().trim(),
        secao: (r.secao || "").toString().trim(),
        marca: (r.marca || "").toString().trim(),
        unidade: (r.gramatura || "").toString().trim(),
        similar: r.similar !== false,
        codigo: (r.codigo || "").toString().trim(),
        preco: Number(r.preco) || 0,
      }));

    const payload = {
      empresa,
      comprador: "",
      usuarioEmail: usuario.email || "",
      catalogo,
    };

    const res = await fetch(`${API_URL}/api/catalogos-fornecedores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      const text = await res.text();
      if (text) data = JSON.parse(text);
    } catch (_) {}

    if (!res.ok) {
      throw new Error(data.error || `Erro ${res.status} ao salvar catálogo`);
    }

    Swal.fire("Catálogo salvo!", "Dados enviados ao servidor com sucesso.", "success");
  } catch (err) {
    console.error("Erro ao salvar catálogo:", err);
    let msg = err?.message || "Não foi possível enviar o catálogo ao servidor.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = "Não foi possível conectar ao servidor. Verifique se o backend está rodando em " + (process.env.REACT_APP_API_URL || "http://localhost:4001");
    }
    Swal.fire("Erro", msg, "error");
  }
}
// Excluir todo o catálogo (apaga apenas os preços salvos do fornecedor; o master permanece)
async function excluirTudo() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  const empresa = usuario?.nome || usuario?.empresa || "";
  if (!empresa) {
    Swal.fire("Erro", "Usuário sem empresa associada.", "error");
    return;
  }

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  const confirmar = await Swal.fire({
    title: "Excluir todo o catálogo?",
    text: "Esta ação vai remover todos os produtos, e não poderá ser desfeita.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir tudo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d33",
  });

  if (!confirmar.isConfirmed) return;

  try {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    const res = await fetch(`${API_URL}/api/catalogos-fornecedores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa,
        comprador: "",
        usuarioEmail: usuario?.email || "",
        catalogo: [],
      }),
    });

    if (!res.ok) throw new Error("Erro ao limpar catálogo");

    setLinhas((prev) => prev.map((l) => ({ ...l, preco: "" })));
    Swal.fire("Preços limpos", "Seus preços foram removidos. Os itens do catálogo master permanecem.", "success");
  } catch (err) {
    console.error("Erro ao excluir catálogo:", err);
    Swal.fire("Erro", "Não foi possível limpar o catálogo no servidor.", "error");
  }
}
  // Exportar XLSX
  function exportarXlsx() {
    const aoa = [
      ["Seção", "Produto", "Marca", "Gramatura", "Aceita Marca Similar", "Código produto"],
      ...linhas.map((r) => [
        r.secao,
        r.produto,
        r.marca,
        r.gramatura,
        r.similar ? "Sim" : "Não",
        r.codigo,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
    XLSX.writeFile(wb, "catalogo.xlsx");
  }

  // Filtros / busca
  const secoesDinamicas = useMemo(() => {
    const s = new Set(linhas.map((l) => l.secao).filter(Boolean));
    return ["Todas as seções", ...Array.from(s)];
  }, [linhas]);

  const filtrados = useMemo(() => {
    const q = normalize(busca);
    return linhas.filter((r) => {
      const okSecao =
        filtroSecao === "todas" || normalize(r.secao) === normalize(filtroSecao);
      const okBusca =
        !q ||
        normalize(r.produto).includes(q) ||
        normalize(r.marca).includes(q) ||
        normalize(r.codigo).includes(q);
      return okSecao && okBusca;
    });
  }, [linhas, busca, filtroSecao]);

  const produtosPorSecao = useMemo(() => {
    const grupos = {};
    filtrados.forEach((r) => {
      const secao = (r.secao || "Sem Seção").trim();
      if (!grupos[secao]) grupos[secao] = [];
      grupos[secao].push(r);
    });
    return Object.keys(grupos)
      .sort((a, b) => (a === "Sem Seção" ? 1 : b === "Sem Seção" ? -1 : a.localeCompare(b)))
      .map((secao) => ({
        secao,
        produtos: grupos[secao].sort((a, b) =>
          normalize(a.produto).localeCompare(normalize(b.produto))
        ),
      }));
  }, [filtrados]);

  // ---------- UI ----------
  return (
    <div className="layout-content-inner" style={{ color: "#e6edf3" }}>
      <main style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%" }}>
          {/* Ações */}
          <div style={card}>
            <div style={acoesRow}>
              <label style={fileBtn}>
                📥 Importar (.xlsx/.xls)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={importarArquivo}
                  style={{ display: "none" }}
                />
              </label>

              <button onClick={salvar} style={btnPrimary}>
                💾 Salvar
              </button>

              <button onClick={exportarXlsx} style={btnSecondary}>
                ⬇️ Exportar XLSX
              </button>

              <button onClick={adicionarLinha} style={btnAdd}>
                ＋ Adicionar Linha
              </button>

                <button onClick={excluirTudo} style={btnDanger}>
    🗑 Excluir Tudo
  </button>
            </div>

            {/* Aviso de estrutura esperada */}
            <div style={{ marginTop: 8, fontSize: 12, color: "#8b949e" }}>
              Estrutura esperada:{" "}
              <b>Seção | Produto | Marca | Gramatura | Aceita marca similar | Código produto</b>
            </div>

            {/* Filtros */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <select
                value={filtroSecao}
                onChange={(e) => setFiltroSecao(e.target.value)}
                style={input}
                className="campo-fundo-claro"
              >
                <option value="todas">Todas as seções</option>
                {secoesDinamicas
                  .filter((s) => s !== "Todas as seções")
                  .map((s, i) => (
                    <option key={i} value={s}>
                      {s || "—"}
                    </option>
                  ))}
              </select>

              <input
                placeholder="Buscar por produto, marca ou código…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ ...input, flex: 1 }}
                className="campo-fundo-claro"
              />

              <button
                onClick={() => {
                  setBusca("");
                  setFiltroSecao("todas");
                }}
                style={btnGhostDark}
              >
                Limpar filtro
              </button>
            </div>
          </div>

       {/* Adicionar novo */}
<div style={{ ...card, marginTop: 16 }}>
  <div style={{ marginBottom: 10, fontWeight: 700, color: "#e6edf3" }}>
    ＋ Adicionar Novo Item
  </div>

  {/* Cabeçalho dos campos */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.2fr 2fr 1.4fr 1.4fr 1fr",
      gap: 8,
      marginBottom: 4,
      fontSize: 13,
      fontWeight: 600,
      color: "#8b949e",
    }}
  >
    <div>Seção</div>
    <div>Produto</div>
    <div>Marca</div>
    <div>Gramatura / Unidade</div>
    <div>Preço (R$)</div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.2fr 2fr 1.4fr 1.4fr 1fr",
      gridTemplateRows: "auto auto",
      gap: 8,
      boxSizing: "border-box",
      width: "100%",
      alignItems: "center",
    }}
  >
    {/* Primeira linha */}
    <select
      value={novo.secao}
      onChange={(e) => setNovo({ ...novo, secao: e.target.value })}
      style={input}
      className="campo-fundo-claro"
    >
      <option value="">Selecione</option>
      {SEC_CORES.map((s, i) => (
        <option key={i} value={s}>
          {s}
        </option>
      ))}
    </select>

    <input
      placeholder="Produto"
      value={novo.produto}
      onChange={(e) => setNovo({ ...novo, produto: e.target.value })}
      style={input}
      className="campo-fundo-claro"
    />

    <input
      placeholder="Marca (vazio = qualquer)"
      value={novo.marca}
      onChange={(e) => setNovo({ ...novo, marca: e.target.value })}
      style={input}
      className="campo-fundo-claro"
    />

    <input
      placeholder="Ex: 1kg, 500ml, unidade"
      value={novo.gramatura}
      onChange={(e) => setNovo({ ...novo, gramatura: e.target.value })}
      style={input}
      className="campo-fundo-claro"
    />
    
    <input
    placeholder="Preço (R$)"
    type="number"
    value={novo.preco}
    onChange={(e) => setNovo({ ...novo, preco: e.target.value })}
    style={input}
    className="campo-fundo-claro"
  />

    {/* Cabeçalho da segunda linha */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "0.9fr 1.4fr 1.7fr",
        gap: 8,
        marginTop: 12,
        fontSize: 13,
        fontWeight: 600,
        color: "#8b949e",
        gridColumn: "1 / -1",
      }}
    >
      <div>Aceita Similar</div>
      <div>Código</div>
      <div></div>
    </div>

    {/* Segunda linha de inputs */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.06)",
        border: BORDER,
        borderRadius: 10,
        height: 40,
        boxSizing: "border-box",
      }}
    >
      <input
        type="checkbox"
        checked={novo.similar}
        onChange={(e) => setNovo({ ...novo, similar: e.target.checked })}
        style={{ width: 18, height: 40, transform: "translateY(1px)" }}
      />
    </div>

    <input
      placeholder="Código (opcional)"
      value={novo.codigo}
      onChange={(e) => setNovo({ ...novo, codigo: e.target.value })}
      style={input}
      className="campo-fundo-claro"
    />

    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button onClick={adicionarLinha} style={btnAddRow}>
        Adicionar
      </button>
    </div>
  </div>
</div>
      {/* Lista por seções (padrão do catálogo do comprador) */}
            {produtosPorSecao.length === 0 ? (
              <div style={{ ...card, marginTop: 16, padding: 40, textAlign: "center", color: "#8b949e", fontStyle: "italic" }}>
                Nenhum item encontrado.
              </div>
            ) : (
              produtosPorSecao.map((grupo) => (
                <div key={grupo.secao} style={{ ...card, marginTop: 16, padding: 0 }}>
                  <div style={secaoHeader}>
                    <h3 style={secaoTitle}>Seção: {grupo.secao}</h3>
                    <span style={secaoCount}>{grupo.produtos.length} {grupo.produtos.length === 1 ? "produto" : "produtos"}</span>
                  </div>
                  <div style={tableHeader}>
                    <div style={{ ...tableHeaderCell, flex: "1.2" }}>Seção</div>
                    <div style={{ ...tableHeaderCell, flex: "2" }}>Produto</div>
                    <div style={{ ...tableHeaderCell, flex: "1.2" }}>Marca</div>
                    <div style={{ ...tableHeaderCell, flex: "1" }}>Gramatura</div>
                    <div style={{ ...tableHeaderCell, flex: "0.9" }}>Preço (R$)</div>
                    <div style={{ ...tableHeaderCell, flex: "0.6", textAlign: "center" }}>Similar</div>
                    <div style={{ ...tableHeaderCell, flex: "1" }}>Código</div>
                    <div style={{ ...tableHeaderCell, flex: "0.5", textAlign: "center" }}>Ações</div>
                  </div>
                  {grupo.produtos.map((r, i) => {
                    const idx = linhas.indexOf(r);
                    return (
                      <div key={`${grupo.secao}-${r.produto}-${i}`} style={tRow}>
                        <div style={{ ...tableCell, flex: "1.2" }}>
                          <select
                            value={r.secao}
                            onChange={(e) => edit(idx, "secao", e.target.value)}
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                          >
                            <option value="">—</option>
                            {SEC_CORES.map((s, j) => (
                              <option key={j} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ ...tableCell, flex: "2" }}>
                          <input
                            value={r.produto}
                            onChange={(e) => edit(idx, "produto", e.target.value)}
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                            placeholder="Produto"
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "1.2" }}>
                          <input
                            value={r.marca}
                            onChange={(e) => edit(idx, "marca", e.target.value)}
                            placeholder="Marca"
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "1" }}>
                          <input
                            value={r.gramatura}
                            onChange={(e) => edit(idx, "gramatura", e.target.value)}
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                            placeholder="Ex: 1kg"
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "0.9" }}>
                          <input
                            type="number"
                            placeholder="Preço"
                            value={r.preco ?? ""}
                            onChange={(e) => edit(idx, "preco", e.target.value === "" ? "" : parseFloat(e.target.value || "0"))}
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "0.6", justifyContent: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!r.similar}
                            onChange={(e) => edit(idx, "similar", e.target.checked)}
                            style={{ width: 18, height: 18, cursor: "pointer" }}
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "1" }}>
                          <input
                            value={r.codigo}
                            onChange={(e) => edit(idx, "codigo", e.target.value)}
                            style={{ ...cellInput, width: "100%" }}
                            className="campo-fundo-claro"
                            placeholder="Código"
                          />
                        </div>
                        <div style={{ ...tableCell, flex: "0.5", justifyContent: "center" }}>
                          <button onClick={() => remover(idx)} style={btnTrash} title="Excluir">🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
        </div>
      </main>
    </div>
  );
}
/* ===================== estilos (padrão escuro como catálogo comprador) ===================== */
const card = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};
const acoesRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};
const input = {
  height: 40,
  borderRadius: 10,
  border: BORDER,
  padding: "0 12px",
  outline: "none",
  background: "rgba(255,255,255,0.08)",
  color: "#e6edf3",
  boxSizing: "border-box",
  fontSize: 14,
  lineHeight: "normal",
};
const fileBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(255,255,255,0.1)",
  color: "#e6edf3",
  border: "1px dashed rgba(255,255,255,0.2)",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
};
const btnPrimary = {
  background: VERDE,
  color: "#0B1C26",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnSecondary = {
  background: "rgba(255,255,255,0.1)",
  color: "#e6edf3",
  border: BORDER,
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnAdd = {
  background: LARANJA,
  color: "#1E1E1E",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnGhost = {
  background: "rgba(255,255,255,0.1)",
  color: "#e6edf3",
  border: BORDER,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};
const btnGhostDark = {
  background: "rgba(255,255,255,0.1)",
  color: "#e6edf3",
  border: BORDER,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};
const btnAddRow = {
  background: "#0EA5E9",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  height: 40,
  padding: "0 16px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnTrash = {
  background: SALMAO,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
};
const secaoHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "rgba(255,255,255,0.05)",
  borderBottom: BORDER,
  borderRadius: "12px 12px 0 0",
};
const secaoTitle = {
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "#e6edf3",
  margin: 0,
};
const secaoCount = {
  fontSize: "0.875rem",
  color: "#8b949e",
  fontWeight: 500,
};
const tableHeader = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.03)",
  borderBottom: BORDER,
  gap: 8,
};
const tableHeaderCell = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#8b949e",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const tRow = {
  display: "flex",
  alignItems: "center",
  padding: "10px 16px",
  borderBottom: BORDER,
  gap: 8,
  background: CARD_BG,
};
const tableCell = {
  display: "flex",
  alignItems: "center",
  minHeight: 44,
  boxSizing: "border-box",
};
const cell = {
  display: "flex",
  alignItems: "center",
  padding: "0 8px",
  minHeight: 44,
  boxSizing: "border-box",
  justifyContent: "center",
  height: 44,
};
const cellInput = {
  background: "#fff",
  border: BORDER,
  borderRadius: 8,
  padding: "0 12px",
  minHeight: 44,
  outline: "none",
  height: 44,
  lineHeight: "44px",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
  flexShrink: 1,
  color: "#1a1a1a",
};
const btnDanger = {
  background: "#EF4444",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};