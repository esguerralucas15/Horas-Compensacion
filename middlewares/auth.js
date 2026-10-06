// Protección de rutas según la sesión y el rol del usuario

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

// Variables disponibles en todas las vistas
export function variablesVista(req, res, next) {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  next();
}
