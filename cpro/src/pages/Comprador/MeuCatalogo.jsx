// src/pages/Comprador/MeuCatalogo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

// Seções dinâmicas - serão geradas a partir dos itens cadastrados

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
  const metas = ["produto", "secao", "marca", "gramatura", "similar", "codigo"];

  for (let i = 0; i < Math.min(maxScan, matriz.length); i++) {
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

export default function MeuCatalogo() {
  const navigate = useNavigate();

  const [linhas, setLinhas] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroSecao, setFiltroSecao] = useState("todas");
  const saveTimeoutRef = useRef(null);
  const latestLinhasRef = useRef([]);

  // Campos do "Adicionar Novo"
  const [novo, setNovo] = useState({
    secao: "",
    produto: "",
    marca: "",
    gramatura: "",
    similar: true,
    codigo: "",
  });

 useEffect(() => {
  async function carregarCatalogo() {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
    if (!empresaId) {
      Swal.fire("Erro", "Usuário sem empresa associada.", "error");
      return;
    }

    const base = process.env.REACT_APP_API_URL || "";
    const url = `${base || (typeof window !== "undefined" ? window.location.origin : "")}/api/catalogos/${empresaId}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          Swal.fire("Catálogo não encontrado", "Você ainda não possui um catálogo salvo.", "info");
          setLinhas([]);
          return;
        }
        throw new Error("Erro ao carregar catálogo");
      }

      const data = await res.json();
      console.log("📦 Catálogo carregado:", data);

      // ✅ Corrigido: backend retorna { empresa, catalogo: [...] }
      const lista = Array.isArray(data.catalogo) ? data.catalogo : [];

      // mapeia pro formato que a tabela entende
      const adaptado = lista.map((item) => ({
        secao: item.secao || "",
        produto: item.nome || "",
        marca: item.marca || "",
        gramatura: item.unidade || "",
        similar: item.similar ?? true,
        codigo: item.codigo || "",
      }));

      setLinhas(adaptado);
    } catch (err) {
      console.error("❌ Erro ao carregar catálogo:", err);
      Swal.fire("Erro", "Não foi possível carregar o catálogo do servidor.", "error");
      setLinhas([]);
    }
  }

  carregarCatalogo();
}, []);

  const API_BASE_CAT = process.env.REACT_APP_API_URL || "";

  async function persistirCatalogo(linhasToSave, silent = false) {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
    if (!empresaId || !Array.isArray(linhasToSave)) return false;
    const catalogo = linhasToSave
      .filter((r) => (r.produto || "").toString().trim())
      .map((r) => ({
        nome: (r.produto || "").toString().trim(),
        secao: (r.secao || "").toString().trim(),
        marca: (r.marca || "").toString().trim(),
        unidade: (r.gramatura || "").toString().trim(),
        similar: r.similar !== false,
        codigo: (r.codigo || "").toString().trim(),
        preco: 0,
      }));
    const url = `${API_BASE_CAT || (typeof window !== "undefined" ? window.location.origin : "")}/api/catalogos/${empresaId}`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogo }),
      });
      let data = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } catch (_) {}
      if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao salvar catálogo`);
      if (!silent) Swal.fire("Catálogo salvo", "As alterações foram gravadas. Estoque e demais páginas serão atualizados.", "success");
      return true;
    } catch (err) {
      console.error("Erro ao salvar catálogo:", err);
      if (!silent) Swal.fire("Erro", err?.message || "Não foi possível salvar o catálogo.", "error");
      return false;
    }
  }

  const DEBOUNCE_MS = 600;

  function schedulePersist(arr) {
    latestLinhasRef.current = arr;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      persistirCatalogo(latestLinhasRef.current, true);
    }, DEBOUNCE_MS);
  }

  function flushPersist() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      if (latestLinhasRef.current.length >= 0) {
        persistirCatalogo(latestLinhasRef.current, true);
      }
    }
  }

  const [salvando, setSalvando] = useState(false);
  async function salvarCatalogoAgora() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    latestLinhasRef.current = linhas;
    setSalvando(true);
    await persistirCatalogo(linhas, false);
    setSalvando(false);
  }

  // Salvar no estado (ordenado) e persistir: imediato em add/remove, debounce em edição
  const salvarLocal = (arr, persistirImediato = false) => {
    const ordenado = [...arr].sort((a, b) => {
      const s = normalize(a.secao).localeCompare(normalize(b.secao));
      if (s !== 0) return s;
      return normalize(a.produto).localeCompare(normalize(b.produto));
    });
    setLinhas(ordenado);
    if (persistirImediato) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      latestLinhasRef.current = ordenado;
      persistirCatalogo(ordenado, true);
    } else {
      schedulePersist(ordenado);
    }
  };

  useEffect(() => {
    return () => { flushPersist(); };
  }, []);

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
    }));

    const validos = rows.filter((r) => r.produto);
    if (!validos.length) {
      Swal.fire("Nada importado", "Nenhuma linha de produto encontrada.", "warning");
      return;
    }

    const combinado = dedupMerge(linhas, validos);
    salvarLocal(combinado, true);

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
    novos.forEach((r) =>
      mapa.set(keyOf(r), { ...(mapa.get(keyOf(r)) || {}), ...r })
    );
    return Array.from(mapa.values());
  }

  // Adicionar manual (salva imediatamente para refletir no estoque)
  function adicionarLinha() {
    if (!novo.produto.trim()) {
      Swal.fire("Produto obrigatório", "Informe ao menos o nome do produto.", "info");
      return;
    }
    salvarLocal([...linhas, rowShape(novo)], true);
    setNovo({
      secao: "",
      produto: "",
      marca: "",
      gramatura: "",
      similar: true,
      codigo: "",
    });
  }

  // Editar célula inline (auto-salva após debounce)
  function edit(index, field, value) {
    const cp = [...linhas];
    cp[index] = { ...cp[index], [field]: field === "similar" ? !!value : value };
    setLinhas(cp);
    schedulePersist(cp);
  }

  // Remover linha (salva imediatamente)
  function remover(index) {
    const cp = linhas.filter((_, i) => i !== index);
    salvarLocal(cp, true);
  }

