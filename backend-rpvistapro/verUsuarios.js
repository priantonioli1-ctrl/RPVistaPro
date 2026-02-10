// verUsuarios.js
import mongoose from "mongoose";
import Usuario from "./models/Usuario.js";

async function listarUsuarios() {
  try {
    await mongoose.connect("mongodb+srv://priscilla:Helena2607.@cluster0.g0y0tyq.mongodb.net/meubanco");
    console.log("✅ Conectado ao MongoDB");

    const usuarios = await Usuario.find();
    console.log("👥 Usuários cadastrados:");
    console.log(usuarios);

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Erro ao listar usuários:", err);
  }
}

listarUsuarios();