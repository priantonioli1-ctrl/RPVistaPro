// src/components/CatalogoTabela.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CatalogoTabela() {
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
    const key = usuario?.empresa
      ? `catalogo_comprador_${usuario.empresa}`
      : "catalogo_comprador";

    const catalogo = JSON.parse(localStorage.getItem(key) || "[]");
    setItens(catalogo);
  }, []);

  const toggleItem = (codigo) => {
    setSelecionados((prev) =>
      prev.includes(codigo)
        ? prev.filter((id) => id !== codigo)
        : [...prev, codigo]
    );
  };

  const adicionarCotacao = () => {
    const selecionadosData = itens.filter((i) =>
      selecionados.includes(i.codigo)
    );

    if (selecionadosData.length === 0) {
      alert("Selecione ao menos um produto.");
      return;
    }

    localStorage.setItem(
      "itensSelecionadosCotacao",
      JSON.stringify(selecionadosData)
    );
    navigate("/resumo-cotacao");
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{ marginBottom: 12, color: "#1F2E45" }}>
        🛍️ Catálogo de Produtos
      </h3>

      {itens.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Nenhum item encontrado no catálogo.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                <th style={th}>Selecionar</th>
                <th style={th}>Seção</th>
                <th style={th}>Produto</th>
                <th style={th}>Marca</th>
                <th style={th}>Gramatura</th>
                <th style={th}>Similar</th>
                <th style={th}>Código</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderTop: "1px solid #E5E7EB",
                    background:
                      idx % 2 === 0 ? "#fff" : "rgba(243,244,246,0.5)",
                  }}
                >
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={selecionados.includes(item.codigo)}
                      onChange={() => toggleItem(item.codigo)}
                    />
                  </td>
                  <td style={td}>{item.secao}</td>
                  <td style={td}>{item.produto}</td>
                  <td style={td}>{item.marca}</td>
                  <td style={td}>{item.gramatura}</td>
                  <td style={td}>{item.similar ? "Sim" : "Não"}</td>
                  <td style={td}>{item.codigo}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button
              onClick={adicionarCotacao}
              style={{
                background: "#25C19B",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ➕ Adicionar à Cotação
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const th = {
  padding: "10px",
  fontWeight: 700,
  color: "#1F2E45",
  textAlign: "left",
  borderBottom: "1px solid #E5E7EB",
};

const td = {
  padding: "8px 10px",
  color: "#1F2937",
  fontSize: "0.9rem",
};