// src/pages/Comprador/Comandas.jsx — Mesas/comandas em aberto
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
const BORDER = "1px solid rgba(255,255,255,0.08)";

function ModalSenha({ titulo, onConfirmar, onCancelar }) {
  const [senha, setSenha] = useState("");
  return (
    <div style={overlay} onClick={onCancelar}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", color: "#e6edf3" }}>{titulo}</h3>
        <p style={{ color: "#8b949e", fontSize: "0.9375rem", marginBottom: 12 }}>Digite sua senha para confirmar:</p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          style={inputDark}
          className="campo-fundo-claro"
          autoFocus
        />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onCancelar} style={btnSecundario}>Cancelar</button>
          <button type="button" onClick={() => onConfirmar(senha)} style={btnPrimario}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export default function Comandas() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [criando, setCriando] = useState(false);
  const [modalSenha, setModalSenha] = useState(null);

  function getEmpresaId() {
    return usuarioAtual?.compradorId || (usuarioAtual?.tipo === "comprador" ? usuarioAtual?._id : null);
  }

  function getToken() {
    return sessionStorage.getItem("token");
  }

  useEffect(() => {
    const u = sessionStorage.getItem("usuario");
    if (!u) {
      navigate("/login");
      return;
    }
    setUsuarioAtual(JSON.parse(u));
  }, [navigate]);

  useEffect(() => {
    if (!usuarioAtual) return;
    carregar();
  }, [usuarioAtual]);

  async function carregar() {
    const empresaId = getEmpresaId();
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/comandas?status=aberta`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      const lista = await res.json();
      setComandas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Não foi possível carregar as comandas.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function abrirComanda() {
    const codigo = (novoCodigo || "").trim();
    if (!codigo) {
      Swal.fire("Atenção", "Informe o código da mesa/comanda.", "warning");
      return;
    }
    setCriando(true);
    try {
      const res = await fetch(`${API_URL}/api/comandas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao abrir comanda.");
      Swal.fire("Sucesso", `Comanda "${codigo}" aberta.`, "success");
      setNovoCodigo("");
      carregar();
    } catch (err) {
      Swal.fire("Erro", err.message || "Não foi possível abrir.", "error");
    } finally {
      setCriando(false);
    }
  }

  async function solicitarSenha(acao, callback) {
    setModalSenha({
      titulo: acao,
      callback,
    });
  }

  async function confirmarSenha(senha) {
    if (!modalSenha) return;
    try {
      const res = await fetch(`${API_URL}/api/caixa/confirmar-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Senha incorreta.");
      setModalSenha(null);
      modalSenha.callback?.();
    } catch (err) {
      Swal.fire("Erro", err.message || "Senha incorreta.", "error");
    }
  }

  async function removerItem(c, item) {
    const itemId = item._id;
    if (!itemId) return;
    solicitarSenha("Remover item da comanda", async () => {
      try {
        const res = await fetch(`${API_URL}/api/comandas/${c._id}/itens/${itemId}`, {
          method: "PATCH",
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        if (!res.ok) throw new Error("Erro ao remover.");
        Swal.fire("Sucesso", "Item removido.", "success");
        carregar();
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      }
    });
  }

  async function cancelarComanda(c) {
    solicitarSenha("Cancelar comanda (descartar itens)", async () => {
      try {
        const res = await fetch(`${API_URL}/api/comandas/${c._id}/cancelar`, {
          method: "POST",
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        if (!res.ok) throw new Error("Erro ao cancelar.");
        Swal.fire("Sucesso", "Comanda cancelada.", "success");
        carregar();
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      }
    });
  }

  async function fecharComanda(c) {
    if ((c.itens || []).length === 0) {
      Swal.fire("Atenção", "Comanda sem itens. Use Cancelar para descartar.", "warning");
      return;
    }
    const { value: formaPagamento } = await Swal.fire({
      title: "Forma de pagamento",
      html: `
        <select id="forma-pgto" class="swal2-input" style="width:100%;padding:10px;margin-top:8px">
          <option value="Dinheiro">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="Cartão Débito">Cartão Débito</option>
          <option value="Cartão Crédito">Cartão Crédito</option>
          <option value="Vale">Vale</option>
          <option value="Convênio">Convênio</option>
          <option value="Outro">Outro</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Fechar comanda",
      confirmButtonColor: "#20b5a6",
      preConfirm: () => document.getElementById("forma-pgto")?.value || "Dinheiro",
    });
    if (!formaPagamento) return;
    try {
      const res = await fetch(`${API_URL}/api/comandas/${c._id}/fechar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ formaPagamento }),
      });
      if (!res.ok) throw new Error("Erro ao fechar.");
      Swal.fire("Sucesso", `Comanda "${c.codigo}" fechada. Total: R$ ${(c.total || 0).toFixed(2)} (${formaPagamento})`, "success");
      carregar();
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  function editarComanda(c) {
    navigate("/frente-de-loja", { state: { comandaId: c._id, codigoComanda: c.codigo } });
  }

  if (!usuarioAtual) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={mainWrap}>
        <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>Mesas em aberto</h2>
        <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
          Comandas que não precisam ser fechadas para continuar vendendo. Outras contas podem ser abertas normalmente.
        </p>

        <div style={formNova}>
          <input
            placeholder="Código (ex.: Mesa 1, Comanda 05)"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
            style={inputDark}
            className="campo-fundo-claro"
          />
          <button type="button" onClick={abrirComanda} disabled={criando} style={btnAbrir}>
            {criando ? "Abrindo..." : "+ Abrir comanda"}
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#8b949e" }}>Carregando...</p>
        ) : comandas.length === 0 ? (
          <p style={{ color: "#8b949e", fontStyle: "italic" }}>Nenhuma comanda aberta.</p>
        ) : (
          <div style={gridComandas}>
            {comandas.map((c) => (
              <div key={c._id} style={cardComanda}>
                <div style={cardHeader}>
                  <strong style={{ fontSize: "1.25rem", color: "#e6edf3" }}>{c.codigo}</strong>
                  <span style={badgeTotal}>R$ {(c.total || 0).toFixed(2)}</span>
                </div>
                <ul style={listaItens}>
                  {(c.itens || []).length === 0 ? (
                    <li style={{ color: "#8b949e" }}>Sem itens</li>
                  ) : (
                    (c.itens || []).map((it, i) => (
                      <li key={it._id || i} style={itemRow}>
                        <span>{it.quantidade}× {it.nome} — R$ {(it.quantidade * (it.precoUnitario || 0)).toFixed(2)}</span>
                        <button type="button" onClick={() => removerItem(c, it)} style={btnRemover} title="Remover item">×</button>
                      </li>
                    ))
                  )}
                </ul>
                <div style={botoesAcao}>
                  <button type="button" onClick={() => editarComanda(c)} style={btnEditar}>Adicionar itens</button>
                  <button type="button" onClick={() => fecharComanda(c)} style={btnFechar} disabled={!(c.itens || []).length}>Fechar</button>
                  <button type="button" onClick={() => cancelarComanda(c)} style={btnCancelar}>Cancelar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalSenha && (
        <ModalSenha
          titulo={modalSenha.titulo}
          onConfirmar={confirmarSenha}
          onCancelar={() => setModalSenha(null)}
        />
      )}
    </div>
  );
}

const mainWrap = { margin: "24px 0", padding: "0 20px 40px" };
const formNova = { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" };
const inputDark = {
  padding: "10px 14px",
  borderRadius: 6,
  border: BORDER,
  background: "rgba(0,0,0,0.2)",
  color: "#e6edf3",
  fontSize: "1rem",
  minWidth: 220,
};
const btnAbrir = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
};
const gridComandas = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 };
const cardComanda = {
  background: "rgba(255,255,255,0.04)",
  border: BORDER,
  borderRadius: 8,
  padding: 20,
};
const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 };
const badgeTotal = { color: "#00F2FF", fontWeight: 700, fontSize: "1.125rem" };
const listaItens = { paddingLeft: 20, margin: "0 0 16px", color: "#e6edf3", maxHeight: 120, overflowY: "auto", listStyle: "none" };
const itemRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4, fontSize: "0.875rem" };
const btnRemover = { background: "transparent", border: "none", color: "#f85149", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1, padding: "0 4px" };
const botoesAcao = { display: "flex", gap: 8, flexWrap: "wrap" };
const btnEditar = {
  padding: "8px 14px",
  borderRadius: 4,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const btnFechar = {
  padding: "8px 14px",
  borderRadius: 4,
  border: "none",
  background: "#25C19B",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const btnCancelar = {
  padding: "8px 14px",
  borderRadius: 4,
  border: "1px solid rgba(248,81,73,0.5)",
  background: "transparent",
  color: "#f85149",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalBox = { background: "rgba(20,2,42,0.98)", border: BORDER, borderRadius: 8, padding: 24, maxWidth: 360, width: "90%" };
const btnPrimario = { padding: "10px 20px", borderRadius: 6, border: "none", background: "var(--gradient-btn-primary)", color: "#0B1C26", fontWeight: 600, cursor: "pointer" };
const btnSecundario = { padding: "10px 20px", borderRadius: 6, border: BORDER, background: "transparent", color: "#8b949e", fontWeight: 600, cursor: "pointer" };
