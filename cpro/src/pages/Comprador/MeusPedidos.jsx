// src/pages/Comprador/MeusPedidos.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getRascunhosResumo, removerRascunhoResumo } from "./ResumoCotacao";

const API_BASE = process.env.REACT_APP_API_URL || "";

const LARANJA = "#F6A46A";
const VERDE = "#25C19B";
const LARANJA_DESTAQUE = "#FF8A00"; /* cor/borda; botões usam --gradient-btn-orange */
const BORDER = "1px solid rgba(255,255,255,0.08)";

function getFornecedor(p) {
  return (p.fornecedor || p.produtos?.[0]?.fornecedor || "").toString().trim() || "—";
}

/** Para rascunhos: lista de pedidos por fornecedor → exibe nomes dos fornecedores */
function getFornecedoresRascunho(draft) {
  const pedidos = draft?.pedidos || [];
  const nomes = [...new Set(pedidos.map((x) => (x.fornecedor || "").toString().trim()).filter(Boolean))];
  if (nomes.length === 0) return "Resumo (não enviado)";
  if (nomes.length === 1) return nomes[0];
  return nomes.join(", ");
}

function getItens(p) {
  const itens = p?.itens ?? p?.produtos;
  return Array.isArray(itens) ? itens : [];
}

function getQtdItens(p) {
  const itens = getItens(p);
  return Array.isArray(itens) ? itens.length : 0;
}

