import Funcionario from "../models/Funcionario.js";

export function mostrarLogin(req, res) {
  res.render("auth/login", { titulo: "Orientaciones Descanso Compensado", error: null, cedula: "" });
}

export async function iniciarSesion(req, res, next) {
  const cedula = String(req.body.cedula || "").replace(/\D/g, "");

  if (!cedula) {
    return res.status(400).render("auth/login", {
      titulo: "Orientaciones Descanso Compensado",
      error: "Ingresa tu número de identificación",
      cedula,
    });
  }

  // Solo entran las personas activas en la colección funcionarios
  const registrado = await Funcionario.findOne({ _id: cedula, activo: true }).lean();
  if (!registrado) {
    return res.status(401).render("auth/login", {
      titulo: "Orientaciones Descanso Compensado",
      error: "El número de identificación no está registrado",
      cedula,
    });
  }

  // El rol (funcionario o admin) sale del documento de la persona
  const { nombre, rol } = registrado;

  req.session.regenerate((err) => {
    if (err) return next(err); // lanzar aquí tumbaría el servidor
    req.session.usuario = { cedula, nombre, rol };
    res.redirect(rol === "admin" ? "/admin/dashboard" : "/usuario/dashboard");
  });
}

export function cerrarSesion(req, res) {
  req.session.destroy(() => {
    res.clearCookie("horas.sid");
    res.redirect("/login");
  });
}
