import session from "express-session";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { SESSION_SECRET } from "./config.js";

const DURACION_SESION = 1000 * 60 * 60 * 10; // 10 horas: cubre una jornada completa de sábado

// Guarda las sesiones en data/sesiones.json para que sobrevivan a reinicios del
// servidor (nodemon, caídas): así el funcionario no pierde el flujo ni el temporizador.
class ArchivoStore extends session.Store {
  constructor(ruta) {
    super();
    this.ruta = ruta;
    this.sesiones = existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf-8") || "{}") : {};
  }

  guardar() {
    const ahora = Date.now();
    for (const [sid, s] of Object.entries(this.sesiones)) {
      if (new Date(s.cookie?.expires).getTime() < ahora) delete this.sesiones[sid];
    }
    writeFileSync(this.ruta, JSON.stringify(this.sesiones));
  }

  get(sid, cb) {
    const s = this.sesiones[sid];
    if (s && new Date(s.cookie?.expires).getTime() < Date.now()) {
      delete this.sesiones[sid];
      return cb(null, null);
    }
    cb(null, s ? structuredClone(s) : null);
  }

  set(sid, datos, cb) {
    this.sesiones[sid] = JSON.parse(JSON.stringify(datos));
    this.guardar();
    cb?.(null);
  }

  destroy(sid, cb) {
    delete this.sesiones[sid];
    this.guardar();
    cb?.(null);
  }

  touch(sid, datos, cb) {
    if (this.sesiones[sid]) this.sesiones[sid].cookie = JSON.parse(JSON.stringify(datos.cookie));
    cb?.(null);
  }
}

export default session({
  name: "horas.sid",
  secret: SESSION_SECRET,
  store: new ArchivoStore(join(import.meta.dirname, "..", "data", "sesiones.json")),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: DURACION_SESION,
  },
});
