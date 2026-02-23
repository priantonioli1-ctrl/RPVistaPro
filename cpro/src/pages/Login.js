import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/theme.css";

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

      // Avisar se email não está verificado (mas não bloquear login)
      if (data.emailNaoVerificado || !usuario.emailVerificado) {
        alert("⚠️ Seu email ainda não foi verificado. Verifique sua caixa de entrada ou spam para ativar sua conta.");
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
        emailVerificado: usuario.emailVerificado || false,
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
    <div style={pageWrapper} className="login-page">
      <div style={logoContainer}>
        <img src={logo} alt="Logo" style={logoImg} />
        <h1 style={titulo}>BEM-VINDO(A)</h1>
      </div>

      <form onSubmit={handleLogin} style={formStyle}>
        <label style={labelStyle}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="Digite seu e-mail"
          className="login-input"
        />

        <label style={labelStyle}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
          placeholder="Digite sua senha"
          className="login-input"
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

/* --- ESTILOS (tema da plataforma: dark/neon) --- */
const pageWrapper = {
  background: "var(--content-bg-grad)",
  color: "var(--text)",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-sans)",
  padding: 0,
  margin: 0,
  boxSizing: "border-box",
};

const logoContainer = {
  textAlign: "center",
  marginBottom: "30px",
};

const logoImg = {
  width: "390px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontFamily: '"Poppins", "Inter", sans-serif',
  fontSize: "1.8rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  marginTop: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "380px",
  background: "transparent",
  padding: "30px",
  borderRadius: "var(--card-radius)",
  border: "var(--card-border)",
  boxSizing: "border-box",
  margin: 0,
};

const labelStyle = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  marginBottom: "6px",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle = {
  padding: "12px 14px",
  marginBottom: "16px",
  borderRadius: "var(--input-radius)",
  border: "var(--card-border)",
  background: "var(--input-bg)",
  color: "var(--input-color)",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary = {
  background: "var(--gradient-login-cyan)",
  color: "#0F011E",
  border: "none",
  padding: "12px",
  borderRadius: "var(--input-radius)",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "1rem",
  marginTop: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  boxShadow: "var(--login-btn-shadow)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
};

const btnSecondary = {
  marginTop: "20px",
  background: "transparent",
  color: "var(--text-muted)",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
  fontWeight: 500,
  fontSize: "0.9375rem",
};