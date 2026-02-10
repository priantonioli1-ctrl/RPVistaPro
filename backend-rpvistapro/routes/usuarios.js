import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "segredo123"; // coloque no .env depois

/* ============================================================
 📌 FUNÇÕES DE VALIDAÇÃO
============================================================ */

// Validação simples de email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validação simples de CNPJ
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  return true;
}


/* ============================================================
 📌 1) CADASTRO (PUBLICO)
============================================================ */
router.post("/", async (req, res) => {
  try {
    let { nome, email, senha, tipo, cnpj, ramoAtuacao } = req.body;

    if (!nome || !email || !senha || !tipo || !cnpj) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    email = email.trim().toLowerCase();

    if (!validarEmail(email)) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    if (!validarCNPJ(cnpj)) {
      return res.status(400).json({ error: "CNPJ inválido." });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: "E-mail já cadastrado." });
    }

    tipo = String(tipo).toLowerCase();
    if (!["comprador", "fornecedor"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de usuário inválido." });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const novo = await Usuario.create({
      nome,
      email,
      senha: senhaHash,
      tipo,
      cnpj,
      ramoAtuacao: tipo === "comprador" ? (ramoAtuacao || "").trim() : undefined,
    });

    return res.json({
      message: "Usuário cadastrado com sucesso!",
      usuario: {
        _id: novo._id,
        nome: novo.nome,
        tipo: novo.tipo,
        cnpj: novo.cnpj
      }
    });

  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);

    // Mensagem clara para o frontend (ajuda a debugar e trata erros conhecidos)
    let mensagem = "Erro interno ao cadastrar usuário.";
    if (err.code === 11000) {
      mensagem = "E-mail já cadastrado.";
      return res.status(400).json({ error: mensagem });
    }
    if (err.name === "ValidationError") {
      const first = Object.values(err.errors)[0];
      mensagem = first ? first.message : "Dados inválidos.";
      return res.status(400).json({ error: mensagem });
    }
    // Em desenvolvimento, enviar a mensagem real para facilitar correção
    if (process.env.NODE_ENV !== "production" && err.message) {
      mensagem = err.message;
    }
    return res.status(500).json({ error: mensagem });
  }
});


/* ============================================================
 📌 2) LOGIN (GERA TOKEN)
============================================================ */
router.post("/login", async (req, res) => {
  try {
    let { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha obrigatórios." });
    }

    email = email.trim().toLowerCase();

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    const token = jwt.sign(
      { id: usuario._id, tipo: usuario.tipo },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login realizado com sucesso!",
      token,
      usuario: {
        _id: usuario._id,
        nome: usuario.nome,
        tipo: usuario.tipo,
        cnpj: usuario.cnpj,
        ramoAtuacao: usuario.ramoAtuacao || ""
      }
    });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro ao realizar login." });
  }
});


/* ============================================================
 📌 MIDDLEWARE DE AUTENTICAÇÃO
============================================================ */
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // adiciona ID e tipo ao req
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}


/* ============================================================
 📌 3) LISTAR TODOS OS USUÁRIOS  (PROTEGIDO)
============================================================ */
router.get("/", auth, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select("-senha");
    res.json(usuarios);
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    res.status(500).json({ error: "Erro ao listar usuários." });
  }
});


/* ============================================================
 📌 4) BUSCAR POR ID (PROTEGIDO)
============================================================ */
router.get("/:id", auth, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-senha");

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json(usuario);

  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});


/* ============================================================
 📌 5) ATUALIZAR USUÁRIO (PROTEGIDO)
============================================================ */
router.put("/:id", auth, async (req, res) => {
  try {
    let dados = { ...req.body };

    // Se alterar senha, criptografar
    if (dados.senha) {
      dados.senha = await bcrypt.hash(dados.senha, 10);
    }

    const atualizado = await Usuario.findByIdAndUpdate(req.params.id, dados, {
      new: true,
      select: "-senha",
    });

    if (!atualizado) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({
      message: "Usuário atualizado com sucesso.",
      usuario: atualizado,
    });

  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});


/* ============================================================
 📌 6) EXCLUIR USUÁRIO (PROTEGIDO)
============================================================ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const removido = await Usuario.findByIdAndDelete(req.params.id);

    if (!removido) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({ message: "Usuário removido com sucesso." });

  } catch (err) {
    console.error("Erro ao excluir usuário:", err);
    res.status(500).json({ error: "Erro ao excluir usuário." });
  }
});

export default router;