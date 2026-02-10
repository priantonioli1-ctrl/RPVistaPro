// src/pages/Fornecedor/Clientes.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

// Use proxy em dev ('' = mesmo origin) ou URL explícita do backend
const API_URL = process.env.REACT_APP_API_URL ?? "";
const API_BASE = API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:4001");
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

export default function Clientes() {
  const [compradores, setCompradores] = useState([]);
  const [meusClientes, setMeusClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  useEffect(() => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!usuario || usuario.tipo !== "fornecedor") {
      Swal.fire("Erro", "Acesso negado.", "error");
      return;
    }
    setUsuarioAtual(usuario);
    carregarDados(usuario);
  }, []);

  async function carregarDados(usuario) {
    try {
      setLoading(true);
      const fornecedorId = usuario._id;
      
      if (!fornecedorId) {
        Swal.fire("Erro", "ID do fornecedor não encontrado.", "error");
        setLoading(false);
        return;
      }

      // Carregar todos os compradores do sistema
      const token = sessionStorage.getItem("token");
      const resCompradores = await fetch(`${API_BASE}/api/usuarios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const usuarios = await resCompradores.json();
      const listaCompradores = usuarios.filter(
        (u) => u.tipo && u.tipo.toLowerCase() === "comprador"
      );
      setCompradores(listaCompradores);

      // Carregar meus clientes
      const resClientes = await fetch(`${API_BASE}/api/fornecedores/${fornecedorId}/clientes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (resClientes.ok) {
        const data = await resClientes.json();
        setMeusClientes(Array.isArray(data.clientes) ? data.clientes : []);
      } else {
        // Se não existir, inicializa vazio
        setMeusClientes([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      Swal.fire("Erro", "Não foi possível carregar os dados.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function adicionarCliente(compradorId) {
    if (!usuarioAtual || !usuarioAtual._id) return;

    try {
      const fornecedorId = usuarioAtual._id;
      const token = sessionStorage.getItem("token");

      const idStr = compradorId?.toString?.() ?? compradorId;
      const res = await fetch(`${API_BASE}/api/fornecedores/${fornecedorId}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ compradorId: idStr }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = res.status === 404 && err.error === "Rota não encontrada"
          ? "Rota não encontrada. Reinicie o backend (npm start na pasta backend-rpvistapro) e tente de novo."
          : (err.error || "Erro ao adicionar cliente");
        throw new Error(msg);
      }

      Swal.fire("Sucesso", "Cliente adicionado com sucesso!", "success");
      carregarDados(usuarioAtual);
    } catch (err) {
      console.error("Erro ao adicionar cliente:", err);
      Swal.fire("Erro", err.message || "Não foi possível adicionar o cliente.", "error");
    }
  }

  async function removerCliente(compradorId) {
    const confirmar = await Swal.fire({
      title: "Remover cliente?",
      text: "Os produtos deste cliente não aparecerão mais no seu catálogo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
    });

    if (!confirmar.isConfirmed) return;

    if (!usuarioAtual || !usuarioAtual._id) return;

    try {
      const fornecedorId = usuarioAtual._id;
      const token = sessionStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/fornecedores/${fornecedorId}/clientes/${compradorId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover cliente");
      }

      Swal.fire("Removido", "Cliente removido com sucesso.", "success");
      carregarDados(usuarioAtual);
    } catch (err) {
      console.error("Erro ao remover cliente:", err);
      Swal.fire("Erro", err.message || "Não foi possível remover o cliente.", "error");
    }
  }

  const clientesIds = new Set(meusClientes.map((c) => c._id || c.compradorId));

  if (loading) {
    return (
      <div className="layout-content-inner" style={{ padding: 40, textAlign: "center", color: "#8b949e" }}>
        Carregando...
      </div>
    );
  }

  return (
    <div className="layout-content-inner">
      <div style={card}>
        <h2 style={{ marginBottom: 20, color: "#e6edf3", fontSize: "1.5rem", fontWeight: 700 }}>
          👥 Meus Clientes
        </h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Selecione quais compradores fazem parte do seu banco de dados. Apenas os produtos dos clientes selecionados aparecerão no seu catálogo de preços.
        </p>

        {/* Lista de Clientes Selecionados */}
        {meusClientes.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#e6edf3", fontSize: "1.125rem", fontWeight: 600, marginBottom: 16 }}>
              Clientes Selecionados ({meusClientes.length})
            </h3>
            <div style={clientesList}>
              {meusClientes.map((cliente) => (
                <div key={cliente._id || cliente.compradorId} style={clienteCard}>
                  <div>
                    <strong style={{ color: "#e6edf3", fontSize: "1rem", textTransform: "uppercase" }}>
                      {(cliente.nome || cliente.empresa || "Cliente").toUpperCase()}
                    </strong>
                    {(cliente.ramoAtuacao || "").trim() && (
                      <p style={{ color: "#8b949e", margin: "4px 0 0", fontSize: "0.875rem", textTransform: "uppercase" }}>
                        {(cliente.ramoAtuacao || "").toUpperCase()}
                      </p>
                    )}
                    {cliente.cnpj && (
                      <p style={{ color: "#8b949e", margin: "4px 0 0", fontSize: "0.875rem" }}>
                        CNPJ: {cliente.cnpj}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removerCliente(cliente._id || cliente.compradorId)}
                    style={btnRemover}
                    title="Remover cliente"
                  >
                    ✕ Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Todos os Compradores */}
        <div>
          <h3 style={{ color: "#e6edf3", fontSize: "1.125rem", fontWeight: 600, marginBottom: 16 }}>
            Todos os Compradores do Sistema ({compradores.length})
          </h3>
          
          {compradores.length === 0 ? (
            <p style={{ color: "#8b949e", fontStyle: "italic", textAlign: "center", padding: 20 }}>
              Nenhum comprador encontrado no sistema.
            </p>
          ) : (
            <div style={compradoresList}>
              {compradores.map((comprador) => {
                const jaEhCliente = clientesIds.has(comprador._id);
                return (
                  <div key={comprador._id} style={compradorCard}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "#e6edf3", fontSize: "1rem", textTransform: "uppercase" }}>
                        {(comprador.nome || comprador.empresa || "Comprador").toUpperCase()}
                      </strong>
                      {(comprador.ramoAtuacao || "").trim() && (
                        <p style={{ color: "#8b949e", margin: "4px 0 0", fontSize: "0.875rem", textTransform: "uppercase" }}>
                          {(comprador.ramoAtuacao || "").toUpperCase()}
                        </p>
                      )}
                      {comprador.cnpj && (
                        <p style={{ color: "#8b949e", margin: "4px 0 0", fontSize: "0.875rem" }}>
                          CNPJ: {comprador.cnpj}
                        </p>
                      )}
                      {comprador.email && (
                        <p style={{ color: "#8b949e", margin: "2px 0 0", fontSize: "0.875rem" }}>
                          {comprador.email}
                        </p>
                      )}
                    </div>
                    {jaEhCliente ? (
                      <span style={badgeCliente}>✓ Cliente</span>
                    ) : (
                      <button
                        onClick={() => adicionarCliente(comprador._id)}
                        style={btnAdicionar}
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const card = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  color: "#e6edf3",
};

const clientesList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const clienteCard = {
  background: "rgba(37, 193, 155, 0.1)",
  border: "1px solid rgba(37, 193, 155, 0.3)",
  borderRadius: 8,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const compradoresList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const compradorCard = {
  background: "rgba(255,255,255,0.05)",
  border: BORDER,
  borderRadius: 8,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const btnAdicionar = {
  background: "#25C19B",
  color: "#0B1C26",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
};

const btnRemover = {
  background: "transparent",
  color: "#f85149",
  border: "1px solid rgba(248,81,73,0.5)",
  borderRadius: 8,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9375rem",
};

const badgeCliente = {
  background: "rgba(37, 193, 155, 0.2)",
  color: "#25C19B",
  border: "1px solid rgba(37, 193, 155, 0.4)",
  borderRadius: 8,
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: "0.875rem",
};
