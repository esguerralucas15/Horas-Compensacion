import { buscarUsuario } from "../services/store.js";
import { CEDULA_ADMIN } from "../config/config.js";

export function mostrarLogin(req, res) {
  res.render("auth/login", { titulo: "Orientaciones Descanso Compensado", error: null, cedula: "" });
}

export function iniciarSesion(req, res, next) {
  const cedula = String(req.body.cedula || "").replace(/\D/g, "");

  if (!cedula) {
    return res.status(400).render("auth/login", {
      titulo: "Orientaciones Descanso Compensado",
      error: "Ingresa tu número de identificación",
      cedula,
    });
  }

  const registrado = buscarUsuario(cedula);
  if (!registrado) {
    return res.status(401).render("auth/login", {
      titulo: "Orientaciones Descanso Compensado",
      error: "El número de identificación no está registrado",
      cedula,
    });
  }

  // El rol de administrador solo se asigna a la cédula configurada
  const rol = cedula === CEDULA_ADMIN ? "admin" : "usuario";

  req.session.regenerate((err) => {
    if (err) return next(err); // lanzar aquí tumbaría el servidor
    req.session.usuario = { cedula, nombre: registrado.nombre, area: registrado.area, rol };
    res.redirect(rol === "admin" ? "/admin/dashboard" : "/usuario/dashboard");
  });
}

export function cerrarSesion(req, res) {
  req.session.destroy(() => {
    res.clearCookie("horas.sid");
    res.redirect("/login");
  });
}
