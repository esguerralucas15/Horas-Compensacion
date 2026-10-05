import { PERIODO_DESCANSO, TIPOS_COMPENSACION } from "../config/config.js";
import {
  compensacionActiva,
  compensacionesDe,
  crearCompensacion,
  actualizarCompensacion,
  crearNotificacion,
  buscarUsuario,
  nombreCompleto,
} from "../services/store.js";
import {
  resumenUsuario,
  sabadosDisponibles,
  sabadosHabilitados,
  calendarioMes,
  fechaISO,
  fechaLarga,
  duracionMs,
} from "../services/compensacion.js";

function horaRegistradaHoy(cedula, fecha) {
  return compensacionesDe(cedula).some((c) => c.tipo === "hora" && c.fecha === fecha && c.estado === "finalizada");
}

export function dashboard(req, res) {
  const { cedula } = req.session.usuario;
  const registrada = req.session.flash === "registrada";
  delete req.session.flash;

  res.render("usuario/dashboard", {
    titulo: "Dashboard",
    resumen: resumenUsuario(cedula),
    calendario: calendarioMes(),
    activa: compensacionActiva(cedula),
    registrada,
  });
}

export function sabados(req, res) {
  const error = req.session.flashError;
  delete req.session.flashError;
  res.render("usuario/sabados", {
    titulo: "Compensación Sábados",
    sabados: sabadosHabilitados(req.session.usuario.cedula),
    error,
  });
}

export function seleccionarSabado(req, res) {
  const fecha = String(req.body.fecha || "");
  const valido = sabadosDisponibles(req.session.usuario.cedula).some((s) => s.valor === fecha);
  if (!valido) {
    req.session.flashError = "Selecciona un sábado válido";
    return res.redirect("/usuario/sabados");
  }
  res.redirect(`/usuario/compensacion/inicio?tipo=sabado&fecha=${fecha}`);
}

// Pantalla "Inicio de Compensación" (hora diaria o jornada de sábado)
export function inicio(req, res) {
  const { cedula } = req.session.usuario;
  if (compensacionActiva(cedula)) return res.redirect("/usuario/compensacion/temporizador");

  const tipo = req.query.tipo === "sabado" ? "sabado" : "hora";
  const fecha = tipo === "sabado" ? String(req.query.fecha || "") : fechaISO();

  if (tipo === "sabado" && !sabadosDisponibles(cedula).some((s) => s.valor === fecha)) {
    return res.redirect("/usuario/sabados");
  }

  res.render("usuario/inicio", {
    titulo: "Inicio de Compensación",
    tipo,
    fecha,
    periodo: PERIODO_DESCANSO,
    // Solo se permite una hora de compensación por día
    yaRegistrada: tipo === "hora" && horaRegistradaHoy(cedula, fecha),
  });
}

export function iniciar(req, res) {
  const { cedula, nombre } = req.session.usuario;
  if (compensacionActiva(cedula)) return res.redirect("/usuario/compensacion/temporizador");

  const tipo = req.body.tipo === "sabado" ? "sabado" : "hora";
  const fecha = tipo === "sabado" ? String(req.body.fecha || "") : fechaISO();

  if (tipo === "sabado" && !sabadosDisponibles(cedula).some((s) => s.valor === fecha)) {
    return res.redirect("/usuario/sabados");
  }
  if (tipo === "hora" && horaRegistradaHoy(cedula, fecha)) {
    return res.redirect("/usuario/compensacion/inicio");
  }

  crearCompensacion({
    cedula,
    nombre,
    tipo,
    fecha,
    horas: TIPOS_COMPENSACION[tipo].horas,
    inicio: new Date().toISOString(),
  });
  res.redirect("/usuario/compensacion/temporizador");
}

export function temporizador(req, res) {
  const activa = compensacionActiva(req.session.usuario.cedula);
  if (!activa) return res.redirect("/usuario/dashboard");

  res.render("usuario/temporizador", {
    titulo: "Compensación en curso",
    inicioMs: new Date(activa.inicio).getTime(),
    duracionMs: duracionMs(activa.tipo),
    ahoraMs: Date.now(),
  });
}

export function finalizar(req, res) {
  const { cedula, nombre } = req.session.usuario;
  const activa = compensacionActiva(cedula);
  if (!activa) {
    // Doble clic en "Finalizar": la primera petición ya guardó; se conserva el mensaje de éxito
    const ultima = compensacionesDe(cedula).filter((c) => c.fin).sort((a, b) => b.fin.localeCompare(a.fin))[0];
    if (ultima && Date.now() - new Date(ultima.fin).getTime() < 15000) req.session.flash = "registrada";
    return res.redirect("/usuario/dashboard");
  }

  // Validación en servidor: el tiempo completo debe haber transcurrido
  const transcurrido = Date.now() - new Date(activa.inicio).getTime();
  if (transcurrido < duracionMs(activa.tipo) - 2000) {
    return res.redirect("/usuario/compensacion/temporizador");
  }

  actualizarCompensacion(activa.id, { estado: "finalizada", fin: new Date().toISOString() });

  // Notificación automática al jefe de área
  const horas = TIPOS_COMPENSACION[activa.tipo].horas;
  const completo = nombreCompleto(buscarUsuario(cedula) || { nombre });
  crearNotificacion({
    cedula,
    nombre: completo,
    mensaje: `${completo} registró ${horas} ${horas === 1 ? "hora" : "horas"} de compensación (${TIPOS_COMPENSACION[activa.tipo].nombre}) el ${fechaLarga(activa.fecha)}.`,
  });

  req.session.flash = "registrada";
  res.redirect("/usuario/dashboard");
}
