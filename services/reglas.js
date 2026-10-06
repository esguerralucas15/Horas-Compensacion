// Reglas de la Circular N° 10 de 2026: decide si un botón está habilitado.
// Son funciones puras (no consultan la base): reciben la configuración, el
// funcionario, sus registros y el instante actual, y devuelven
// { permitido, codigo, motivo } y, cuando se puede iniciar, la "programacion"
// con los datos del registro que hay que crear.
//
// Lo que limita: estar activo, el periodo, días hábiles, festivos, la franja
// con su gracia, un registro por día, un temporizador a la vez, no pasar de las
// horas requeridas y, en sábado, que sea uno de SUS sábados asignados.
// Lo que NO limita (solo informativo): el turno y los diasPlaneados.

import {
  partesBogota,
  aFechaHora,
  sumarMinutos,
  minutosDe,
  horaDeMinutos,
  horaLegible,
  fechaLegible,
} from "./tiempo.js";

// Las horas legibles ya terminan en punto ("5:30 p.m."): se evita "p.m.."
const frase = (texto) => texto.replace(/\.\.$/, ".");

const no = (codigo, motivo, extra = {}) => ({ permitido: false, codigo, motivo: frase(motivo), ...extra });

// Un registro en curso cuyo plazo para finalizar ya pasó cuenta como sin_finalizar,
// aunque todavía no se haya actualizado en la base.
export function estadoEfectivo(registro, instante) {
  if (registro.estado === "en_curso" && new Date(registro.limiteFinalizar) < instante) {
    return "sin_finalizar";
  }
  return registro.estado;
}

export function horasFinalizadas(registros) {
  return registros
    .filter((r) => r.estado === "finalizado")
    .reduce((suma, r) => suma + r.horas, 0);
}

export function registroEnCurso(registros, instante) {
  return registros.find((r) => estadoEfectivo(r, instante) === "en_curso");
}

function validacionesComunes({ funcionario, registros, ahora }) {
  if (!funcionario) return no("NO_REGISTRADO", "El número de identificación no está registrado.");
  if (!funcionario.activo) return no("INACTIVO", "Tu usuario no está activo. Habla con la jefe de área.");
  if (funcionario.rol !== "funcionario") return no("ROL", "Solo los funcionarios registran horas.");
  if (registroEnCurso(registros, ahora)) return no("EN_CURSO", "Tienes una compensación en curso.");
  if (horasFinalizadas(registros) >= funcionario.horasRequeridas) {
    return no("COMPLETO", `Ya completaste tus ${funcionario.horasRequeridas} horas.`);
  }
  return null;
}

// Botón "Iniciar hora adicional" (lunes a viernes, 4:30 a 5:30 p.m.)
export function evaluarHora({ config, funcionario, registros = [], ahora }) {
  const comun = validacionesComunes({ funcionario, registros, ahora });
  if (comun) return comun;

  const ha = config.horaAdicional;
  const gracia = config.graciaMinutos ?? 0;
  if (!funcionario.horaAdicional?.habilitada) {
    return no("NO_HABILITADA", "No tienes habilitada la hora adicional.");
  }

  const { fecha, minutos, diaSemana } = partesBogota(ahora);
  if (fecha < ha.desde) {
    return no("ANTES_PERIODO", `La hora adicional empieza el ${fechaLegible(ha.desde)}.`);
  }
  if (fecha > ha.hasta) {
    return no("DESPUES_PERIODO", `El periodo de la hora adicional terminó el ${fechaLegible(ha.hasta)}.`);
  }
  if (!ha.diasSemana.includes(diaSemana)) {
    return no("NO_HABIL", "Hoy no es día hábil: la hora adicional es de lunes a viernes.");
  }
  if ((config.festivos ?? []).includes(fecha)) {
    return no("FESTIVO", "Hoy es festivo: no hay hora adicional.");
  }
  if (registros.some((r) => r.tipo === "hora" && r.fecha === fecha)) {
    return no("YA_REGISTRADA", "Ya registraste tu hora de hoy. Podrás registrar otra el próximo día hábil.");
  }

  const inicio = minutosDe(ha.horaInicio);
  if (minutos < inicio) {
    return no("ANTES_FRANJA", `La franja abre hoy a las ${horaLegible(ha.horaInicio)}.`);
  }
  if (minutos > inicio + gracia) {
    return no(
      "FRANJA_CERRADA",
      `La franja de hoy ya cerró: se podía iniciar hasta las ${horaLegible(horaDeMinutos(inicio + gracia))}.`
    );
  }

  // El fin es fijo (5:30 p.m.) para todos, sin importar a qué hora inició
  const finProgramado = aFechaHora(fecha, ha.horaFin);
  return {
    permitido: true,
    codigo: "OK",
    motivo: frase(`Puedes iniciar. Finalizas a las ${horaLegible(ha.horaFin)}.`),
    programacion: {
      tipo: "hora",
      fecha,
      horas: ha.horas ?? 1,
      finProgramado,
      limiteFinalizar: sumarMinutos(finProgramado, gracia),
    },
  };
}