// Excluir todo o catálogo
async function excluirTudo() {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
  const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
  if (!empresaId) {
    Swal.fire("Erro", "Usuário sem empresa associada.", "error");
    return;
  }

  const base = process.env.REACT_APP_API_URL || "";
  const urlDelete = `${base || (typeof window !== "undefined" ? window.location.origin : "")}/api/catalogos/${empresaId}`;

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
    const res = await fetch(urlDelete, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Erro ao excluir catálogo");

    setLinhas([]);
    Swal.fire("Catálogo excluído", "Todos os produtos foram removidos com sucesso.", "success");
  } catch (err) {
    console.error("Erro ao excluir catálogo:", err);
    Swal.fire("Erro", "Não foi possível excluir o catálogo do servidor.", "error");
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

  // Seções dinâmicas baseadas nos itens cadastrados
  const secoesDisponiveis = useMemo(() => {
    const s = new Set(linhas.map((l) => l.secao).filter(Boolean));
    return Array.from(s).sort();
  }, [linhas]);

  // Filtros / busca
  const secoesDinamicas = useMemo(() => {
    return ["Todas as seções", ...secoesDisponiveis];
  }, [secoesDisponiveis]);

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

  // Agrupar produtos por seção
  const produtosPorSecao = useMemo(() => {
    const grupos = {};
    filtrados.forEach((r) => {
      const secao = r.secao || "Sem Seção";
      if (!grupos[secao]) grupos[secao] = [];
      grupos[secao].push(r);
    });
    // Ordenar seções e produtos dentro de cada seção
    return Object.keys(grupos)
      .sort((a, b) => {
        if (a === "Sem Seção") return 1;
        if (b === "Sem Seção") return -1;
        return a.localeCompare(b);
      })
      .map((secao) => ({
        secao,
        produtos: grupos[secao].sort((a, b) =>
          normalize(a.produto).localeCompare(normalize(b.produto))
        ),
      }));
  }, [filtrados]);

  // ---------- UI ----------
  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box" }}>
      <main style={{ padding: 24, display: "flex", justifyContent: "center", minHeight: "60px" }}>
        <div style={{ width: "100%" }}>
          {/* Ações */}
          <div style={card}>
            <div style={acoesRow}>
              <button
                type="button"
                onClick={salvarCatalogoAgora}
                disabled={salvando}
                style={btnSalvarCatalogo}
              >
                {salvando ? "Salvando…" : "💾 Salvar catálogo"}
              </button>

              <label style={fileBtn}>
                📥 Importar (.xlsx/.xls)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={importarArquivo}
                  style={{ display: "none" }}
                />
              </label>

              <button onClick={exportarXlsx} style={btnSecondary}>
                ⬇️ Exportar XLSX
              </button>

                <button onClick={excluirTudo} style={btnDanger}>
    🗑 Excluir Tudo
  </button>
            </div>

            {/* Aviso de estrutura esperada */}
            <div style={{ marginTop: 12, fontSize: "0.8125rem", color: "#8b949e" }}>
              Estrutura esperada:{" "}
              <b style={{ color: "#e6edf3" }}>Seção | Produto | Marca | Gramatura | Aceita marca similar | Código produto</b>
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
  <div style={{ marginBottom: 16, fontWeight: 700, color: "#e6edf3", fontSize: "1.125rem" }}>
    ＋ Adicionar Novo Item
  </div>

  {/* Cabeçalho dos campos */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.2fr 2fr 1.4fr 1.4fr",
      gap: 8,
      marginBottom: 8,
      fontSize: "0.8125rem",
      fontWeight: 600,
      color: "#8b949e",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    }}
  >
    <div>Seção</div>
    <div>Produto</div>
    <div>Marca</div>
    <div>Gramatura / Unidade</div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.2fr 2fr 1.4fr 1.4fr",
      gridTemplateRows: "auto auto",
      gap: 8,
      boxSizing: "border-box",
      width: "100%",
      alignItems: "center",
    }}
  >
    {/* Primeira linha - Seção com datalist para permitir criar novas */}
    <div style={{ position: "relative" }}>
      <input
        list="secoes-list"
        value={novo.secao}
        onChange={(e) => setNovo({ ...novo, secao: e.target.value })}
        placeholder="Digite ou selecione a seção"
        style={input}
        className="campo-fundo-claro"
      />
      <datalist id="secoes-list">
        {secoesDisponiveis.map((s, i) => (
          <option key={i} value={s} />
        ))}
      </datalist>
    </div>

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

    {/* Cabeçalho da segunda linha */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "0.9fr 1.4fr 1.7fr",
        gap: 8,
        marginTop: 12,
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: "#8b949e",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
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
        background: "#fff",
        border: BORDER,
        borderRadius: 8,
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
      {/* Datalist global para seções */}
      <datalist id="secoes-list-table">
        {secoesDisponiveis.map((s, j) => (
          <option key={j} value={s} />
        ))}
      </datalist>

      {/* Lista por Seções */}
      {produtosPorSecao.length === 0 ? (
        <div style={{ ...card, marginTop: 16, padding: 40, textAlign: "center", color: "#8b949e", fontStyle: "italic" }}>
          Nenhum item encontrado.
        </div>
      ) : (
        produtosPorSecao.map((grupo) => (
          <div key={grupo.secao} style={{ ...card, marginTop: 16, padding: 0 }}>
            {/* Cabeçalho da Seção */}
            <div style={secaoHeader}>
              <h3 style={secaoTitle}>Seção: {grupo.secao}</h3>
              <span style={secaoCount}>{grupo.produtos.length} {grupo.produtos.length === 1 ? "produto" : "produtos"}</span>
            </div>

            {/* Cabeçalho da Tabela */}
            <div style={tableHeader}>
              <div style={{ ...tableHeaderCell, flex: "1.5" }}>Seção</div>
              <div style={{ ...tableHeaderCell, flex: "2" }}>Nome do Produto</div>
              <div style={{ ...tableHeaderCell, flex: "1" }}>Gramatura</div>
              <div style={{ ...tableHeaderCell, flex: "1.2" }}>Marca</div>
              <div style={{ ...tableHeaderCell, flex: "0.8" }}>Similar</div>
              <div style={{ ...tableHeaderCell, flex: "1" }}>Código</div>
              <div style={{ ...tableHeaderCell, flex: "0.5", textAlign: "center" }}>Ações</div>
            </div>

            {/* Produtos da Seção */}
            {grupo.produtos.map((r, i) => {
              const idx = linhas.indexOf(r); // índice real
              return (
                <div key={`${r.produto}-${i}`} style={tRow}>
                  {/* Seção */}
                  <div style={{ ...tableCell, flex: "1.5" }}>
                    <input
                      list="secoes-list-table"
                      value={r.secao}
                      onChange={(e) => edit(idx, "secao", e.target.value)}
                      onBlur={flushPersist}
                      style={{ ...cellInput, width: "100%" }}
                      className="campo-fundo-claro"
                      placeholder="Seção"
                    />
                  </div>

                  {/* Produto */}
                  <div style={{ ...tableCell, flex: "2" }}>
                    <input
                      value={r.produto}
                      onChange={(e) => edit(idx, "produto", e.target.value)}
                      onBlur={flushPersist}
                      style={{ ...cellInput, width: "100%" }}
                      className="campo-fundo-claro"
                      placeholder="Nome do produto"
                    />
                  </div>

                  {/* Gramatura */}
                  <div style={{ ...tableCell, flex: "1" }}>
                    <input
                      value={r.gramatura}
                      onChange={(e) => edit(idx, "gramatura", e.target.value)}
                      onBlur={flushPersist}
                      style={{ ...cellInput, width: "100%" }}
                      className="campo-fundo-claro"
                      placeholder="Ex: 1kg, 500ml"
                    />
                  </div>

                  {/* Marca */}
                  <div style={{ ...tableCell, flex: "1.2" }}>
                    <input
                      value={r.marca}
                      onChange={(e) => edit(idx, "marca", e.target.value)}
                      onBlur={flushPersist}
                      placeholder="vazio = qualquer marca"
                      style={{ ...cellInput, width: "100%" }}
                      className="campo-fundo-claro"
                    />
                  </div>

                  {/* Similar */}
                  <div style={{ ...tableCell, flex: "0.8", justifyContent: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!r.similar}
                      onChange={(e) => edit(idx, "similar", e.target.checked)}
                      onBlur={flushPersist}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>

                  {/* Código */}
                  <div style={{ ...tableCell, flex: "1" }}>
                    <input
                      value={r.codigo}
                      onChange={(e) => edit(idx, "codigo", e.target.value)}
                      onBlur={flushPersist}
                      style={{ ...cellInput, width: "100%" }}
                      className="campo-fundo-claro"
                      placeholder="Código"
                    />
                  </div>

                  {/* Ações */}
                  <div style={{ ...tableCell, flex: "0.5", justifyContent: "center" }}>
                    <button onClick={() => remover(idx)} style={btnTrash} title="Excluir">
                      🗑
                    </button>
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
/* ===================== estilos ===================== */
const card = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 20,
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
  borderRadius: 8,
  border: BORDER,
  padding: "0 12px",
  outline: "none",
  background: "#fff",
  color: "#1a1a1a",
  boxSizing: "border-box",
  fontSize: "0.9375rem",
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
const btnSalvarCatalogo = {
  background: VERDE,
  color: "#0B1C26",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
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
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.25)",
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
  marginBottom: 0,
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
  padding: "12px 16px",
  borderTop: BORDER,
  background: CARD_BG,
  gap: 8,
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