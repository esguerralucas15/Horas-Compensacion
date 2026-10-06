// Protección de rutas según la sesión y el rol del usuario
import { partesBogota, horaLegible, fechaLegible } from "../services/tiempo.js";

export function requiereSesion(req, res, next) {
  if (!req.session.usuario) return res.redirect("/login");
  next();
}

export function soloAdmin(req, res, next) {
  if (req.session.usuario?.rol !== "admin") {
    return res.status(403).render("errores/403", { titulo: "Acceso denegado" });
  }
  next();
}

export function soloUsuario(req, res, next) {
  if (req.session.usuario?.rol !== "funcionario") {
    return res.status(403).render("errores/403", { titulo: "Acceso denegado" });
  }
  next();
}

// Si ya hay sesión, enviar directamente a su página de inicio
export function redirigirSiAutenticado(req, res, next) {
  const u = req.session.usuario;
  if (u) return res.redirect(u.rol === "admin" ? "/admin/dashboard" : "/usuario/dashboard");
  next();
}

// Ayudas de formato para las vistas (siempre en hora de Bogotá)
const formato = {
  fechaLegible,
  horaLegible,
  // Date -> "4:35 p.m."
  horaDe: (instante) => (instante ? horaLegible(partesBogota(new Date(instante)).hora) : "—"),
  // 8.5 -> "8,5"
  numero: (n) => Number(n ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 1 }),
};

// Variables disponibles en todas las vistas
export function variablesVista(req, res, next) {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  Object.assign(res.locals, formato);
  next();
}
