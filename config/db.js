// Conexión a MongoDB Atlas con Mongoose
import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";
import Funcionario from "../models/Funcionario.js";
import Registro from "../models/Registro.js";
import Configuracion from "../models/Configuracion.js";

mongoose.set("strictQuery", true);

mongoose.connection.on("disconnected", () => console.warn("MongoDB desconectado"));
mongoose.connection.on("reconnected", () => console.log("MongoDB reconectado"));
mongoose.connection.on("error", (err) => console.error("Error de MongoDB:", err.message));

export async function conectarDB() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  // Crea los índices declarados en los modelos si todavía no existen
  // (entre ellos los dos únicos de registros). No borra índices existentes.
  await Promise.all([Funcionario.init(), Registro.init(), Configuracion.init()]);

  console.log(`MongoDB conectado a la base "${mongoose.connection.name}"`);
  return mongoose.connection;
}

export async function desconectarDB() {
  await mongoose.disconnect();
}
