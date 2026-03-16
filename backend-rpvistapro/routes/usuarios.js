import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Usuario from "../models/Usuario.js";
import Estado from "../models/Estado.js";
import { enviarEmailVerificacao } from "../services/emailService.js";

async function obterAliquotaPorEstado(sigla) {
  if (!sigla || sigla.length !== 2) return null;
  const estado = await Estado.findOne({ sigla: sigla.trim().toUpperCase() }).lean();
  return estado ? estado.aliquota : null;
}

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
    let { nome, email, senha, tipo, cnpj, ramoAtuacao, endereco, estado, empresa } = req.body;

    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    tipo = String(tipo || "").toLowerCase().trim();
    // Normalizar variantes de "questionário" → "questionario"
    if (
      tipo === "questionario" ||
      tipo === "questionário" ||
      tipo.includes("question") ||
      tipo.includes("diagnostico") ||
      tipo === "questionário (diagnóstico)" ||
      tipo === "questionario (diagnóstico)"
    ) {
      tipo = "questionario";
    }
    const isQuestionario = tipo === "questionario";

    if (!["comprador", "fornecedor", "questionario"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de usuário inválido. Escolha: Comprador, Fornecedor ou Questionário." });
    }

    if (!isQuestionario && !cnpj) {
      return res.status(400).json({ error: "CNPJ obrigatório para comprador e fornecedor." });
    }

    email = email.trim().toLowerCase();

    if (!validarEmail(email)) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    if (!isQuestionario && !validarCNPJ(cnpj)) {
      return res.status(400).json({ error: "CNPJ inválido." });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: "E-mail já cadastrado." });
    }

    let aliquota = null;
    const estadoSigla = estado ? String(estado).trim().toUpperCase().slice(0, 2) : "";
    if (tipo === "fornecedor" && estadoSigla) {
      aliquota = await obterAliquotaPorEstado(estadoSigla);
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const payload = {
      nome,
      email,
      senha: senhaHash,
      tipo,
      cnpj: isQuestionario ? "00000000000191" : cnpj,
      ramoAtuacao: tipo === "comprador" ? (ramoAtuacao || "").trim() : undefined,
      emailVerificado: isQuestionario,
      tokenVerificacao: isQuestionario ? null : crypto.randomBytes(32).toString("hex"),
      tokenVerificacaoExpira: isQuestionario ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    if (tipo === "fornecedor") {
      payload.endereco = (endereco || "").trim();
      payload.estado = estadoSigla;
      payload.aliquota = aliquota;
      payload.empresa = (empresa || nome || "").trim();
    }

    const novo = await Usuario.create(payload);

    // Enviar email de verificação (não bloqueia o cadastro se falhar) — exceto para questionário
    if (!isQuestionario && payload.tokenVerificacao) {
      try {
        await enviarEmailVerificacao(email, nome, payload.tokenVerificacao);
      } catch (emailError) {
        console.error("⚠️ Erro ao enviar email de verificação (cadastro continuou):", emailError);
      }
    }

    // Gera token para login automático após cadastro
    const token = jwt.sign(
      { id: novo._id, tipo: novo.tipo },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      usuario: {
        _id: novo._id,
        nome: novo.nome,
        email: novo.email,
        tipo: novo.tipo,
        cnpj: novo.cnpj,
        emailVerificado: isQuestionario
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
 📌 1b) CADASTRO QUESTIONÁRIO (público — só nome, email, senha)
============================================================ */
router.post("/cadastro-questionario", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
    }
    const emailNorm = email.trim().toLowerCase();
    if (!validarEmail(emailNorm)) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const existe = await Usuario.findOne({ email: emailNorm });
    if (existe) return res.status(400).json({ error: "E-mail já cadastrado." });
    const senhaHash = await bcrypt.hash(senha, 10);
    const novo = await Usuario.create({
      nome: String(nome).trim(),
      email: emailNorm,
      senha: senhaHash,
      tipo: "questionario",
      cnpj: "00000000000191",
      emailVerificado: true,
    });
    return res.json({
      message: "Cadastro realizado! Faça login para acessar o questionário.",
      usuario: { _id: novo._id, nome: novo.nome, tipo: novo.tipo },
    });
  } catch (err) {
    console.error("Erro ao cadastrar questionário:", err);
    return res.status(500).json({ error: "Erro ao cadastrar." });
  }
});

