import logo from "../assets/logo.png";
import { safeLogout } from "../utils/safeLogout";

export default function LayoutComprador({ children, nomeComprador }) {
  return (
    <div style={{ backgroundColor: "#0F2D3F", minHeight: "100vh", color: "white", fontFamily: "Poppins, sans-serif" }}>
      {/* 🔹 Barra superior */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 40px",
          backgroundColor: "#0F2D3F",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          height: "100px", // mesmo tamanho ajustado do seu home
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img src={logo} alt="Logo" style={{ width: "140px" }} />
          <h3 style={{ fontWeight: "bold", fontSize: "1.3rem" }}>Olá, {nomeComprador || "usuário"}!</h3>
        </div>

        <button
          onClick={safeLogout}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🚪 Sair
        </button>
      </header>

      {/* 🔸 conteúdo das páginas */}
      <main style={{ padding: "40px", display: "flex", justifyContent: "center" }}>
        {children}
      </main>
    </div>
  );
}