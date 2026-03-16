import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { cadastrarUsuario, loginUsuario } from "../services/api.js";
import { RAMOS_ATUACAO } from "../constants/ramosAtuacao";
import { ESTADOS } from "../constants/estados";

async function fazerLoginAposCadastro(response, email, senha, navigate) {
  let usuario = response.usuario;
  let tipo = (usuario?.tipo || "").toLowerCase().trim();
  // Normaliza "questionário" e fallback por CNPJ (igual ao Login)
  if (tipo.includes("question")) tipo = "questionario";
  const cnpjLimpo = String(usuario?.cnpj || "").replace(/\D/g, "");
  if (cnpjLimpo === "00000000000191") tipo = "questionario";

  if (response.token && usuario?._id) {
    sessionStorage.setItem("token", response.token);
    const usuarioSessao = {
      _id: usuario._id,
      nome: usuario.nome,
      tipo,
      cnpj: usuario.cnpj ?? null,
      email: usuario.email || email,
      emailVerificado: usuario.emailVerificado || false,
      ...(tipo === "comprador" ? { compradorId: usuario._id, empresa: usuario._id } : {}),
    };
    sessionStorage.setItem("usuario", JSON.stringify(usuarioSessao));
  } else {
    const data = await loginUsuario(email, senha);
    sessionStorage.setItem("token", data.token);
    const u = data.usuario;
    tipo = (u.tipo || "").toLowerCase().trim();
    if (tipo.includes("question")) tipo = "questionario";
    const cnpjU = String(u.cnpj || "").replace(/\D/g, "");
    if (cnpjU === "00000000000191") tipo = "questionario";
    sessionStorage.setItem(
      "usuario",
      JSON.stringify({
        _id: u._id,
        nome: u.nome,
        tipo,
        cnpj: u.cnpj ?? null,
        email: u.email || email,
        emailVerificado: u.emailVerificado || false,
        ...(tipo === "comprador" ? { compradorId: u._id, empresa: u._id } : {}),
      })
    );
  }

  if (tipo === "comprador") navigate("/meus-pedidos");
  else if (tipo === "fornecedor") navigate("/fornecedor/pedidos");
  else if (tipo === "questionario") navigate("/questionario");
  else navigate("/");
}

export default function Cadastro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    senha: "",
    tipo: "",
    ramoAtuacao: "",
    endereco: "",
    estado: "",
    empresa: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.tipo === "questionario") {
      if (!form.nome || !form.email || !form.senha) {
        alert("Preencha nome, e-mail e senha.");
        return;
      }
      try {
        setLoading(true);
        const response = await cadastrarUsuario({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          tipo: "questionario",
          cnpj: "00000000000191",
        });
        await fazerLoginAposCadastro(response, form.email, form.senha, navigate);
      } catch (err) {
        console.error(err);
        alert(err?.message || "Erro ao cadastrar. Tente novamente.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!form.nome || !form.cnpj || !form.email || !form.senha || !form.tipo) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    if (form.tipo === "fornecedor" && !form.estado) {
      alert("Para fornecedores, o estado é obrigatório (para calcular a alíquota de ICMS).");
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
      if (form.tipo === "fornecedor") {
        payload.endereco = form.endereco?.trim() || "";
        payload.estado = form.estado?.trim().toUpperCase() || "";
        payload.empresa = form.empresa?.trim() || form.nome;
      }
      const response = await cadastrarUsuario(payload);

      await fazerLoginAposCadastro(response, form.email, form.senha, navigate);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container} className="cadastro-page" lang="pt" translate="no">
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

        {form.tipo !== "questionario" && (
          <>
            <label>CNPJ *</label>
            <input
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0000-00"
              required={form.tipo !== "questionario"}
            />
          </>
        )}

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
          aria-label="Tipo de usuário"
        >
          <option value="">Selecione...</option>
          <option value="comprador">Comprador</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="questionario">Questionário (diagnóstico)</option>
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

        {form.tipo === "fornecedor" && (
          <>
            <label>Nome da empresa *</label>
            <input
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
              placeholder="Nome da empresa (usado no catálogo)"
            />
            <label>Endereço</label>
            <input
              name="endereco"
              value={form.endereco}
              onChange={handleChange}
              placeholder="Rua, número, bairro, cidade"
            />
            <label>Estado (UF) *</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              required={form.tipo === "fornecedor"}
              aria-label="Estado onde a empresa está localizada"
            >
              <option value="">Selecione o estado</option>
              {ESTADOS.map((e) => (
                <option key={e.sigla} value={e.sigla}>
                  {e.nome} ({e.sigla}) — ICMS {e.aliquota}%
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
    background: "var(--gradient-btn-primary)",
    color: "#0F011E",
    border: "none",
    cursor: "pointer",
    borderRadius: 4,
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
    borderRadius: 4,
    cursor: "pointer",
  },
};
