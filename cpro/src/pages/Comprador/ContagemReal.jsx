// src/pages/Comprador/contagemreal.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function ContagemReal() {
  const [estoque, setEstoque] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  // ------------------ CARREGAR ESTOQUE DO BACKEND ------------------
  useEffect(() => {
  // 🔹 Buscar usuário logado correto
 let rawUser = sessionStorage.getItem("usuario");

if (!rawUser) {
  Swal.fire("Erro", "Usuário não está logado.", "error");
  navigate("/login");
  return;
}

const usuario = JSON.parse(rawUser);
  const compradorId = usuario.compradorId || (usuario.tipo === "comprador" ? usuario._id : null);
  setUsuarioAtual({ ...usuario, compradorId });

  // 🔹 Garantir que a empresa existe
  if (!compradorId) {
    Swal.fire("Erro", "Empresa não identificada para este usuário.", "error");
    return;
  }

  async function carregarEstoque() {
    try {
      console.log("🔄 Carregando estoque:", compradorId);

      // 🔥 Agora buscamos usando empresaId (correto)
      const res = await fetch(`${API_URL}/api/estoque/${compradorId}`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        Swal.fire("Aviso", "Nenhum item encontrado no estoque.", "info");
        return;
      }

      setEstoque(data);
    } catch (err) {
      console.error("❌ Erro ao carregar estoque:", err);
      Swal.fire("Erro", "Falha ao carregar estoque do servidor.", "error");
    }
  }

  carregarEstoque();
}, []);
  // ------------------ ATUALIZAR CONTAGEM REAL ------------------
  function atualizarContagem(index, valor) {
    const novo = [...estoque];
    novo[index].contagemReal = valor;
    novo[index].ultimaAtualizacao = new Date().toLocaleString("pt-BR");
    setEstoque(novo);
  }

  // ------------------ SALVAR CONTAGEM NO BACKEND ------------------
  async function salvarContagem() {
    const compradorId = usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
    if (!compradorId) {
      Swal.fire("Erro", "Usuário não identificado.", "error");
      return;
    }

    try {
      console.log("💾 Enviando contagem real ao backend:", compradorId);
      const res = await fetch(`${API_URL}/api/estoque/contagem/${compradorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: estoque }),
      });

      if (!res.ok) throw new Error("Erro ao salvar contagem real.");
      const data = await res.json();

      Swal.fire("Sucesso", data.message || "Contagem salva com sucesso!", "success");
    } catch (err) {
      console.error("❌ Erro ao salvar contagem real:", err);
      Swal.fire("Erro", "Falha ao salvar contagem no servidor.", "error");
    }
  }

  // ------------------ RENDER ------------------
  return (
    <div style={{ width: "100%", maxWidth: "none", alignSelf: "stretch", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <p style={{ textAlign: "center", marginBottom: 12 }}>
          Registre a <b>contagem física real</b> dos produtos. Ao salvar, os valores alimentam o campo Contagem Real na página Estoque.
        </p>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button onClick={salvarContagem} style={btnSalvar}>
            💾 Salvar Contagem Real
          </button>
        </div>

        {estoque.length === 0 ? (
          <p style={{ textAlign: "center" }}>Nenhum item carregado.</p>
        ) : (
          <div style={tabelaBox}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Produto</th>
                  <th style={th}>Unidade</th>
                  <th style={th}>Contagem Real</th>
                  <th style={th}>Última Atualização</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((p, i) => (
                  <tr key={i}>
                    <td style={td}>{p.nome}</td>
                    <td style={td}>{p.unidade}</td>
                    <td style={td}>
                      <input
                        type="number"
                        value={p.contagemReal || ""}
                        onChange={(e) =>
                          atualizarContagem(i, e.target.value)
                        }
                        style={inputNum}
                      />
                    </td>
                    <td style={td}>{p.ultimaAtualizacao || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------ ESTILOS ------------------ */
const pageOuter = { background: "#0F2D3F", minHeight: "100vh", color: "#fff" };
const topBar = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#0F2D3F",
  height: 66,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
};
const topLeft = { display: "flex", alignItems: "center", gap: 14 };
const helloText = { fontSize: "1rem", opacity: 0.95 };
const btnSair = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: "bold",
};
const mainWrap = { width: "100%", margin: "24px 0", padding: "0 20px 40px", boxSizing: "border-box" };
const title = { textAlign: "center", color: "#fff", marginBottom: 20, fontWeight: 1000 };
const btnVoltar = {
  background: "#162232",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const tabelaBox = {
  background: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  overflowX: "auto",
};
const table = { width: "100%", borderCollapse: "collapse", background: "transparent" };
const th = { 
  background: "transparent", 
  color: "#8b949e", 
  padding: 12, 
  borderBottom: BORDER,
  textTransform: "uppercase",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  fontWeight: 600,
};
const td = { 
  padding: 12, 
  borderBottom: BORDER, 
  textAlign: "center", 
  color: "#e6edf3" 
};
const inputNum = {
  width: "70px",
  padding: "6px 8px",
  textAlign: "center",
  borderRadius: 6,
  border: BORDER,
  background: CARD_BG,
  color: "#e6edf3",
  fontSize: "0.9375rem",
};
const btnSalvar = {
  background: "#25C19B",
  color: "#162232",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "1rem",
};