export default function MeusPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [rascunhos, setRascunhos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  function carregarRascunhos() {
    try {
      const list = getRascunhosResumo();
      setRascunhos(Array.isArray(list) ? list : []);
    } catch {
      setRascunhos([]);
    }
  }

  useEffect(() => {
    async function carregar() {
      try {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
        // Mesmo critério do Resumo da Cotação: empresa no pedido é clienteNome = nome do comprador
        const empresaParam = usuario?.nome || usuario?.empresa || usuario?._id;
        const token = sessionStorage.getItem("token");
        const url = empresaParam
          ? `${API_BASE}/api/pedidos?empresa=${encodeURIComponent(empresaParam)}`
          : `${API_BASE}/api/pedidos`;
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await resp.json();
        setPedidos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
        setPedidos([]);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
    carregarRascunhos();
    
    // Verificar e mover pedidos concluídos há mais de 1 hora para histórico
    const intervalo = setInterval(async () => {
      try {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
        const empresaParam = usuario?.nome || usuario?.empresa || usuario?._id;
        const token = sessionStorage.getItem("token");
        const url = empresaParam
          ? `${API_BASE}/api/pedidos?empresa=${encodeURIComponent(empresaParam)}`
          : `${API_BASE}/api/pedidos`;
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await resp.json();
        const pedidosAtuais = Array.isArray(data) ? data : [];
        
        const agora = new Date();
        const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
        
        // Verificar pedidos concluídos há mais de 1 hora
        const pedidosParaMover = pedidosAtuais.filter((p) => {
          const status = (p.status || "").toLowerCase();
          if (!status.startsWith("conclu")) return false;
          
          const dataRecebimento = p.dataRecebimento || p.updatedAt || p.createdAt;
          if (!dataRecebimento) return false;
          
          const dataReceb = new Date(dataRecebimento);
          return dataReceb < umaHoraAtras;
        });
        
        // Atualizar status para "Recebido" (que vai para histórico)
        let atualizou = false;
        for (const pedido of pedidosParaMover) {
          if (pedido._id) {
            try {
              await fetch(`${API_BASE}/api/pedidos/${pedido._id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ status: "Recebido" }),
              });
              atualizou = true;
            } catch (err) {
              console.error("Erro ao atualizar pedido para histórico:", err);
            }
          }
        }
        
        // Recarregar pedidos se houver mudanças
        if (atualizou) {
          const resp2 = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data2 = await resp2.json();
          setPedidos(Array.isArray(data2) ? data2 : []);
        }
      } catch (err) {
        console.error("Erro ao verificar pedidos para histórico:", err);
      }
    }, 60000); // Verifica a cada 1 minuto
    
    return () => clearInterval(intervalo);
  }, []);

  const pedidosList = Array.isArray(pedidos) ? pedidos : [];
  const abertas = pedidosList.filter(
    (c) => !c.status || (c.status || "").toLowerCase().startsWith("rascunho")
  );
  const rascunhosList = Array.isArray(rascunhos) ? rascunhos : [];
  // Lista unificada "Em aberto": rascunhos do resumo (continuar depois) + pedidos API em aberto
  const itensEmAberto = [
    ...rascunhosList.map((r) => ({ ...r, _isDraft: true })),
    ...abertas.map((p, idx) => ({ ...p, _isDraft: false, _indexAbertas: idx })),
  ];
  const enviadas = pedidosList.filter(
    (c) => (c.status || "").toLowerCase() === "enviado"
  );
  const aprovadas = pedidosList.filter(
    (c) => (c.status || "").toLowerCase() === "aprovado"
  );
  const concluidas = pedidosList.filter(
    (c) => (c.status || "").toLowerCase().startsWith("conclu")
  );

  function continuarRascunho(draft) {
    navigate("/resumo-cotacao", { state: { loadDraft: draft } });
  }

  function excluirRascunho(id) {
    removerRascunhoResumo(id);
    carregarRascunhos();
  }

  async function enviar(indexAbertos) {
    const alvo = abertas[indexAbertos];
    if (!alvo) return;
    const confEnviar = await Swal.fire({
      title: "Enviar pedido?",
      text: "Deseja realmente enviar este pedido?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, enviar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: VERDE,
    });
    if (!confEnviar.isConfirmed) return;

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    const itens = getItens(alvo).map((p) => ({
      nome: p.nome,
      quantidade: p.quantidade ?? p.qtd ?? 0,
      precoUnitario: p.precoUnitario ?? p.preco ?? 0,
    }));

    try {
      const resposta = await fetch(`${API_BASE}/api/pedidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionStorage.getItem("token")
            ? { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          empresa: usuario.empresa || usuario.nome,
          clienteNome: usuario.empresa || usuario.nome,
          fornecedor: getFornecedor(alvo) !== "—" ? getFornecedor(alvo) : "Fornecedor",
          itens,
          total: alvo.total,
          status: "Enviado",
        }),
      });

      if (!resposta.ok) throw new Error("Erro ao enviar pedido.");
      const novo = await resposta.json();
      setPedidos((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p !== alvo && p._id !== alvo._id).concat([novo]));
      Swal.fire({ title: "Sucesso", text: "Pedido enviado com sucesso!", icon: "success", confirmButtonColor: VERDE });
    } catch (erro) {
      console.error(erro);
      Swal.fire({ title: "Erro", text: "Falha ao enviar o pedido. Tente novamente.", icon: "error" });
    }
  }

  async function excluir(indexAbertos) {
    const alvo = abertas[indexAbertos];
    if (!alvo) return;
    const confExcluir = await Swal.fire({
      title: "Excluir pedido?",
      text: "Deseja excluir este pedido?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
    });
    if (!confExcluir.isConfirmed) return;
    if (alvo._id) {
      setPedidos((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p._id !== alvo._id));
    } else {
      setPedidos((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p !== alvo));
    }
    Swal.fire({ title: "Excluído", text: "Pedido excluído.", icon: "success", confirmButtonColor: VERDE });
  }

  async function marcarRecebido(pedido) {
    if (!pedido?._id) return;
    const confirmar = await Swal.fire({
      title: "Confirmar recebimento",
      text: "Confirmar que recebeu este pedido? Os itens serão adicionados ao estoque.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, recebido",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#20b5a6",
    });
    if (!confirmar.isConfirmed) return;

    try {
      const token = sessionStorage.getItem("token");
      const url = `${API_BASE}/api/pedidos/${pedido._id}/receber`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao marcar como recebido.");
      }
      const atualizado = await resp.json();
      setPedidos((prev) => (Array.isArray(prev) ? prev : []).map((p) => (p._id === pedido._id ? atualizado : p)));
      await Swal.fire({
        title: "Concluído",
        text: "Pedido marcado como recebido. Os itens foram adicionados ao estoque.",
        icon: "success",
        confirmButtonColor: "#20b5a6",
      });
    } catch (erro) {
      console.error(erro);
      Swal.fire({
        title: "Erro",
        text: erro.message || "Falha ao marcar como recebido. Verifique se o servidor está rodando.",
        icon: "error",
        confirmButtonColor: "#e74c3c",
      });
    }
  }

  if (carregando) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8b949e" }}>
        Carregando pedidos...
      </div>
    );
  }

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <Section
        titulo="Em aberto"
        cor={LARANJA}
        lista={itensEmAberto}
        emptyMsg="Nenhum pedido em aberto. Gere um resumo no Resumo da Cotação para salvar aqui."
        legenda="Rascunhos do resumo podem ser abertos para continuar e enviar. Pedidos da API podem ser enviados ou excluídos."
        renderCard={(p, i) => {
          if (p._isDraft) {
            const qtdItensRascunho = (p.pedidos || []).reduce((s, x) => s + (x.produtos?.length || 0), 0);
            const totalRascunho = Number(p.totalGeral) || 0;
            const dataCriado = p.createdAt ? new Date(p.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
            return (
              <PedidoCard
                fornecedor={getFornecedoresRascunho(p)}
                qtdItens={qtdItensRascunho === 1 ? "1 item" : `${qtdItensRascunho} itens`}
                total={totalRascunho}
                status={dataCriado ? `Salvo em ${dataCriado}` : "Rascunho"}
                corBorda={LARANJA}
                acoes={
                  <>
                    <button type="button" onClick={() => continuarRascunho(p)} style={styles.btnEnviar} title="Continuar">
                      ✓
                    </button>
                    <button type="button" onClick={() => excluirRascunho(p.id)} style={styles.btnExcluir} title="Excluir">
                      ✕
                    </button>
                  </>
                }
              />
            );
          }
          const idxAbertas = p._indexAbertas ?? i;
          return (
            <PedidoCard
              fornecedor={getFornecedor(p)}
              qtdItens={getQtdItens(p)}
              total={p.total}
              status={p.status || "Rascunho"}
              corBorda={LARANJA}
              acoes={
                <>
                  <button type="button" onClick={() => enviar(idxAbertas)} style={styles.btnEnviar} title="Enviar">
                    ✓
                  </button>
                  <button type="button" onClick={() => excluir(idxAbertas)} style={styles.btnExcluir} title="Excluir">
                    ✕
                  </button>
                </>
              }
            />
          );
        }}
      />

      <Section
        titulo="Enviados"
        cor={VERDE}
        lista={enviadas}
        emptyMsg="Nenhum pedido enviado."
        renderCard={(p) => (
          <PedidoCard
            fornecedor={getFornecedor(p)}
            qtdItens={getQtdItens(p)}
            total={p.total}
            status={p.status}
            corBorda={VERDE}
            extra={p.createdAt ? `Enviado em ${new Date(p.createdAt).toLocaleDateString("pt-BR")}` : null}
          />
        )}
      />

      <Section
        titulo="Aprovados"
        cor="#E6A23C"
        lista={aprovadas}
        emptyMsg="Nenhum pedido aprovado pelo fornecedor."
        legenda="Itens constam em trânsito no Estoque até você marcar como recebido."
        renderCard={(p) => (
          <PedidoCard
            fornecedor={getFornecedor(p)}
            qtdItens={getQtdItens(p)}
            total={p.total}
            status={p.status}
            corBorda="#E6A23C"
            acoes={
              <button
                type="button"
                onClick={() => marcarRecebido(p)}
                style={styles.btnRecebido}
              >
                Marcar como recebido
              </button>
            }
          />
        )}
      />

      <Section
        titulo="Concluídos"
        cor={LARANJA_DESTAQUE}
        lista={concluidas}
        emptyMsg="Nenhum pedido concluído."
        legenda="Pedidos concluídos há mais de 1 hora serão movidos automaticamente para o histórico de compras."
        renderCard={(p) => (
          <PedidoCard
            fornecedor={getFornecedor(p)}
            qtdItens={getQtdItens(p)}
            total={p.total}
            status={p.status}
            corBorda={LARANJA_DESTAQUE}
            extra={p.dataRecebimento ? `Recebido em ${new Date(p.dataRecebimento).toLocaleDateString("pt-BR")}` : null}
          />
        )}
      />
    </div>
  );
}

function Section({ titulo, cor, lista, emptyMsg, legenda, renderCard }) {
  const list = Array.isArray(lista) ? lista : [];
  return (
    <section style={styles.section}>
      <h2 style={{ ...styles.subtitle, color: cor }}>{titulo}</h2>
      {legenda && (
        <p style={styles.legenda}>{legenda}</p>
      )}
      {list.length === 0 ? (
        <p style={styles.empty}>{emptyMsg}</p>
      ) : (
        <div style={styles.cardList}>
          {list.map((p, i) => (
            <div key={p._id || p.id || i} style={styles.cardWrap}>
              {renderCard(p, i)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PedidoCard({ fornecedor, qtdItens, total, status, corBorda, extra, acoes }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardGrid}>
        <div style={styles.cardItem}>
          <span style={styles.label}>Fornecedor</span>
          <span style={{ ...styles.value, textTransform: "uppercase" }}>{fornecedor}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Itens</span>
          <span style={styles.value}>{qtdItens}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Total</span>
          <span style={styles.value}>R$ {Number(total || 0).toFixed(2)}</span>
        </div>
        <div style={styles.cardItem}>
          <span style={styles.label}>Status</span>
          <span style={styles.value}>{status}</span>
        </div>
        {acoes && (
          <div style={{ ...styles.cardItem, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12, minWidth: 120 }}>
            {acoes}
          </div>
        )}
        {extra && (
          <div style={{ ...styles.cardItem, gridColumn: "1 / -1" }}>
            <span style={styles.label} />
            <span style={styles.valueSmall}>{extra}</span>
          </div>
        )}
      </div>
    </div>
  );
}

  const styles = {
  section: {
    marginBottom: 40,
    width: "100%",
  },
  subtitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: 8,
    color: "#e6edf3",
    textAlign: "center",
  },
  legenda: {
    fontSize: "0.9375rem",
    color: "#8b949e",
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
  empty: {
    color: "#8b949e",
    fontStyle: "italic",
    fontSize: "1.0625rem",
    textAlign: "center",
    marginTop: 8,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
  },
  cardWrap: {
    width: "100%",
  },
  card: {
    padding: "20px 24px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(120px, 1fr)) minmax(200px, auto)",
    gap: "14px 24px",
    alignItems: "center",
  },
  cardItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: "0.8125rem",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  value: {
    fontSize: "1.0625rem",
    fontWeight: 600,
    color: "#e6edf3",
  },
  valueSmall: {
    fontSize: "0.9375rem",
    color: "#8b949e",
  },
  acoes: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: BORDER,
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  btnEnviar: {
    background: "var(--gradient-btn-primary)",
    color: "#0F011E",
    border: "none",
    borderRadius: 4,
    padding: "10px 14px",
    fontSize: "1.25rem",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 44,
    lineHeight: 1,
  },
  btnExcluir: {
    background: "transparent",
    color: "#f85149",
    border: "1px solid rgba(248,81,73,0.5)",
    borderRadius: 4,
    padding: "10px 14px",
    fontSize: "1.25rem",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 44,
    lineHeight: 1,
  },
  btnRecebido: {
    background: "var(--gradient-btn-orange)",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "10px 18px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