// Botón "Iniciar sábado": solo en los sábados asignados a la persona
export function evaluarSabado({ config, funcionario, registros = [], ahora }) {
  const comun = validacionesComunes({ funcionario, registros, ahora });
  if (comun) return comun;

  const gracia = config.graciaMinutos ?? 0;
  const { fecha, minutos } = partesBogota(ahora);
  const asignados = (funcionario.sabados ?? [])
    .filter((s) => (config.sabadosHabilitados ?? []).includes(s.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (!asignados.length) return no("SIN_SABADOS", "No tienes sábados asignados.");

  const sabado = asignados.find((s) => s.fecha === fecha);
  if (!sabado) {
    const proximo = asignados.find(
      (s) => s.fecha > fecha && !registros.some((r) => r.tipo === "sabado" && r.fecha === s.fecha)
    );
    if (!proximo) return no("SIN_SABADOS_PENDIENTES", "Ya no tienes sábados asignados pendientes.");
    return no(
      "NO_ES_SU_SABADO",
      `Tu próximo sábado asignado es el ${fechaLegible(proximo.fecha)}, de ${horaLegible(proximo.horaInicio)} a ${horaLegible(proximo.horaFin)}.`,
      { proximo }
    );
  }

  if (registros.some((r) => r.tipo === "sabado" && r.fecha === fecha)) {
    return no("YA_REGISTRADO", "Ya registraste este sábado.");
  }

  const inicio = minutosDe(sabado.horaInicio);
  if (minutos < inicio) {
    return no("ANTES_FRANJA", `Tu jornada de hoy empieza a las ${horaLegible(sabado.horaInicio)}.`);
  }
  if (minutos > inicio + gracia) {
    return no(
      "FRANJA_CERRADA",
      `Se podía iniciar hasta las ${horaLegible(horaDeMinutos(inicio + gracia))}.`
    );
  }

  const finProgramado = aFechaHora(fecha, sabado.horaFin);
  return {
    permitido: true,
    codigo: "OK",
    motivo: frase(`Puedes iniciar. Finalizas a las ${horaLegible(sabado.horaFin)}.`),
    programacion: {
      tipo: "sabado",
      fecha,
      horas: sabado.horas,
      finProgramado,
      limiteFinalizar: sumarMinutos(finProgramado, gracia),
    },
  };
}

// Botón "Finalizar": desde finProgramado hasta limiteFinalizar
export function evaluarFinalizar({ registro, ahora }) {
  if (!registro || registro.estado !== "en_curso") {
    return no("SIN_CURSO", "No tienes una compensación en curso.");
  }
  const fin = new Date(registro.finProgramado);
  const limite = new Date(registro.limiteFinalizar);
  if (ahora < fin) {
    return no("ANTES_FIN", `Podrás finalizar a las ${horaLegible(partesBogota(fin).hora)}.`, {
      finProgramado: fin,
    });
  }
  if (ahora > limite) {
    return no(
      "VENCIDO",
      `Se venció el plazo para finalizar (hasta las ${horaLegible(partesBogota(limite).hora)}). Esta compensación no suma horas.`
    );
  }
  return { permitido: true, codigo: "OK", motivo: "Ya puedes finalizar tu compensación." };
}

// Todo lo que necesita el dashboard del funcionario en una sola llamada
export function opcionesDelDia({ config, funcionario, registros = [], ahora }) {
  const enCurso = registroEnCurso(registros, ahora) ?? null;
  return {
    hora: evaluarHora({ config, funcionario, registros, ahora }),
    sabado: evaluarSabado({ config, funcionario, registros, ahora }),
    enCurso,
    finalizar: evaluarFinalizar({ registro: enCurso, ahora }),
  };
}

// Horas compensadas, restantes y porcentaje de una persona
export function resumen(funcionario, registros, instante = new Date()) {
  const finalizados = registros.filter((r) => r.estado === "finalizado");
  const suma = (tipo) =>
    finalizados.filter((r) => r.tipo === tipo).reduce((s, r) => s + r.horas, 0);
  const horasSemana = suma("hora");
  const horasSabado = suma("sabado");
  const requeridas = funcionario.horasRequeridas;
  const compensadas = Math.min(horasSemana + horasSabado, requeridas);
  return {
    horasSemana,
    horasSabado,
    compensadas,
    restantes: Math.max(requeridas - compensadas, 0),
    requeridas,
    porcentaje: requeridas ? Math.round((compensadas / requeridas) * 100) : 0,
    sinFinalizar: registros.filter((r) => estadoEfectivo(r, instante) === "sin_finalizar").length,
    diasCompensados: finalizados.map((r) => r.fecha),
    historial: [...registros].sort((a, b) => new Date(b.inicio) - new Date(a.inicio)),
  };
}
