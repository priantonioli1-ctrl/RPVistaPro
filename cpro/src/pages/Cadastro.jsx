import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { cadastrarUsuario } from "../services/api.js";
import { RAMOS_ATUACAO } from "../constants/ramosAtuacao";

export default function Cadastro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    senha: "",
    tipo: "", // <-- agora bate com o backend
    ramoAtuacao: "", // ramo de atuação da empresa (para comprador)
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.nome || !form.cnpj || !form.email || !form.senha || !form.tipo) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        tipo: form.tipo,
        cnpj: form.cnpj,
      };
      if (form.tipo === "comprador" && form.ramoAtuacao?.trim()) {
        payload.ramoAtuacao = form.ramoAtuacao.trim();
      }
      const response = await cadastrarUsuario(payload);

      alert(response.message || "Cadastro realizado com sucesso!");
      navigate("/login");

    } catch (err) {
      console.error(err);
      alert(err?.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container} lang="pt" translate="no">
      <img src={logo} alt="logo" style={styles.logo} />

      <h1 style={styles.title}>Cadastro</h1>

      <form onSubmit={handleSubmit} style={styles.form} translate="no">

        <label>Nome *</label>
        <input
          name="nome"
          value={form.nome}
          onChange={handleChange}
          placeholder="Digite seu nome"
          required
        />

        <label>CNPJ *</label>
        <input
          name="cnpj"
          value={form.cnpj}
          onChange={handleChange}
          placeholder="00.000.000/0000-00"
          required
        />

        <label>Email *</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="exemplo@email.com"
          required
        />

        <label>Senha *</label>
        <input
          type="password"
          name="senha"
          value={form.senha}
          onChange={handleChange}
          placeholder="********"
          required
        />

        <label>Tipo de Usuário *</label>
        <select
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          required
          aria-label="Tipo de usuário: Comprador ou Fornecedor"
        >
          <option value="">Selecione...</option>
          <option value="comprador">Comprador</option>
          <option value="fornecedor">Fornecedor</option>
        </select>

        {form.tipo === "comprador" && (
          <>
            <label>Ramo de atuação da empresa</label>
            <select
              name="ramoAtuacao"
              value={form.ramoAtuacao}
              onChange={handleChange}
              aria-label="Ramo de atuação"
            >
              <option value="">Selecione...</option>
              {RAMOS_ATUACAO.map((ramo) => (
                <option key={ramo} value={ramo}>
                  {ramo}
                </option>
              ))}
            </select>
          </>
        )}

        <button type="submit" style={styles.btnPrimary} disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      <button onClick={() => navigate("/login")} style={styles.btnSecondary}>
        Já tenho cadastro
      </button>
    </div>
  );
}

// Estilos
const styles = {
  container: {
    maxWidth: 400,
    margin: "auto",
    padding: 20,
    textAlign: "center",
  },
  logo: {
    width: 120,
    marginBottom: 10,
  },
  title: {
    marginBottom: 20,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  btnPrimary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#0066ff",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    borderRadius: 5,
  },
  btnPrimaryDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  btnSecondary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "transparent",
    border: "1px solid #0066ff",
    color: "#0066ff",
    borderRadius: 5,
    cursor: "pointer",
  },
};