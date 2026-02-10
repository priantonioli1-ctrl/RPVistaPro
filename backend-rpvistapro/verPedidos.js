// verPedidos.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Pedido from "./models/Pedido.js";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI, { dbName: "meubanco" })
  .then(async () => {
    const pedidos = await Pedido.find({});
    console.log("📦 Pedidos salvos no banco:", pedidos.length);
    console.dir(pedidos, { depth: 4 });
    process.exit();
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar no MongoDB:", err.message);
    process.exit(1);
  });