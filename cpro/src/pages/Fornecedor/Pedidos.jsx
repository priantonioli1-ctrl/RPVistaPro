// src/pages/Fornecedor/PedidosPlus.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listarPedidos,
  atualizarPedido,
  removerItemPedido, // backend
  avaliarPedido,     // backend
} from "../../services/api";

export default function PedidosPlus() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [hashPedidos, setHashPedidos] = useState("");
  const navigate = useNavigate();
  const audioRef = useRef();

  const beepSrc =
    "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA..."; // substitua pelo seu áudio real

  useEffect(() => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    setUsuarioAtual(usuario || null);
    const nomeFornecedor = (usuario?.nome || usuario?.empresa || "").toString().trim();
    if (!nomeFornecedor) {
      alert("Usuário não identificado.");
      return;
    }
    carregarPedidos();
    const interval = setInterval(() => carregarPedidos(true), 30000);
    return () => clearInterval(interval);
  }, []);

  async function carregarPedidos(checkDiff = false) {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    const nomeFornecedor = (usuario?.nome || usuario?.empresa || "").toString().trim();
    if (!nomeFornecedor) return;

    try {
      const pedidosBackend = await listarPedidos({ fornecedor: nomeFornecedor });
      const pedidosComId = (pedidosBackend || []).map((p) => ({
        ...p,
        id: p._id || p.id,
        comprador: p.empresa || p.comprador,
        qtdProdutos: (p.itens || []).length,
      }));
      setPedidos(pedidosComId);

      if (checkDiff) {
        const novoHash = JSON.stringify(pedidosComId.map((p) => (p._id || p.id) + (p.status || "")));
        if (hashPedidos && novoHash !== hashPedidos) {
          Swal.fire({
            title: "📦 Novo pedido!",
            toast: true,
            position: "top-end",
            timer: 3000,
            showConfirmButton: false,
            icon: "info",
          });
          try {
            audioRef.current?.play();
          } catch {}
        }
        setHashPedidos(novoHash);
      } else {
        setHashPedidos(JSON.stringify(pedidosComId.map((p) => (p._id || p.id) + (p.status || ""))));
      }
    } catch (erro) {
      console.warn("Erro ao carregar pedidos:", erro);
    } finally {
      setCarregando(false);
    }
  }

  async function aprovar(pedido, index) {
    const confirmar = window.confirm("Deseja marcar este pedido como aprovado?");
    if (!confirmar) return;

    const pedidoId = pedido._id || pedido.id;
    const novosPedidos = [...pedidos];
    novosPedidos[index] = {
      ...pedido,
      status: "Aprovado",
      aprovadoEm: new Date().toLocaleString("pt-BR"),
    };
    setPedidos(novosPedidos);

    try {
      await atualizarPedido(pedidoId, {
        status: "Aprovado",
        aprovadoEm: new Date().toISOString(),
      });
      Swal.fire("Aprovado", "Pedido aprovado e sincronizado!", "success");
    } catch {
      Swal.fire("Aviso", "Pedido aprovado apenas localmente.", "warning");
    }
  }

  async function excluirItem(pedidoId, itemId) {
    const idItem = itemId || (typeof itemId === "object" && itemId?._id);
    try {
      await removerItemPedido(pedidoId, idItem);
      setPedidos((prev) =>
        prev.map((p) =>
          (p._id || p.id) === pedidoId
            ? { ...p, itens: (p.itens || []).filter((it) => (it._id || it.id) !== idItem) }
            : p
        )
      );
      Swal.fire("Removido", "Item excluído do pedido.", "success");
    } catch {
      Swal.fire("Erro", "Falha ao excluir item.", "error");
    }
  }

  async function avaliar(pedidoId) {
    const { value: values } = await Swal.fire({
      title: "Avaliar pedido",
      html:
        '<input id="nota" type="number" min="1" max="5" class="swal2-input" placeholder="Nota (1 a 5)">' +
        '<textarea id="coment" class="swal2-textarea" placeholder="Comentário"></textarea>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Enviar",
      preConfirm: () => ({
        nota: Number(document.getElementById("nota").value),
        comentario: document.getElementById("coment").value,
      }),
    });
    if (!values) return;
    try {
      await avaliarPedido(pedidoId, values);
      Swal.fire("👍 Avaliado", "Avaliação enviada.", "success");
    } catch {
      Swal.fire("Erro", "Falha ao enviar avaliação.", "error");
    }
  }

  const recebidos = pedidos.filter(
    (p) => !p.status || p.status === "Enviado" || p.status === "Recebido"
  );
  const aprovados = pedidos.filter((p) => p.status === "Aprovado");
  const concluidos = pedidos.filter((p) => p.status === "Concluído");

  if (carregando)
    return (
      <div className="layout-content-inner">
        <h2 style={{ color: "#e6edf3", textAlign: "center" }}>Carregando pedidos...</h2>
      </div>
    );

  return (
    <div className="layout-content-inner">
      <audio ref={audioRef} src={beepSrc} preload="auto" />
      <div style={contentCard}>
        <Section cor="#f1c40f" titulo="🟡 Recebidos" lista={recebidos}>
          {(p, i) => (
            <>
              <Linha label="Comprador" value={p.comprador} />
              <Linha label="Qtd Produtos" value={p.qtdProdutos} />
              <Linha label="Total" value={`R$ ${p.total?.toFixed(2)}`} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => aprovar(p, i)} style={btnAprovar}>
                  ✅ Aprovar
                </button>
                <button
                  onClick={() =>
                    navigate(`/pedido-detalhado/${encodeURIComponent(p._id || p.id)}`)
                  }
                  style={btnVisualizar}
                >
                  👁️ Visualizar
                </button>
                <button
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))
                  }
                  style={btnItens}
                >
                  {expanded[p.id] ? "🔽 Itens" : "🔼 Itens"}
                </button>
              </div>
              {expanded[p.id] && (
                <Itens pedido={p} onExcluir={(item) => excluirItem(p._id || p.id, item._id || item.id)} />
              )}
            </>
          )}
        </Section>

        <Section cor="#27ae60" titulo="🟢 Aprovados" lista={aprovados}>
          {(p) => (
            <>
              <Linha label="Comprador" value={p.comprador} />
              <Linha label="Total" value={`R$ ${p.total?.toFixed(2)}`} />
              <Linha label="Aprovado em" value={p.aprovadoEm} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => avaliar(p._id || p.id)} style={btnAvaliar}>
                  ⭐ Avaliar
                </button>
              </div>
            </>
          )}
        </Section>

        <Section cor="#2980b9" titulo="🔵 Concluídos" lista={concluidos}>
          {(p) => (
            <>
              <Linha label="Comprador" value={p.comprador} />
              <Linha label="Total" value={`R$ ${p.total?.toFixed(2)}`} />
              <Linha label="Status" value={p.status} />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

/* 🔹 SUBCOMPONENTES */
function Section({ cor, titulo, lista, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: cor }}>{titulo}</h2>
      {lista.length > 0 ? (
        lista.map((p, i) => (
          <Card key={i} border={cor} bg="#fff">
            {children(p, i)}
          </Card>
        ))
      ) : (
        <p style={textoVazio}>Nenhum pedido.</p>
      )}
    </section>
  );
}

