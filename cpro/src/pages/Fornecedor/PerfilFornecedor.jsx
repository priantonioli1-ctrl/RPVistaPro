import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

export default function PerfilFornecedor() {
  const navigate = useNavigate();

  const [dados, setDados] = useState({
    nome: "",
    email: "",
    senha: "",
    cnpj: "",
    tipo: "", // somente exibição
  });

  const [loading, setLoading] = useState(true);

  // ▶ Buscar dados reais do backend
  useEffect(() => {
    const usuarioSessao = JSON.parse(sessionStorage.getItem("usuario"));

    if (!usuarioSessao || !usuarioSessao._id) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/");
      return;
    }

    async function buscarDadosReais() {
      try {
        const token = sessionStorage.getItem("token");
        const resp = await fetch(`${API_URL}/api/usuarios/${usuarioSessao._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await resp.json();

        if (!resp.ok) {
          alert(data.error || "Erro ao buscar dados do usuário.");
          navigate("/");
          return;
        }

        setDados({
          nome: data.nome,
          email: data.email,
          senha: data.senha,
          cnpj: data.cnpj,
          tipo: data.tipo,
        });

        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        alert("Erro ao conectar ao servidor.");
      }
    }

    buscarDadosReais();
  }, [navigate]);

  function handleChange(e) {
    const { name, value } = e.target;
    setDados({ ...dados, [name]: value });
  }

  // ▶ Salvar no backend via PUT
  async function salvarAlteracoes() {
    if (!dados.nome || !dados.email || !dados.cnpj) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const usuarioSessao = JSON.parse(sessionStorage.getItem("usuario") || "{}");
      const token = sessionStorage.getItem("token");
      const resp = await fetch(
        `${API_URL}/api/usuarios/${usuarioSessao._id || ""}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(dados),
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        alert(data.error || "Erro ao atualizar usuário.");
        return;
      }

      // Atualiza a sessão com dados essenciais
      const usuarioSessaoAtualizado = {
        _id: data.usuario._id,
        nome: data.usuario.nome,
        tipo: data.usuario.tipo,
        email: data.usuario.email,
      };

      sessionStorage.setItem(
        "usuario",
        JSON.stringify(usuarioSessaoAtualizado)
      );

      alert("Alterações salvas com sucesso!");
      navigate("/fornecedor/pedidos");
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      alert("Erro ao conectar ao servidor.");
    }
  }

  async function excluirConta() {
    const usuarioSessao = JSON.parse(sessionStorage.getItem("usuario"));

    if (!usuarioSessao || !usuarioSessao._id) {
      alert("Usuário não encontrado.");
      return;
    }

    if (!window.confirm("Excluir conta permanentemente?")) return;

    try {
      const token = sessionStorage.getItem("token");
      const resp = await fetch(
        `${API_URL}/api/usuarios/${usuarioSessao._id}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        alert(data.error || "Erro ao excluir conta.");
        return;
      }

      sessionStorage.removeItem("usuario");
      sessionStorage.removeItem("token");
      alert("Conta excluída.");
      navigate("/");
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao conectar ao servidor.");
    }
  }

  if (loading) {
    return (
      <div className="layout-content-inner" style={{ color: "#e6edf3", padding: 40 }}>
        Carregando...
      </div>
    );
  }

  return (
    <div className="layout-content-inner">
      <main style={mainWrap}>
        <div style={formBox}>
          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Nome *</label>
          <input
            name="nome"
            value={dados.nome}
            onChange={handleChange}
            placeholder="Nome"
            style={input}
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>E-mail *</label>
          <input
            name="email"
            value={dados.email}
            onChange={handleChange}
            placeholder="E-mail"
            type="email"
            style={input}
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Senha *</label>
          <input
            name="senha"
            value={dados.senha}
            onChange={handleChange}
            placeholder="Senha"
            type="password"
            style={input}
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>CNPJ *</label>
          <input
            name="cnpj"
            value={dados.cnpj}
            onChange={handleChange}
            placeholder="CNPJ"
            style={input}
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Tipo *</label>
          <input
            disabled
            value={dados.tipo}
            style={{ ...input, background: "#2d333b", color: "#8b949e", cursor: "not-allowed" }}
          />

          <button onClick={salvarAlteracoes} style={btnPrimary}>
            💾 Salvar Alterações
          </button>

          <button onClick={excluirConta} style={btnDanger}>
            ❌ Excluir Conta
          </button>
        </div>
      </main>
    </div>
  );
}

/* ESTILOS */
const pageOuter = {
  backgroundColor: "#0F2D3F",
  minHeight: "100vh",
  padding: 20,
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 40px",
};

const topLeft = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const helloText = {
  fontSize: "1.2rem",
};

const btnVoltar = {
  backgroundColor: "#e07c7c",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: "bold",
};

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const mainWrap = {
  maxWidth: 600,
  margin: "0 auto",
};

const formBox = {
  backgroundColor: CARD_BG,
  border: BORDER,
  borderRadius: 12,
  padding: 30,
  maxWidth: 500,
  width: "100%",
  margin: "0 auto",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  color: "#e6edf3",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: BORDER,
  fontSize: "0.9375rem",
  color: "#1a1a1a",
  backgroundColor: "#fff",
  boxSizing: "border-box",
};

const btnPrimary = {
  width: "100%",
  backgroundColor: "#25C19B",
  color: "#0B1C26",
  border: "none",
  borderRadius: 8,
  padding: "12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.9375rem",
};

const btnDanger = {
  width: "100%",
  backgroundColor: "#FF8882",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.9375rem",
};