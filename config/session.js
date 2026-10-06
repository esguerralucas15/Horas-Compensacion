import session from "express-session";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { SESSION_SECRET } from "./config.js";

const DURACION_SESION_SEG = 10 * 60 * 60; // 10 horas: cubre una jornada completa de sábado

// Las sesiones se guardan en la colección "sessions" de MongoDB para que
// sobrevivan a reinicios del servidor: así el funcionario no pierde el temporizador.
// En la sesión solo se guarda { cedula, nombre, rol }.
//
// Se reutiliza la conexión de Mongoose (config/db.js) en lugar de abrir otra con
// MONGODB_URI: dos conexiones simultáneas hacían dos consultas DNS (SRV) al
// mismo tiempo y a veces el DNS rechazaba una (querySrv EREFUSED).
export default session({
  name: "horas.sid",
  secret: SESSION_SECRET,
  store: MongoStore.create({
    clientPromise: mongoose.connection.asPromise().then((conexion) => conexion.getClient()),
    collectionName: "sessions",
    ttl: DURACION_SESION_SEG,
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: DURACION_SESION_SEG * 1000,
  },
});
