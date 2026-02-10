import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { RAMOS_ATUACAO } from "../../constants/ramosAtuacao";

export default function PerfilComprador() {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

  const [comprador, setComprador] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioSessao = JSON.parse(sessionStorage.getItem("usuario"));

    if (!usuarioSessao?.id && !usuarioSessao?._id) {
      navigate("/login");
      return;
    }

    const id = usuarioSessao._id;

    async function carregarComprador() {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (!res.ok) {
          Swal.fire("Erro", data.error || "Erro ao carregar perfil.", "error");
          navigate("/login");
          return;
        }

        setComprador({
          nome: data.nome,
          email: data.email,
          senha: data.senha,
          cnpj: data.cnpj,
          tipo: data.tipo,
          ramoAtuacao: data.ramoAtuacao || "",
          _id: data._id,
        });

        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar comprador:", err);
        Swal.fire("Erro", "Falha de conexão com o servidor.", "error");
      }
    }

    carregarComprador();
  }, [navigate, API_URL]);

  function handleChange(e) {
    const { name, value } = e.target;
    setComprador({ ...comprador, [name]: value });
  }

  async function salvarAlteracoes() {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/usuarios/${comprador._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(comprador),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire("Erro", data.error || "Não foi possível salvar alterações.", "error");
        return;
      }

      // Atualiza sessão apenas com o essencial
      sessionStorage.setItem(
        "usuario",
        JSON.stringify({
          _id: data.usuario._id,
          nome: data.usuario.nome,
          tipo: data.usuario.tipo,
          email: data.usuario.email,
          ramoAtuacao: data.usuario.ramoAtuacao || "",
        })
      );

      Swal.fire("Sucesso!", "Perfil atualizado com sucesso!", "success");
      navigate("/meus-pedidos");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar alterações.", "error");
    }
  }

  async function excluirConta() {
    const confirm = await Swal.fire({
      title: "Excluir conta?",
      text: "Essa ação não pode ser desfeita!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      const token = sessionStorage.getItem("token");
      await fetch(`${API_URL}/api/usuarios/${comprador._id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      sessionStorage.removeItem("usuario");
      sessionStorage.removeItem("token");

      Swal.fire("Removido!", "Sua conta foi excluída.", "success");
      navigate("/login");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Não foi possível excluir a conta.", "error");
    }
  }

  if (loading || !comprador) return null;

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={container}>
        <section style={card}>

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Nome *</label>
          <input
            style={input}
            name="nome"
            value={comprador.nome}
            onChange={handleChange}
            placeholder="Nome da Empresa"
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>E-mail *</label>
          <input
            style={input}
            name="email"
            value={comprador.email}
            onChange={handleChange}
            placeholder="E-mail"
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>CNPJ *</label>
          <input
            style={input}
            name="cnpj"
            value={comprador.cnpj}
            onChange={handleChange}
            placeholder="CNPJ"
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Ramo de atuação da empresa</label>
          <select
            style={input}
            name="ramoAtuacao"
            value={comprador.ramoAtuacao || ""}
            onChange={handleChange}
            className="campo-fundo-claro"
            aria-label="Ramo de atuação"
          >
            <option value="">Selecione...</option>
            {(RAMOS_ATUACAO.includes(comprador.ramoAtuacao) ? RAMOS_ATUACAO : [...RAMOS_ATUACAO, comprador.ramoAtuacao].filter(Boolean)).map((ramo) => (
              <option key={ramo} value={ramo}>
                {ramo}
              </option>
            ))}
          </select>

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Senha *</label>
          <input
            style={input}
            name="senha"
            type="password"
            value={comprador.senha}
            onChange={handleChange}
            placeholder="Senha"
            className="campo-fundo-claro"
          />

          <label style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>Tipo *</label>
          <input
            disabled
            style={{ ...input, backgroundColor: "#2d333b", color: "#8b949e", cursor: "not-allowed" }}
            value={comprador.tipo}
          />

          <button style={btnPrimary} onClick={salvarAlteracoes}>
            Salvar Alterações
          </button>

          <button style={btnDanger} onClick={excluirConta}>
            Excluir Minha Conta
          </button>
        </section>
      </main>
    </div>
  );
}

/* ========= ESTILOS ========= */

const page = { background: "#0F2D3F", minHeight: "100vh", fontFamily: "Poppins, sans-serif", color: "white" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 40px" };
const logoRow = { display: "flex", alignItems: "center", gap: 14 };
const headerBtns = { display: "flex", alignItems: "center", gap: 12 };
const btnVoltar = { background: "#3D566E", border: "none", borderRadius: 8, padding: "10px 18px", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 15 };
const logoutBtn = { background: "#e74c3c", border: "none", borderRadius: 8, padding: "10px 18px", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 15 };
const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";

const container = { maxWidth: 600, margin: "24px auto", padding: "0 20px" };
const card = { 
  background: CARD_BG, 
  border: BORDER,
  color: "#e6edf3", 
  padding: 30, 
  borderRadius: 12, 
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)", 
  marginBottom: 35,
  display: "flex",
  flexDirection: "column",
  gap: 16
};
const cardTitle = { fontSize: "1.5rem", fontWeight: 700, marginBottom: 20, color: "#e6edf3" };
const input = { 
  padding: "12px", 
  borderRadius: 8, 
  border: BORDER, 
  marginBottom: 12, 
  width: "100%", 
  background: "#fff", 
  fontSize: "0.9375rem", 
  color: "#1a1a1a",
  boxSizing: "border-box"
};
const btnPrimary = { 
  background: "#25c19b", 
  width: "100%", 
  padding: 12, 
  borderRadius: 8, 
  border: "none", 
  color: "#0B1C26", 
  fontWeight: 700, 
  cursor: "pointer", 
  fontSize: "0.9375rem", 
  marginTop: 4 
};
const btnDanger = { 
  background: "#FF8882", 
  width: "100%", 
  padding: 12, 
  borderRadius: 8, 
  border: "none", 
  color: "#fff", 
  fontWeight: 700, 
  cursor: "pointer", 
  fontSize: "0.9375rem", 
  marginTop: 10 
};