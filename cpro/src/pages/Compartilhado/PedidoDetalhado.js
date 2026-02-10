// src/pages/Compartilhado/PedidoDetalhado.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  criarPedido,
  atualizarPedido,
  deletarPedido,
} from "../../services/api";

// 🔹 normaliza nome para chave segura (MANTIDO)
function keyify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/gi, "");
}

export default function PedidoDetalhadoComprador() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [isFornecedor, setIsFornecedor] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem("modo_visualizacao");

    // Usar sessionStorage (login atual) e fallback para localStorage (legado)
    const usuario =
      JSON.parse(sessionStorage.getItem("usuario") || "null") ||
      JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
      {};
    const identificado = usuario?._id || usuario?.id;
    if (!identificado) {
      alert("Usuário não identificado. Faça login novamente.");
      navigate("/");
      return;
    }

    const tipo = (usuario.tipo || "").toLowerCase();
    setIsFornecedor(tipo === "fornecedor");
    const nomeEmpresa = (usuario.nome || usuario.empresa || "").toString().trim();

    let pedidoEncontrado = null;

    // Fornecedor: pedidos vêm da API (Pedidos.jsx usa listarPedidos), então buscar na API por id
    if (tipo === "fornecedor") {
      const chaveFornecedor = `inbox_fornecedor_${keyify(nomeEmpresa)}`;
      const listaFornecedor = JSON.parse(localStorage.getItem(chaveFornecedor) || "[]");
      pedidoEncontrado = listaFornecedor.find((p) => p._id === id || p.id === id);
    } else {
      const chaveComprador = `meus_pedidos_${keyify(nomeEmpresa)}`;
      const listaComprador = JSON.parse(localStorage.getItem(chaveComprador) || "[]");
      pedidoEncontrado = listaComprador.find((p) => p._id === id || p.id === id);
    }

    if (!pedidoEncontrado) {
      pedidoEncontrado =
        JSON.parse(localStorage.getItem(id) || "null") ||
        JSON.parse(localStorage.getItem(`pedido_preview_${id}`) || "null") ||
        JSON.parse(localStorage.getItem(`pedido_${id}`) || "null") ||
        JSON.parse(localStorage.getItem(`pedidoFornecedor_${id}`) || "null") ||
        null;
    }

    // Se ainda não achou no localStorage, buscar pedido na API (fornecedor acessa pelo link direto)
    if (!pedidoEncontrado && id) {
      fetch(`${process.env.REACT_APP_API_URL || ""}/api/pedidos/${id}`, {
        headers: sessionStorage.getItem("token") ? { Authorization: `Bearer ${sessionStorage.getItem("token")}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (p) {
            const adaptado = {
              ...p,
              id: p._id,
              comprador: p.clienteNome || p.empresa || p.comprador,
              fornecedor: p.fornecedor,
              qtdProdutos: (p.itens || []).length,
              produtos: (p.itens || []).map((i) => ({
                nome: i.nome,
                unidade: i.unidade || "un",
                qtd: i.quantidade,
                preco: i.precoUnitario || i.preco,
                total: (i.quantidade || 0) * (i.precoUnitario ?? i.preco ?? 0),
              })),
              total: p.total,
              status: p.status,
            };
            setPedido(adaptado);
          } else {
            alert("Pedido não encontrado para este identificador.");
            navigate(tipo === "fornecedor" ? "/fornecedor/pedidos" : "/meus-pedidos");
          }
          setCarregando(false);
        })
        .catch(() => {
          alert("Pedido não encontrado para este identificador.");
          navigate(tipo === "fornecedor" ? "/fornecedor/pedidos" : "/meus-pedidos");
          setCarregando(false);
        });
      return;
    }

    if (!pedidoEncontrado) {
      alert("Pedido não encontrado para este identificador.");
      navigate(tipo === "fornecedor" ? "/fornecedor/pedidos" : "/meus-pedidos");
      return;
    }

    setPedido(pedidoEncontrado);
    setCarregando(false);
  }, [id, navigate]);

  function getUsuario() {
    return (
      JSON.parse(sessionStorage.getItem("usuario") || "null") ||
      JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
      {}
    );
  }

  // ✅ Função para concluir pedido (fornecedor) — (MANTIDA)
  async function concluirPedido() {
    if (!window.confirm("Deseja marcar este pedido como 'Concluído'?")) return;

    try {
      const usuario = getUsuario();
      if (!usuario?._id && !usuario?.id) {
        alert("Usuário não identificado.");
        return;
      }

      const chaveFornecedor = `inbox_fornecedor_${(pedido.fornecedor || "")
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const pedidosFornecedor = JSON.parse(localStorage.getItem(chaveFornecedor) || "[]");

      // Atualiza o pedido localmente (MANTIDO)
      const atualizados = pedidosFornecedor.map((p) =>
        p.id === (pedido.id || pedido._id) || p._id === (pedido._id || pedido.id)
          ? { ...p, status: "Concluído", concluidoEm: new Date().toLocaleString("pt-BR") }
          : p
      );

      localStorage.setItem(chaveFornecedor, JSON.stringify(atualizados));
      setPedido((prev) => ({ ...prev, status: "Concluído" }));

      // Envia atualização para o backend (MANTIDO)
      const resposta = await fetch(
        `${process.env.REACT_APP_API_URL}/api/pedidos/${pedido._id || pedido.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "Concluído",
            concluidoEm: new Date().toISOString(),
          }),
        }
      );

      if (!resposta.ok) throw new Error("Erro ao atualizar no servidor");
      alert("✅ Pedido concluído e sincronizado com o backend!");
    } catch (erro) {
      console.error("Erro ao concluir pedido:", erro);
      alert("⚠️ Pedido concluído apenas localmente. O servidor não respondeu.");
    }
  }

  // ---------- ações do fornecedor ---------- (MANTIDA)
  async function aprovarPedido() {
    if (!window.confirm("Deseja marcar este pedido como 'Aprovado'?")) return;

    try {
      const usuario = getUsuario();
      const chaveFornecedor = `inbox_fornecedor_${keyify(usuario.nome || usuario.empresa)}`;
      const pedidosFornecedor = JSON.parse(localStorage.getItem(chaveFornecedor) || "[]");

      // (MANTIDO) atualiza a inbox do fornecedor local
      const atualizados = pedidosFornecedor.map((p) =>
        (p.id === (pedido.id || pedido._id) || p._id === (pedido._id || pedido.id))
          ? { ...p, status: "Aprovado", aprovadoEm: new Date().toLocaleString("pt-BR") }
          : p
      );

      localStorage.setItem(chaveFornecedor, JSON.stringify(atualizados));
      setPedido((prev) => ({ ...prev, status: "Aprovado" }));

      // (MANTIDO) atualiza também no pedido do comprador
      const chaveComprador = `meus_pedidos_${keyify(pedido.comprador)}`;
      const pedidosComprador = JSON.parse(localStorage.getItem(chaveComprador) || "[]");

      const atualizadosComprador = pedidosComprador.map((p) =>
        (p.id === (pedido.id || pedido._id) || p._id === (pedido._id || pedido.id))
          ? { ...p, status: "Aprovado", aprovadoEm: new Date().toLocaleString("pt-BR") }
          : p
      );
      localStorage.setItem(chaveComprador, JSON.stringify(atualizadosComprador));

      // 🔹 Atualiza também no backend (MANTIDO)
      if (pedido._id) {
        await atualizarPedido(pedido._id, { status: "Aprovado" });
      }

      alert("✅ Pedido aprovado e sincronizado com o comprador e o banco!");
    } catch (erro) {
      console.error("Erro ao aprovar pedido:", erro);
      alert("❌ Erro ao aprovar pedido no banco de dados.");
    }
  }

  // ---------- excluir item do pedido ---------- (MANTIDA)
  async function excluirItem(index) {
    if (!window.confirm("Deseja remover este item do pedido?")) return;

    const novosProdutos = (pedido.produtos || []).filter((_, i) => i !== index);
    const novoPedido = {
      ...pedido,
      produtos: novosProdutos,
      qtdProdutos: novosProdutos.length,
      total: novosProdutos.reduce((acc, p) => acc + (p.total || 0), 0),
    };

    const usuario = getUsuario();
    // se for fornecedor, atualiza a caixa dele; se comprador, atualiza a dele
    if (isFornecedor) {
      const chaveFornecedor = `inbox_fornecedor_${keyify(usuario.nome || usuario.empresa)}`;
      const pedidosFornecedor = JSON.parse(localStorage.getItem(chaveFornecedor) || "[]");

      const atualizados = pedidosFornecedor.map((p) =>
        (p.id === (pedido.id || pedido._id) || p._id === (pedido._id || pedido.id))
          ? novoPedido
          : p
      );

      localStorage.setItem(chaveFornecedor, JSON.stringify(atualizados));
    } else {
      const chaveComprador = `meus_pedidos_${keyify(usuario.nome || usuario.empresa)}`;
      const pedidosComprador = JSON.parse(localStorage.getItem(chaveComprador) || "[]");

      const atualizados = pedidosComprador.map((p) =>
        (p.id === (pedido.id || pedido._id) || p._id === (pedido._id || pedido.id))
          ? novoPedido
          : p
      );

      localStorage.setItem(chaveComprador, JSON.stringify(atualizados));
    }

    setPedido(novoPedido);

    try {
      // 🔹 Atualiza ou deleta no banco de dados (MANTIDO)
      if (novoPedido.produtos.length === 0) {
        if (pedido._id) await deletarPedido(pedido._id);
        alert("🗑️ Último item removido — pedido excluído do banco!");
        navigate(-1);
      } else if (pedido._id) {
        await atualizarPedido(pedido._id, { produtos: novoPedido.produtos, total: novoPedido.total });
        alert("🗑️ Item removido e banco atualizado!");
      } else {
        alert("🗑️ Item removido do pedido local!");
      }
    } catch (erro) {
      console.error("Erro ao atualizar pedido:", erro);
      alert("❌ Erro ao atualizar o pedido no banco.");
    }
  }

  // ---------- salvar pedido no banco ---------- (MANTIDA)
  async function salvarNoBanco() {
    try {
      const usuario = getUsuario();
      if (!usuario?._id && !usuario?.id) {
        alert("Usuário não identificado.");
        return;
      }

      const pedidoParaSalvar = {
        clienteNome: usuario.nome || usuario.empresa,
        itens: (pedido.produtos || []).map((p) => ({
          nome: p.nome,
          quantidade: p.qtd,
          precoUnitario: p.preco,
        })),
        total: pedido.total,
        status: pedido.status || "rascunho",
      };

      const resposta = await criarPedido(pedidoParaSalvar);
      alert("💾 Pedido salvo com sucesso no banco!");
      console.log("Pedido salvo no MongoDB:", resposta);
    } catch (erro) {
      console.error("Erro ao salvar no banco:", erro);
      alert("❌ Erro ao salvar o pedido no banco de dados.");
    }
  }

  // ---------- render ----------
  if (carregando)
    return (
      <div style={{ padding: 40, color: "#fff", background: "#162232", minHeight: "100vh" }}>
        <h2>Carregando pedido...</h2>
      </div>
    );

  if (!pedido)
    return (
      <div style={{ padding: 40, color: "#fff", background: "#162232", minHeight: "100vh" }}>
        <h2>Pedido não encontrado.</h2>
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", color: "#e6edf3", padding: 24 }}>
      {/* (MANTIDO) salvar no banco */}
      <button
        onClick={salvarNoBanco}
        style={{
          background: "#8bbae6",
          color: "#162232",
          border: "none",
          borderRadius: 6,
          padding: "8px 14px",
          marginBottom: 20,
          cursor: "pointer",
          margin: 5,
        }}
      >
        💾 Salvar no Banco
      </button>

      <h1>
        Pedido Detalhado — {isFornecedor ? pedido.comprador : pedido.fornecedor}
      </h1>

      <p>
        <strong>Status:</strong> {pedido.status}
      </p>

      {pedido.enviadaEm && (
        <p>
          <strong>Enviada em:</strong> {pedido.enviadaEm}
        </p>
      )}
      {pedido.aprovadoEm && (
        <p>
          <strong>Aprovado em:</strong> {pedido.aprovadoEm}
        </p>
      )}

      <p>
        <strong>Quantidade de Produtos:</strong> {pedido.qtdProdutos}
      </p>
      <p>
        <strong>Total:</strong> R$ {Number(pedido.total || 0).toFixed(2)}
      </p>

      {pedido.produtos && pedido.produtos.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 20,
            background: "#1f2e45",
          }}
        >
          <thead>
            <tr>
              <th style={th}>Produto</th>
              <th style={th}>Unidade</th>
              <th style={th}>Quantidade</th>
              <th style={th}>Preço</th>
              <th style={th}>Total</th>
              {isFornecedor && <th style={th}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {pedido.produtos.map((prod, idx) => (
              <tr key={idx}>
                <td style={td}>{prod.nome}</td>
                <td style={td}>{prod.unidade}</td>
                <td style={td}>{prod.qtd}</td>
                <td style={td}>R$ {Number(prod.preco).toFixed(2)}</td>
                <td style={td}>R$ {Number(prod.total).toFixed(2)}</td>
                {isFornecedor && (
                  <td style={td}>
                    <button
                      onClick={() => excluirItem(idx)}
                      style={{
                        background: "#e74c3c",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      ❌ Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isFornecedor && (
        <div style={{ marginTop: 30 }}>
          <button
            onClick={aprovarPedido}
            style={{
              background: "#27ae60",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: "bold",
              marginRight: 10,
            }}
          >
            🟢 Aprovar Pedido
          </button>

          {/* 🔵 Concluir Pedido (MANTIDO) */}
          <button
            onClick={concluirPedido}
            style={{
              background: "#2980b9",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔵 Concluir Pedido
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- estilos ---------- (MANTIDOS)
const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #5e7899",
};
const td = {
  padding: "8px",
  borderBottom: "1px solid #5e7899",
};