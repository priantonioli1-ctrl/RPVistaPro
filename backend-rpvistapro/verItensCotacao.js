import mongoose from "mongoose";
import dotenv from "dotenv";
import ItensCotacao from "./models/Item-cotacao.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: "meubanco" });

const ver = async () => {
  const itens = await ItensCotacao.find();
  console.log("Itens de cotação encontrados:", itens.length);
  console.log(itens);
  mongoose.disconnect();
};

ver();
