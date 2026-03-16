import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/theme.css";
import { getApiUrl } from "../utils/apiUrl";

export default function Login() {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Informe seu nome de usuário (ex: marcio, priscilla, guilherme).");
      return;
    }
    if (!senha.trim()) {
      alert("Informe sua senha.");
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const baseUrl = getApiUrl();

      const loginInput = String(nome || "").trim().normalize("NFC").replace(/\s+/g, " ");
      const resp = await fetch(`${baseUrl}/api/usuarios/login`, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: loginInput, email: loginInput, senha: senha.trim() }),
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await resp.json();
      } catch (parseErr) {
        setLoading(false);
        alert("Resposta inválida do servidor. Verifique se o backend está rodando.");
        return;
      }

      if (!resp.ok) {
        setLoading(false);
        alert(data.error || "Erro ao realizar login.");
        return;
      }

      const usuario = data.usuario;

      if (!usuario || !usuario._id) {
        setLoading(false);
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

      // Tipo em minúsculo para comparação (backend pode retornar variações)
      const tipoRaw = (usuario.tipo || "").toLowerCase();
      // Normaliza "questionário" / "questionario" para "questionario"
      let tipo = tipoRaw.includes("question") ? "questionario" : tipoRaw;
      // Fallback: usuários questionário usam cnpj 00000000000191 (mesmo se tipo vier incorreto)
      const cnpjLimpo = String(usuario.cnpj || "").replace(/\D/g, "");
      if (cnpjLimpo === "00000000000191") {
        tipo = "questionario";
      }

      // Salva resumo do usuário autenticado
      // Para comprador: compradorId e empresa = próprio _id (um usuário = uma empresa/catálogo)
      const usuarioSessao = {
        _id: usuario._id,
        nome: usuario.nome,
        tipo,
        cnpj: usuario.cnpj ?? null,
        email: usuario.email || nome?.trim(),
        emailVerificado: usuario.emailVerificado || false,
        ...(tipo === "comprador" ? { compradorId: usuario._id, empresa: usuario._id } : {}),
        ...(tipo === "questionario" ? {} : {}),
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioSessao));

      // Redirecionar conforme tipo
      if (tipo === "comprador") {
        navigate("/meus-pedidos");
      } else if (tipo === "fornecedor") {
        navigate("/fornecedor/pedidos");
      } else if (tipo === "questionario") {
        navigate("/questionario");
      } else {
        setLoading(false);
        alert("Tipo de usuário inválido! Entre em contato com o suporte. Tipo recebido: " + JSON.stringify(usuario.tipo ?? "(vazio)"));
        return;
      }
    } catch (error) {
      setLoading(false);
      console.error("Erro de conexão:", error);
      if (error.name === "AbortError") {
        alert("O servidor demorou para responder. Se estiver no Render, aguarde até 1 minuto e tente novamente (o servidor pode estar acordando).");
      } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        alert("Erro ao conectar com o servidor. Verifique:\n\n• Se o backend está rodando (localhost:4001 ou Render)\n• Sua conexão com a internet\n• Se a URL da API está correta no .env");
      } else {
        alert("Erro ao conectar com o servidor.");
      }
    }
  }

  return (
    <div style={pageWrapper} className="login-page">
      <div style={logoContainer}>
        <img src={logo} alt="Logo" style={logoImg} />
        <h1 style={titulo}>BEM-VINDO(A)</h1>
      </div>

      <form onSubmit={handleLogin} style={formStyle}>
        <label style={labelStyle}>Nome de usuário ou e-mail</label>
        <input
          type="text"
          name="nome"
          autoComplete="username"
          inputMode="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={inputStyle}
          placeholder="Ex: marcio, priscilla, guilherme"
          className="login-input"
        />

        <label style={labelStyle}>Senha</label>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
          placeholder="Digite sua senha"
          className="login-input"
        />

        <button type="submit" style={btnPrimary} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
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
  background: "transparent",
  color: "#e6edf3",
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