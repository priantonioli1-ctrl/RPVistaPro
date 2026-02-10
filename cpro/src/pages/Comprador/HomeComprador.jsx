import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../../assets/logo.png";

function HomeComprador() {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  const [comprador, setComprador] = useState(null);

  useEffect(() => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario"));

    if (!usuario?._id) {
      navigate("/");
      return;
    }

    const tipo = (usuario.tipo || "").toLowerCase();
    if (tipo !== "comprador") {
      navigate(tipo === "fornecedor" ? "/fornecedor/pedidos" : "/");
      return;
    }

    async function carregarComprador() {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/usuarios/${usuario._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (!res.ok) {
          navigate("/");
          return;
        }

        setComprador(data);
      } catch (err) {
        console.error("Erro ao carregar comprador:", err);
      }
    }

    carregarComprador();
  }, [navigate, API_URL]);

  if (!comprador) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: 24,
      }}
    >
      <img
        src={logo}
        alt="RP Vista Pro"
        style={{
          maxWidth: "min(420px, 90vw)",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default HomeComprador;