/* ============================================================
 📌 2) LOGIN (GERA TOKEN)
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const body = req.body || {};
    let { email, senha, nome } = body;
    const inputRaw = String(nome || email || "").trim().normalize("NFC").replace(/\s+/g, " ");

    if (!inputRaw) {
      return res.status(400).json({ error: "Informe seu nome de usuário ou e-mail." });
    }
    if (senha === undefined || senha === null || !String(senha).trim()) {
      return res.status(400).json({ error: "Informe sua senha." });
    }

    // Busca usuário por nome ou e-mail
    const isEmail = inputRaw.includes("@");
    let usuario;

    if (isEmail) {
      usuario = await Usuario.findOne({ email: inputRaw.toLowerCase() });
    } else {
      // Busca por nome: case-insensitive (marcio, Marcio, MARCIO)
      const escaped = inputRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      usuario = await Usuario.findOne({ nome: new RegExp(`^${escaped}$`, "i") });
      if (!usuario && inputRaw.length >= 2) {
        const flex = escaped.replace(/\s+/g, "\\s*");
        usuario = await Usuario.findOne({ nome: new RegExp(`^${flex}$`, "i") });
      }
    }

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
        email: usuario.email,
        tipo: usuario.tipo,
        cnpj: usuario.cnpj,
        ramoAtuacao: usuario.ramoAtuacao || "",
        emailVerificado: usuario.emailVerificado || false
      },
      emailNaoVerificado: !usuario.emailVerificado
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

    // Para fornecedores: se alterar estado, atualizar alíquota
    const usuarioAtual = await Usuario.findById(req.params.id);
    if (usuarioAtual?.tipo === "fornecedor" && dados.estado !== undefined) {
      const estadoSigla = String(dados.estado).trim().toUpperCase().slice(0, 2);
      dados.estado = estadoSigla;
      dados.aliquota = await obterAliquotaPorEstado(estadoSigla);
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
 📌 6) VERIFICAR EMAIL (PÚBLICO)
============================================================ */
router.get("/verificar-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token de verificação é obrigatório." });
    }

    const usuario = await Usuario.findOne({ tokenVerificacao: token });

    if (!usuario) {
      return res.status(404).json({ error: "Token de verificação inválido ou expirado." });
    }

    // Verificar se o token expirou
    if (usuario.tokenVerificacaoExpira && new Date() > usuario.tokenVerificacaoExpira) {
      return res.status(400).json({ error: "Token de verificação expirado. Solicite um novo." });
    }

    // Marcar email como verificado
    usuario.emailVerificado = true;
    usuario.tokenVerificacao = null;
    usuario.tokenVerificacaoExpira = null;
    await usuario.save();

    return res.json({
      message: "Email verificado com sucesso! Sua conta está ativa.",
      emailVerificado: true
    });
  } catch (err) {
    console.error("Erro ao verificar email:", err);
    res.status(500).json({ error: "Erro ao verificar email." });
  }
});


/* ============================================================
 📌 7) REENVIAR EMAIL DE VERIFICAÇÃO (PÚBLICO)
============================================================ */
router.post("/reenviar-verificacao", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório." });
    }

    const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });

    if (!usuario) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({
        message: "Se o email estiver cadastrado, um novo link de verificação será enviado."
      });
    }

    if (usuario.emailVerificado) {
      return res.json({ message: "Este email já está verificado." });
    }

    // Gerar novo token
    const tokenVerificacao = crypto.randomBytes(32).toString("hex");
    const tokenVerificacaoExpira = new Date();
    tokenVerificacaoExpira.setHours(tokenVerificacaoExpira.getHours() + 24);

    usuario.tokenVerificacao = tokenVerificacao;
    usuario.tokenVerificacaoExpira = tokenVerificacaoExpira;
    await usuario.save();

    // Enviar email
    try {
      await enviarEmailVerificacao(usuario.email, usuario.nome, tokenVerificacao);
      return res.json({
        message: "Email de verificação reenviado com sucesso!"
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return res.status(500).json({
        error: "Erro ao enviar email. Tente novamente mais tarde."
      });
    }
  } catch (err) {
    console.error("Erro ao reenviar verificação:", err);
    res.status(500).json({ error: "Erro ao reenviar email de verificação." });
  }
});


/* ============================================================
 📌 8) EXCLUIR USUÁRIO (PROTEGIDO)
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