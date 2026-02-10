import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../../assets/logo.png";

function HomeFornecedor() {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  const [fornecedor, setFornecedor] = useState(null);

  useEffect(() => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario"));

    if (!usuario?._id) {
      navigate("/");
      return;
    }

    async function carregarFornecedor() {
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

        setFornecedor(data);
      } catch (error) {
        console.error("Erro ao carregar fornecedor", error);
      }
    }

    carregarFornecedor();
  }, [navigate, API_URL]);

  if (!fornecedor) return null;

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

export default HomeFornecedor;
