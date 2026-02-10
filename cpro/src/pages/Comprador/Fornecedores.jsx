import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";

const BORDER = "1px solid rgba(255,255,255,0.08)";
const CARD_BG = "#161b22";
const AZUL = "#2980b9";

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
  });
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!usuario) {
      navigate("/login");
      return;
    }

    setUsuarioAtual(usuario);

    const locais = JSON.parse(localStorage.getItem("fornecedores") || "[]");

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";
    const token = sessionStorage.getItem("token");

    async function carregarFornecedoresSistema() {
      try {
        const res = await fetch(`${API_URL}/api/usuarios`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const usuarios = await res.json();
        const fornecedoresDoSistema = (Array.isArray(usuarios) ? usuarios : [])
          .filter((u) => u.tipo && String(u.tipo).toLowerCase() === "fornecedor")
          .map((u) => ({
            nome: (u.nome || u.empresa || "").toString().toUpperCase(),
            cnpj: u.cnpj || "",
            telefone: u.telefone || "",
            email: u.email || "",
            origem: "sistema",
          }));

        const nomesLocais = locais.map((f) => (f.nome || "").toUpperCase());
        const unicosDoSistema = fornecedoresDoSistema.filter(
          (f) => f.nome && !nomesLocais.includes(f.nome)
        );
        const combinados = [...locais, ...unicosDoSistema];
        setFornecedores(combinados);
        localStorage.setItem("fornecedores", JSON.stringify(combinados));
      } catch (err) {
        console.error("Erro ao carregar fornecedores da plataforma:", err);
        setFornecedores(locais);
      }
    }

    carregarFornecedoresSistema();
  }, [navigate]);

  function salvarFornecedor() {
    if (!novoFornecedor.nome || !novoFornecedor.cnpj) {
      alert("Preencha ao menos o nome e o CNPJ.");
      return;
    }

    const atualizado = [
      ...fornecedores,
      { ...novoFornecedor, nome: novoFornecedor.nome.toUpperCase() },
    ];
    setFornecedores(atualizado);
    localStorage.setItem("fornecedores", JSON.stringify(atualizado));

    setNovoFornecedor({ nome: "", cnpj: "", telefone: "", email: "" });
    alert("Fornecedor cadastrado com sucesso!");
  }

  function editarCampo(index, campo, valor) {
    const atualizado = [...fornecedores];
    atualizado[index][campo] =
      campo === "nome" ? valor.toUpperCase() : valor;
    setFornecedores(atualizado);
    localStorage.setItem("fornecedores", JSON.stringify(atualizado));
  }

  function excluirFornecedor(index) {
    const fornecedor = fornecedores[index];
    if (fornecedor.origem === "sistema") {
      alert("❌ Este fornecedor vem do sistema e não pode ser removido manualmente.");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir este fornecedor?")) {
      const atualizado = fornecedores.filter((_, i) => i !== index);
      setFornecedores(atualizado);
      localStorage.setItem("fornecedores", JSON.stringify(atualizado));
    }
  }

  function gerarPDF() {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Fornecedores", 14, 15);
    doc.setFont("helvetica", "normal");

    let y = 30;
    fornecedores.forEach((f, i) => {
      doc.text(`${i + 1}. ${f.nome}`, 14, y);
      doc.text(`CNPJ: ${f.cnpj || "—"}`, 14, y + 6);
      doc.text(`Telefone: ${f.telefone || "—"}`, 14, y + 12);
      doc.text(`Email: ${f.email || "—"}`, 14, y + 18);
      y += 28;
    });

    doc.save("fornecedores.pdf");
  }

  const fornecedoresFiltrados = fornecedores.filter((f) =>
    f.nome.toUpperCase().includes(filtro.toUpperCase())
  );

  return (
    <div style={{ width: "100%", maxWidth: "none", padding: "0 8px", boxSizing: "border-box" }}>
      {/* Barra de ações */}
      <div style={styles.actions}>
        <input
          placeholder="Buscar fornecedor..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value.toUpperCase())}
          style={styles.inputBusca}
          className="campo-fundo-claro"
        />
        <button onClick={gerarPDF} style={styles.btnSecundario}>
          📄 Gerar PDF
        </button>
      </div>

      {/* Formulário de cadastro */}
      <div style={styles.formCard}>
        <input
          placeholder="Nome do fornecedor"
          value={novoFornecedor.nome}
          onChange={(e) =>
            setNovoFornecedor({
              ...novoFornecedor,
              nome: e.target.value.toUpperCase(),
            })
          }
          style={styles.input}
          className="campo-fundo-claro"
        />
        <input
          placeholder="CNPJ"
          value={novoFornecedor.cnpj}
          onChange={(e) =>
            setNovoFornecedor({ ...novoFornecedor, cnpj: e.target.value })
          }
          style={styles.input}
          className="campo-fundo-claro"
        />
        <input
          placeholder="Telefone"
          value={novoFornecedor.telefone}
          onChange={(e) =>
            setNovoFornecedor({ ...novoFornecedor, telefone: e.target.value })
          }
          style={styles.input}
          className="campo-fundo-claro"
        />
        <input
          placeholder="Email"
          value={novoFornecedor.email}
          onChange={(e) =>
            setNovoFornecedor({ ...novoFornecedor, email: e.target.value })
          }
          style={styles.input}
          className="campo-fundo-claro"
        />
        <button onClick={salvarFornecedor} style={styles.btnPrincipal}>
          ➕ Adicionar Fornecedor
        </button>
      </div>

      {/* Lista de fornecedores */}
      {fornecedoresFiltrados.length === 0 ? (
        <p style={styles.empty}>Nenhum fornecedor encontrado.</p>
      ) : (
        <div style={styles.cardList}>
          {fornecedoresFiltrados.map((f, i) => (
            <div key={i} style={{ ...styles.card, borderLeft: `4px solid ${AZUL}` }}>
              <div style={styles.cardGrid}>
                <div style={styles.cardItem}>
                  <span style={styles.label}>Nome</span>
                  <input
                    value={f.nome}
                    onChange={(e) => editarCampo(i, "nome", e.target.value)}
                    style={styles.inputInline}
                    className="campo-fundo-claro"
                    disabled={f.origem === "sistema"}
                  />
                </div>
                <div style={styles.cardItem}>
                  <span style={styles.label}>CNPJ</span>
                  <input
                    value={f.cnpj}
                    onChange={(e) => editarCampo(i, "cnpj", e.target.value)}
                    style={styles.inputInline}
                    className="campo-fundo-claro"
                    disabled={f.origem === "sistema"}
                  />
                </div>
                <div style={styles.cardItem}>
                  <span style={styles.label}>Telefone</span>
                  <input
                    value={f.telefone || ""}
                    onChange={(e) => editarCampo(i, "telefone", e.target.value)}
                    style={styles.inputInline}
                    className="campo-fundo-claro"
                    disabled={f.origem === "sistema"}
                  />
                </div>
                <div style={styles.cardItem}>
                  <span style={styles.label}>Email</span>
                  <input
                    value={f.email || ""}
                    onChange={(e) => editarCampo(i, "email", e.target.value)}
                    style={styles.inputInline}
                    className="campo-fundo-claro"
                    disabled={f.origem === "sistema"}
                  />
                </div>
              </div>
              <div style={styles.acoes}>
                <button
                  onClick={() => excluirFornecedor(i)}
                  style={styles.btnExcluir}
                  disabled={f.origem === "sistema"}
                  title={
                    f.origem === "sistema"
                      ? "Fornecedor do sistema — não pode ser excluído"
                      : "Excluir fornecedor"
                  }
                >
                  🗑 Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  inputBusca: {
    flex: 2,
    padding: "10px 12px",
    borderRadius: 8,
    border: BORDER,
    minWidth: 200,
    background: CARD_BG,
    color: "#e6edf3",
    fontSize: "1rem",
  },
  btnSecundario: {
    background: "#25c19b",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1rem",
  },
  formCard: {
    background: CARD_BG,
    border: BORDER,
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 24,
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  input: {
    flex: 1,
    minWidth: 150,
    padding: "10px 12px",
    borderRadius: 8,
    border: BORDER,
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "0.9375rem",
  },
  btnPrincipal: {
    background: AZUL,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1rem",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  card: {
    background: CARD_BG,
    border: BORDER,
    borderRadius: 12,
    padding: "20px 24px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "14px 24px",
  },
  cardItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: "0.8125rem",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  inputInline: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: BORDER,
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "0.9375rem",
  },
  acoes: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: BORDER,
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  btnExcluir: {
    background: "transparent",
    color: "#f85149",
    border: "1px solid rgba(248,81,73,0.5)",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9375rem",
  },
  empty: {
    color: "#8b949e",
    fontStyle: "italic",
    fontSize: "1.0625rem",
    textAlign: "center",
    marginTop: 24,
  },
};
