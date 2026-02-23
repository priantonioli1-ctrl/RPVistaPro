import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RecuperarSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    alert(`Um link de redefinição de senha foi enviado para: ${email}`);
    navigate("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#283e4d",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "300px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "4px",
          background: "transparent",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#e6edf3" }}>Recuperar Senha</h2>

        <input
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "10px 12px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#e6edf3",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px",
            background: "#50a0a2",
            color: "white",
            fontWeight: "bold",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Enviar link
        </button>
      </form>
    </div>
  );
}

export default RecuperarSenha;
