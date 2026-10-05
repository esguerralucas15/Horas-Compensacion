import {
  listarFuncionarios,
  listarCompensaciones,
  listarNotificaciones,
  marcarNotificacionesLeidas,
  buscarUsuario,
  nombreCompleto,
} from "../services/store.js";
import { generarReportePDF } from "../services/reporte.js";
import { resumenUsuario, calendarioMes, fechaLarga } from "../services/compensacion.js";
import { TIPOS_COMPENSACION, HORAS_REQUERIDAS } from "../config/config.js";

function funcionariosConResumen() {
  return listarFuncionarios().map((f) => ({
    ...f,
    nombreCompleto: nombreCompleto(f),
    resumen: resumenUsuario(f.cedula),
  }));
}

export function dashboard(req, res) {
  const funcionarios = funcionariosConResumen();
  const notificaciones = listarNotificaciones();
  res.render("admin/dashboard", {
    titulo: "Dashboard",
    funcionarios,
    totalCompensadas: funcionarios.reduce((s, f) => s + f.resumen.compensadas, 0),
    enCurso: listarCompensaciones().filter((c) => c.estado === "en_curso").length,
    notificaciones: notificaciones.slice(0, 6),
    sinLeer: notificaciones.filter((n) => !n.leida).length,
    requeridas: HORAS_REQUERIDAS,
  });
}

export function registros(req, res) {
  const filtro = req.query.cedula || "";
  const funcionarios = funcionariosConResumen();
  const nombres = Object.fromEntries(funcionarios.map((f) => [f.cedula, f.nombreCompleto]));
  const registros = listarCompensaciones()
    .filter((c) => !filtro || c.cedula === filtro)
    .map((c) => ({ ...c, nombreCompleto: nombres[c.cedula] || c.nombre }))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  res.render("admin/registros", {
    titulo: "Registros",
    registros,
    funcionarios,
    filtro,
    tipos: TIPOS_COMPENSACION,
    fechaLarga,
  });
}

export function detalleFuncionario(req, res, next) {
  const funcionario = buscarUsuario(req.params.cedula);
  if (!funcionario || funcionario.rol === "admin") return next();
  res.render("admin/funcionario", {
    titulo: nombreCompleto(funcionario),
    funcionario: { ...funcionario, nombreCompleto: nombreCompleto(funcionario) },
    resumen: resumenUsuario(funcionario.cedula),
    calendario: calendarioMes(),
    tipos: TIPOS_COMPENSACION,
    fechaLarga,
  });
}

export function notificaciones(req, res) {
  const lista = listarNotificaciones();
  marcarNotificacionesLeidas();
  res.render("admin/notificaciones", { titulo: "Notificaciones", notificaciones: lista });
}

export function reporte(req, res) {
  const nombreArchivo = `reporte-horas-compensacion-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  generarReportePDF(funcionariosConResumen(), res);
}
