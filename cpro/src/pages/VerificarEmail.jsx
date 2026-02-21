import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logo.png";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

export default function VerificarEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verificando"); // verificando, sucesso, erro
  const [mensagem, setMensagem] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("erro");
      setMensagem("Token de verificação não encontrado na URL.");
      return;
    }

    verificarEmail(token);
  }, [searchParams]);

  async function verificarEmail(token) {
    try {
      const resp = await fetch(`${API_URL}/api/usuarios/verificar-email?token=${token}`, {
        method: "GET",
      });

      const data = await resp.json();

      if (!resp.ok) {
        setStatus("erro");
        setMensagem(data.error || "Erro ao verificar email.");
        return;
      }

      setStatus("sucesso");
      setMensagem(data.message || "Email verificado com sucesso!");
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      setStatus("erro");
      setMensagem("Erro ao conectar com o servidor. Tente novamente.");
    }
  }

  async function reenviarEmail() {
    if (!email.trim()) {
      alert("Por favor, informe seu email.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/api/usuarios/reenviar-verificacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await resp.json();

      if (resp.ok) {
        alert(data.message || "Email de verificação reenviado! Verifique sua caixa de entrada.");
      } else {
        alert(data.error || "Erro ao reenviar email.");
      }
    } catch (error) {
      console.error("Erro ao reenviar email:", error);
      alert("Erro ao conectar com o servidor. Tente novamente.");
    }
  }

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
      padding: "20px",
    },
    card: {
      background: "#161b22",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      padding: "40px",
      maxWidth: "500px",
      width: "100%",
      textAlign: "center",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    },
    logo: {
      width: "120px",
      marginBottom: "30px",
    },
    titulo: {
      color: "#e6edf3",
      fontSize: "24px",
      fontWeight: "600",
      marginBottom: "20px",
    },
    mensagem: {
      color: status === "sucesso" ? "#238636" : status === "erro" ? "#f85149" : "#c9d1d9",
      fontSize: "16px",
      lineHeight: "1.6",
      marginBottom: "30px",
    },
    input: {
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "#0d1117",
      color: "#e6edf3",
      fontSize: "14px",
    },
    botao: {
      padding: "12px 24px",
      borderRadius: "6px",
      border: "none",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    botaoPrimario: {
      background: "#238636",
      color: "white",
    },
    botaoSecundario: {
      background: "transparent",
      color: "#58a6ff",
      border: "1px solid rgba(88,166,255,0.3)",
    },
    loading: {
      color: "#58a6ff",
      fontSize: "16px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={logo} alt="RP Vista Pro" style={styles.logo} />
        
        <h1 style={styles.titulo}>Verificação de Email</h1>

        {status === "verificando" && (
          <div>
            <p style={styles.loading}>Verificando seu email...</p>
          </div>
        )}

        {status === "sucesso" && (
          <div>
            <p style={styles.mensagem}>✅ {mensagem}</p>
            <p style={{ color: "#8b949e", fontSize: "14px" }}>
              Redirecionando para o login...
            </p>
          </div>
        )}

        {status === "erro" && (
          <div>
            <p style={styles.mensagem}>❌ {mensagem}</p>
            
            <div style={{ marginTop: "30px", padding: "20px", background: "#0d1117", borderRadius: "6px" }}>
              <p style={{ color: "#c9d1d9", fontSize: "14px", marginBottom: "15px" }}>
                Não recebeu o email? Reenvie o link de verificação:
              </p>
              <input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={reenviarEmail}
                style={{ ...styles.botao, ...styles.botaoPrimario, width: "100%" }}
              >
                Reenviar Email
              </button>
            </div>

            <button
              onClick={() => navigate("/")}
              style={{ ...styles.botao, ...styles.botaoSecundario, marginTop: "20px", width: "100%" }}
            >
              Voltar para Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