function Itens({ pedido, onExcluir }) {
  if (!pedido.itens?.length) return <p style={textoVazio}>Sem itens.</p>;
  return (
    <div style={{ borderTop: "1px dashed #ccc", marginTop: 10, paddingTop: 10 }}>
      {pedido.itens.map((it) => (
        <div
          key={it._id || it.id}
          style={{
    display: "grid",
    gridTemplateColumns: "1fr auto auto auto",
    gap: 8,
    alignItems: "center",
    padding: "6px 0",
    color: "#162232", // 🔹 texto escuro visível
    backgroundColor: "#f9f9f9", // 🔹 fundo claro alternado
    borderRadius: 6,
  }}
        >
          <div>{it.produto}</div>
          <div>Qtd: {it.quantidade}</div>
          <div>R$ {it.preco?.toFixed(2)}</div>
          <button onClick={() => onExcluir(it)} style={btnExcluirItem}>
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}

function Card({ children, bg = "#fff", border = "#ccc" }) {
  const isFundoClaro = !bg || bg === "#fff" || /^#(fff|f[f0-9a-f]{5}|e[89a-f][0-9a-f]{4})/i.test(String(bg));
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        color: isFundoClaro ? "#1a1a1a" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Linha({ label, value }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <strong>{label}:</strong> {value}
    </div>
  );
}

/* 🎨 ESTILOS */
const contentCard = {
  backgroundColor: "#161b22",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};
const btnAprovar = {
  backgroundColor: "#27ae60",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnVisualizar = {
  backgroundColor: "#8bbae6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnItens = {
  backgroundColor: "#f1c40f",
  color: "#162232",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnAvaliar = {
  backgroundColor: "#9b59b6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const btnExcluirItem = {
  backgroundColor: "#e07c7c",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: "bold",
};
const textoVazio = { color: "#8b949e", fontStyle: "italic" };