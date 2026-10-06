import {
  panelFuncionario,
  iniciarCompensacion,
  finalizarCompensacion,
  historialFuncionario,
} from "../services/horas.js";
import { ahora, partesBogota, calendarioMes, horaLegible, fechaLegible } from "../services/tiempo.js";

const TIPO = (valor) => (valor === "sabado" ? "sabado" : "hora");

// Mensajes de una sola vez guardados en la sesión
function tomarFlash(req) {
  const registrada = req.session.flash === "registrada";
  const flashError = req.session.flashError || null;
  delete req.session.flash;
  delete req.session.flashError;
  return { registrada, flashError };
}

// Si la persona ya no existe en la base, se cierra la sesión
function sinFuncionario(req, res) {
  req.session.destroy(() => {
    res.clearCookie("horas.sid");
    res.redirect("/login");
  });
}

// Sábados asignados a la persona con su estado: registrado (con el estado del
// registro), pendiente (hoy o más adelante) o pasado (no se registró)
function sabadosAsignados({ config, funcionario, registros, ahora: instante }) {
  const hoy = partesBogota(instante).fecha;
  return (funcionario.sabados ?? [])
    .filter((s) => (config.sabadosHabilitados ?? []).includes(s.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((s) => {
      const registro = registros.find((r) => r.tipo === "sabado" && r.fecha === s.fecha) ?? null;
      let estado = "pendiente";
      if (registro) estado = "registrado";
      else if (s.fecha < hoy) estado = "pasado";
      return { ...s, esHoy: s.fecha === hoy, estado, registro };
    });
}

export async function dashboard(req, res) {
  const panel = await panelFuncionario(req.session.usuario.cedula);
  if (!panel) return sinFuncionario(req, res);

  res.render("usuario/dashboard", {
    titulo: "Dashboard",
    funcionario: panel.funcionario,
    resumen: panel.resumen,
    opciones: panel.opciones,
    calendario: calendarioMes(panel.ahora),
    ...tomarFlash(req),
  });
}

export async function sabados(req, res) {
  const panel = await panelFuncionario(req.session.usuario.cedula);
  if (!panel) return sinFuncionario(req, res);

  res.render("usuario/sabados", {
    titulo: "Compensación Sábados",
    sabados: sabadosAsignados(panel),
    opcion: panel.opciones.sabado,
    enCurso: panel.opciones.enCurso,
    horaLegible,
    fechaLegible,
  });
}

// Pantalla "Inicio de Compensación" (hora adicional o sábado).
// El botón Iniciar solo aparece si las reglas lo permiten; si no, se muestra el motivo.
export async function inicio(req, res) {
  const panel = await panelFuncionario(req.session.usuario.cedula);
  if (!panel) return sinFuncionario(req, res);
  if (panel.opciones.enCurso) return res.redirect("/usuario/compensacion/temporizador");

  const tipo = TIPO(req.query.tipo);
  const evaluacion = panel.opciones[tipo];
  const { config, funcionario } = panel;

  // Horario que se le muestra a la persona
  let horario;
  if (tipo === "hora") {
    const ha = config.horaAdicional;
    horario = { horaInicio: ha.horaInicio, horaFin: ha.horaFin, horas: ha.horas ?? 1 };
  } else {
    const hoy = partesBogota(panel.ahora).fecha;
    horario = (funcionario.sabados ?? []).find((s) => s.fecha === hoy) ?? evaluacion.proximo ?? null;
  }

  res.render("usuario/inicio", {
    titulo: "Inicio de Compensación",
    tipo,
    evaluacion,
    horario,
    graciaMinutos: config.graciaMinutos ?? 0,
    horaLegible,
    fechaLegible,
  });
}

export async function iniciar(req, res) {
  const tipo = TIPO(req.body.tipo);
  const resultado = await iniciarCompensacion(req.session.usuario.cedula, tipo);
  if (resultado.ok) return res.redirect("/usuario/compensacion/temporizador");

  // Ya hay un temporizador abierto (p. ej. doble clic): se lleva a él
  if (resultado.codigo === "EN_CURSO" || resultado.codigo === "DUPLICADO") {
    return res.redirect("/usuario/compensacion/temporizador");
  }
  req.session.flashError = resultado.motivo;
  res.redirect("/usuario/dashboard");
}

export async function temporizador(req, res) {
  const panel = await panelFuncionario(req.session.usuario.cedula);
  if (!panel) return sinFuncionario(req, res);
  const registro = panel.opciones.enCurso;
  if (!registro) return res.redirect("/usuario/dashboard");

  res.render("usuario/temporizador", {
    titulo: "Compensación en curso",
    registro,
    finProgramadoMs: new Date(registro.finProgramado).getTime(),
    limiteFinalizarMs: new Date(registro.limiteFinalizar).getTime(),
    ahoraMs: panel.ahora.getTime(),
    horaFin: horaLegible(partesBogota(new Date(registro.finProgramado)).hora),
    horaLimite: horaLegible(partesBogota(new Date(registro.limiteFinalizar)).hora),
  });
}

export async function finalizar(req, res) {
  const { cedula } = req.session.usuario;
  const resultado = await finalizarCompensacion(cedula);
  if (resultado.ok) {
    req.session.flash = "registrada";
    return res.redirect("/usuario/dashboard");
  }

  // Doble clic en "Finalizar": la primera petición ya guardó; se conserva el mensaje de éxito
  if (resultado.codigo === "SIN_CURSO") {
    const [ultimo] = await historialFuncionario(cedula);
    if (ultimo?.estado === "finalizado" && ahora() - new Date(ultimo.fin) < 15000) {
      req.session.flash = "registrada";
      return res.redirect("/usuario/dashboard");
    }
  }
  req.session.flashError = resultado.motivo;
  res.redirect("/usuario/dashboard");
}
