import Funcionario from "../models/Funcionario.js";
import Registro, { NOMBRES_TIPO, NOMBRES_ESTADO } from "../models/Registro.js";
import { avanceEquipo, historialFuncionario, vencerRegistros } from "../services/horas.js";
import { resumen } from "../services/reglas.js";
import { ahora, partesBogota, calendarioMes, fechaLegible } from "../services/tiempo.js";
import { generarReportePDF } from "../services/reporte.js";

// Filtros del panel y del reporte: ?turno=1|2|3|sin y ?estado=completo|progreso
function leerFiltros(query) {
  const turno = ["1", "2", "3", "sin"].includes(query.turno) ? query.turno : "";
  const estado = ["completo", "progreso"].includes(query.estado) ? query.estado : "";
  return { turno, estado };
}

async function equipoFiltrado({ turno, estado }) {
  const opciones = turno === "" ? {} : { turno: turno === "sin" ? null : Number(turno) };
  let lista = await avanceEquipo(opciones);
  if (estado === "completo") lista = lista.filter((f) => f.restantes === 0);
  if (estado === "progreso") lista = lista.filter((f) => f.restantes > 0);
  return lista;
}

export async function dashboard(req, res) {
  const filtros = leerFiltros(req.query);
  const funcionarios = await equipoFiltrado(filtros);
  res.render("admin/dashboard", {
    titulo: "Dashboard",
    funcionarios,
    filtros,
    totalCompensadas: funcionarios.reduce((s, f) => s + f.compensadas, 0),
    enCurso: funcionarios.filter((f) => f.enCurso).length,
    sinFinalizar: funcionarios.reduce((s, f) => s + f.sinFinalizar, 0),
  });
}

export async function registros(req, res) {
  const filtro = String(req.query.cedula || "");
  await vencerRegistros();
  const [funcionarios, lista] = await Promise.all([
    Funcionario.find({ rol: "funcionario" }, { nombre: 1, turno: 1 }).sort({ nombre: 1 }).lean(),
    Registro.find(filtro ? { funcionario: filtro } : {}).sort({ inicio: -1 }).lean(),
  ]);
  const nombres = Object.fromEntries(funcionarios.map((f) => [f._id, f.nombre]));
  res.render("admin/registros", {
    titulo: "Registros",
    registros: lista.map((r) => ({ ...r, nombre: nombres[r.funcionario] ?? r.funcionario })),
    funcionarios,
    filtro,
    tipos: NOMBRES_TIPO,
    estados: NOMBRES_ESTADO,
    fechaLegible,
  });
}

export async function detalleFuncionario(req, res, next) {
  const funcionario = await Funcionario.findById(String(req.params.cedula)).lean();
  if (!funcionario || funcionario.rol === "admin") return next();
  const instante = ahora();
  const historial = await historialFuncionario(funcionario._id, instante);
  res.render("admin/funcionario", {
    titulo: funcionario.nombre,
    funcionario,
    resumen: resumen(funcionario, historial, instante),
    calendario: calendarioMes(instante),
    tipos: NOMBRES_TIPO,
    estados: NOMBRES_ESTADO,
    fechaLegible,
  });
}

export async function reporte(req, res) {
  const filtros = leerFiltros(req.query);
  const funcionarios = await equipoFiltrado(filtros);
  const nombreArchivo = `reporte-horas-compensacion-${partesBogota(ahora()).fecha}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  generarReportePDF(funcionarios, res);
}
