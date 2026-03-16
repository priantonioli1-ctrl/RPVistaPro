// Cotação para abastecimento: produtos ordenados por menor valor (abatendo ICMS)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

function normUnit(u = "") {
  u = u.toLowerCase().trim();
  const map = {
    un: "un", unid: "un", unidade: "un", pc: "un", pcs: "un",
    pct: "pct", pacote: "pct", pac: "pct",
    cx: "cx", cxs: "cx", caixa: "cx",
    kg: "kg", kgs: "kg", g: "g", gr: "g", l: "l", lt: "l", lts: "l", ml: "ml",
  };
  u = u.replace(/\d+.*$/, "").replace(/[^a-z]/g, "");
  return map[u] || u;
}

function nomesParecidos(nomeA, nomeB) {
  if (!nomeA || !nomeB) return false;
  const limpar = (str) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const a = limpar(nomeA);
  const b = limpar(nomeB);
  if (a === b) return true;
  const palavrasA = new Set(a.split(" "));
  const palavrasB = new Set(b.split(" "));
  const intersecao = [...palavrasA].filter((p) => palavrasB.has(p));
  return intersecao.length / Math.max(palavrasA.size, palavrasB.size) >= 0.9;
}

export default function CotacaoAbastecimento() {
  const [itens, setItens] = useState([]);
  const [naoEncontrados, setNaoEncontrados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
        const empresaId = usuario?.compradorId || usuario?.empresa || (usuario?.tipo === "comprador" ? usuario?._id : null);

        if (!empresaId) {
          setItens([]);
          setNaoEncontrados([]);
          setCarregando(false);
          return;
        }

        // Busca do estoque: itens abaixo do mínimo ou zerados
        let listaEstoque = [];
        try {
          const respEstoque = await fetch(`${BASE_URL}/api/estoque/${empresaId}`);
          if (respEstoque.ok) {
            const dataEstoque = await respEstoque.json();
            listaEstoque = Array.isArray(dataEstoque) ? dataEstoque : [];
          }
        } catch (_) {}

        // Itens abaixo do mínimo: (quantidade + emTransito) <= minimo — inclui zerados
        const cotacao = listaEstoque
          .map((it) => {
            const qtd = Number(it.quantidade) || 0;
            const min = Number(it.minimo) ?? 0;
            const max = Number(it.maximo) || 0;
            const emTransito = Number(it.emTransito) || 0;
            const total = qtd + emTransito;
            if (total > min) return null;
            const qtyCotar = max > 0 ? Math.max(1, max - qtd - emTransito) : 1;
            return {
              nome: (it.nome || "").trim(),
              unidade: (it.unidade || "un").trim(),
              qtd: qtyCotar,
            };
          })
          .filter(Boolean);

        if (cotacao.length === 0) {
          setItens([]);
          setNaoEncontrados([]);
          setCarregando(false);
          return;
        }

        let catalogoLista = [];
        try {
          const resp = await fetch(`${BASE_URL}/api/catalogos-fornecedores?comDisponibilidade=1`);
          if (resp.ok) {
            catalogoLista = await resp.json();
            catalogoLista = Array.isArray(catalogoLista) ? catalogoLista : [];
          }
        } catch (_) {}

        const fornecedores = catalogoLista
          .filter((f) => f.empresa && Array.isArray(f.catalogo))
          .map((f) => ({
            nome: f.empresa,
            aliquota: f.aliquota != null ? Number(f.aliquota) : null,
            lista: f.catalogo.map((item) => ({
              nome: (item.nome || "").trim(),
              unidade: (item.unidade || "").trim() || "un",
              preco: Number(item.preco) || 0,
            })),
          }));

        const ofertasPorProduto = {};
        const naoEncontradosLocal = [];

        for (const item of cotacao) {
          const ofertasItem = [];
          for (const f of fornecedores) {
            let p = f.lista.find(
              (x) =>
                nomesParecidos(x.nome, item.nome) &&
                (!normUnit(item.unidade) || normUnit(x.unidade) === normUnit(item.unidade))
            );
            if (!p) p = f.lista.find((x) => nomesParecidos(x.nome, item.nome));
            if (p && p.preco > 0) {
              const total = (p.preco || 0) * (item.qtd || 1);
              const aliquota = f.aliquota ?? 0;
              const valorSemICMSUnit = aliquota != null
                ? p.preco / (1 + aliquota / 100)
                : p.preco;
              const valorSemICMSTotal = aliquota != null
                ? total / (1 + aliquota / 100)
                : total;
              ofertasItem.push({
                nome: item.nome,
                unidade: item.unidade,
                qtd: item.qtd,
                fornecedor: f.nome,
                precoUnit: p.preco,
                aliquota,
                valorSemICMSUnit,
                total,
                valorSemICMSTotal,
              });
            }
          }
          if (ofertasItem.length === 0) {
            naoEncontradosLocal.push(item);
          } else {
            const melhor = ofertasItem.sort((a, b) => (a.valorSemICMSTotal || 0) - (b.valorSemICMSTotal || 0))[0];
            const chave = `${item.nome}::${item.unidade}`;
            ofertasPorProduto[chave] = melhor;
          }
        }

        const ofertas = Object.values(ofertasPorProduto).sort(
          (a, b) => (a.valorSemICMSTotal || 0) - (b.valorSemICMSTotal || 0)
        );
        setItens(ofertas);
        setNaoEncontrados(naoEncontradosLocal);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar cotação.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [navigate]);

  if (carregando) {
    return (
      <div className="layout-content-inner" style={{ padding: 24, color: "#8b949e" }}>
        Carregando cotação para abastecimento...
      </div>
    );
  }

  if (itens.length === 0 && naoEncontrados.length === 0) {
    return (
      <div className="layout-content-inner" style={{ padding: 24, color: "#8b949e" }}>
        <p>Nenhum item abaixo do estoque mínimo ou zerado. Todos os produtos estão em dia.</p>
        <button onClick={() => navigate("/nova-cotacao")} style={styles.btnVoltar}>
          ← Voltar para Nova Cotação
        </button>
      </div>
    );
  }

  const totalGeralSemICMS = itens.reduce((s, i) => s + (i.valorSemICMSTotal || 0), 0);

  return (
    <div className="layout-content-inner" style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: "#e6edf3" }}>Cotação para abastecimento</h2>
        <p style={{ margin: "8px 0 0", color: "#8b949e", fontSize: "0.9rem" }}>
          Itens abaixo do estoque mínimo ou zerados — ordenados por menor valor (abatendo ICMS)
        </p>
        <button onClick={() => navigate("/nova-cotacao")} style={styles.btnVoltar}>
          ← Voltar para Nova Cotação
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Produto</th>
              <th style={styles.th}>Un.</th>
              <th style={styles.th}>Qtd</th>
              <th style={styles.th}>Fornecedor</th>
              <th style={styles.th}>Preço unit.</th>
              <th style={styles.th}>Alíq. ICMS</th>
              <th style={styles.th}>Valor unit. s/ ICMS</th>
              <th style={styles.th}>Total s/ ICMS</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((row, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{row.nome}</td>
                <td style={styles.td}>{row.unidade}</td>
                <td style={styles.tdNum}>{row.qtd}</td>
                <td style={styles.td}>{row.fornecedor}</td>
                <td style={styles.tdNum}>R$ {Number(row.precoUnit).toFixed(2)}</td>
                <td style={styles.tdNum}>
                  {row.aliquota != null ? `${row.aliquota}%` : "-"}
                </td>
                <td style={styles.tdNum}>R$ {Number(row.valorSemICMSUnit || 0).toFixed(2)}</td>
                <td style={styles.tdNum}>R$ {Number(row.valorSemICMSTotal || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.totalBox}>
        <strong>Total (abatendo ICMS): R$ {totalGeralSemICMS.toFixed(2)}</strong>
      </div>

      {naoEncontrados.length > 0 && (
        <div style={styles.naoEncontrados}>
          <strong>Itens não encontrados em nenhum catálogo:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {naoEncontrados.map((n, i) => (
              <li key={i}>{n.nome} ({n.unidade})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { width: "100%", padding: 24, color: "#e6edf3", overflowX: "auto" },
  header: { marginBottom: 24 },
  btnVoltar: {
    marginTop: 12,
    background: "transparent",
    color: "var(--accent)",
    border: "1px solid var(--accent)",
    borderRadius: 4,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  tableWrap: { overflowX: "auto", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: {
    padding: "12px 10px",
    textAlign: "left",
    borderBottom: BORDER,
    color: "#8b949e",
    fontWeight: 600,
    fontSize: "0.8rem",
    textTransform: "uppercase",
  },
  td: { padding: "10px", borderBottom: BORDER },
  tdNum: { padding: "10px", borderBottom: BORDER, textAlign: "right" },
  totalBox: {
    textAlign: "right",
    fontSize: "1.1em",
    padding: "16px 0",
    borderTop: BORDER,
  },
  naoEncontrados: {
    marginTop: 24,
    padding: 16,
    background: "rgba(248,81,73,0.1)",
    borderRadius: 4,
    border: "1px solid rgba(248,81,73,0.3)",
    color: "#f85149",
  },
};
