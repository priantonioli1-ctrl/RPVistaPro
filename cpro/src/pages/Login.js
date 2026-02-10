import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    if (!email.trim() || !senha.trim()) {
      alert("Informe e-mail e senha.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/api/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      let data;
      try {
        data = await resp.json();
      } catch {
        alert("Resposta inválida do servidor.");
        return;
      }

      if (!resp.ok) {
        alert(data.error || "Erro ao realizar login.");
        return;
      }

      const usuario = data.usuario;

      if (!usuario || !usuario._id) {
        alert("Usuário inválido retornado pelo servidor.");
        return;
      }

      // Limpa qualquer sessão antiga
      sessionStorage.removeItem("usuario");
      sessionStorage.removeItem("token");

      // Salva o token para as requisições autenticadas
      if (data.token) {
        sessionStorage.setItem("token", data.token);
      }

      // Tipo em minúsculo para comparação (backend pode retornar "Comprador" em alguns casos)
      const tipo = (usuario.tipo || "").toLowerCase();

      // Salva resumo do usuário autenticado
      // Para comprador: compradorId e empresa = próprio _id (um usuário = uma empresa/catálogo)
      const usuarioSessao = {
        _id: usuario._id,
        nome: usuario.nome,
        tipo,
        cnpj: usuario.cnpj ?? null,
        email: email.trim().toLowerCase(),
        ...(tipo === "comprador" ? { compradorId: usuario._id, empresa: usuario._id } : {}),
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioSessao));

      // Redirecionar conforme tipo (página inicial removida: vai direto para Meus Pedidos / Pedidos)
      if (tipo === "comprador") {
        navigate("/meus-pedidos");
      } else if (tipo === "fornecedor") {
        navigate("/fornecedor/pedidos");
      } else {
        alert("Tipo de usuário inválido!");
        return;
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Erro ao conectar com o servidor.");
    }
  }

  return (
    <div style={pageWrapper}>
      <div style={logoContainer}>
        <img src={logo} alt="Logo" style={{ width: "390px" }} />
        <h1 style={titulo}>Bem-vindo(a)</h1>
      </div>

      <form onSubmit={handleLogin} style={formStyle}>
        <label style={labelStyle}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="Digite seu e-mail"
        />

        <label style={labelStyle}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
          placeholder="Digite sua senha"
        />

        <button type="submit" style={btnPrimary}>
          Entrar
        </button>
      </form>

      <button style={btnSecondary} onClick={() => navigate("/cadastro")}>
        Não tenho cadastro
      </button>
    </div>
  );
}

/* --- ESTILOS --- */
const pageWrapper = {
  backgroundColor: "#0F2D3F",
  color: "#fff",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Poppins, sans-serif",
  padding: "20px",
};

const logoContainer = {
  textAlign: "center",
  marginBottom: "30px",
};

const titulo = {
  fontSize: "1.8rem",
  fontWeight: "bold",
  color: "#ffffff",
  marginTop: "10px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "380px",
  background: "#152B3C",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
};

const labelStyle = {
  fontWeight: "500",
  fontSize: "0.95rem",
  marginBottom: "6px",
  color: "#e0e0e0",
};

const inputStyle = {
  padding: "12px 14px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid #3D566E",
  background: "#1E3A4C",
  color: "#ffffff",
  fontSize: "1rem",
  outline: "none",
};

const btnPrimary = {
  background: "#25C19B",
  color: "#fff",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "1rem",
  marginTop: "10px",
};

const btnSecondary = {
  marginTop: "20px",
  background: "transparent",
  color: "#25C19B",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
  fontWeight: "500",
};