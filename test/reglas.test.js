import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluarHora,
  evaluarSabado,
  evaluarFinalizar,
  opcionesDelDia,
  resumen,
} from "../services/reglas.js";
import { CONFIG, ANGELA, ADRIANA_SIN_TURNO, CLARIBEL, MONICA, ADMIN, en, registro } from "./datos.js";

const hora = (funcionario, ahora, registros = []) =>
  evaluarHora({ config: CONFIG, funcionario, registros, ahora });
const sabado = (funcionario, ahora, registros = []) =>
  evaluarSabado({ config: CONFIG, funcionario, registros, ahora });

// ---------- Hora adicional ----------

test("hora: dentro de la franja se puede iniciar y el fin es fijo a las 5:30", () => {
  const r = hora(ANGELA, en("2026-10-13", "16:40"));
  assert.equal(r.permitido, true);
  assert.equal(r.programacion.tipo, "hora");
  assert.equal(r.programacion.fecha, "2026-10-13");
  assert.equal(r.programacion.horas, 1);
  assert.equal(r.programacion.finProgramado.toISOString(), "2026-10-13T22:30:00.000Z");
  assert.equal(r.programacion.limiteFinalizar.toISOString(), "2026-10-13T22:45:00.000Z");
});

test("hora: 4:30 y 4:45 p.m. están dentro; 4:29 y 4:46 fuera", () => {
  assert.equal(hora(ANGELA, en("2026-10-13", "16:30")).permitido, true);
  assert.equal(hora(ANGELA, en("2026-10-13", "16:45")).permitido, true);
  assert.equal(hora(ANGELA, en("2026-10-13", "16:29")).codigo, "ANTES_FRANJA");
  assert.equal(hora(ANGELA, en("2026-10-13", "16:46")).codigo, "FRANJA_CERRADA");
});

test("hora: el turno es informativo (sin turno también puede)", () => {
  assert.equal(hora(ADRIANA_SIN_TURNO, en("2026-10-13", "16:35")).permitido, true);
});

test("hora: diasPlaneados es informativo (Claribel puede un día fuera de su lista)", () => {
  assert.equal(hora(CLARIBEL, en("2026-10-15", "16:35")).permitido, true);
});

test("hora: fuera del periodo", () => {
  assert.equal(hora(ANGELA, en("2026-10-12", "16:35")).codigo, "ANTES_PERIODO");
  assert.equal(hora(ANGELA, en("2026-12-02", "16:35")).codigo, "DESPUES_PERIODO");
  assert.equal(hora(ANGELA, en("2026-12-01", "16:35")).permitido, true);
});

test("hora: fin de semana y festivos", () => {
  assert.equal(hora(ANGELA, en("2026-10-17", "16:35")).codigo, "NO_HABIL");
  assert.equal(hora(ANGELA, en("2026-11-02", "16:35")).codigo, "FESTIVO");
  assert.equal(hora(ANGELA, en("2026-11-16", "16:35")).codigo, "FESTIVO");
});

test("hora: una sola por día (aunque haya quedado sin finalizar)", () => {
  const regs = [registro({ fecha: "2026-10-13", estado: "sin_finalizar" })];
  assert.equal(hora(ANGELA, en("2026-10-13", "16:40"), regs).codigo, "YA_REGISTRADA");
  assert.equal(hora(ANGELA, en("2026-10-14", "16:40"), regs).permitido, true);
});

test("hora: no se inicia si hay otra en curso", () => {
  const regs = [
    registro({
      tipo: "hora",
      fecha: "2026-10-13",
      estado: "en_curso",
      finProgramado: en("2026-10-13", "17:30"),
      limiteFinalizar: en("2026-10-13", "17:45"),
    }),
  ];
  assert.equal(hora(ANGELA, en("2026-10-13", "16:40"), regs).codigo, "EN_CURSO");
});

test("hora: un en_curso vencido no bloquea el día siguiente", () => {
  const regs = [
    registro({
      fecha: "2026-10-13",
      estado: "en_curso",
      finProgramado: en("2026-10-13", "17:30"),
      limiteFinalizar: en("2026-10-13", "17:45"),
    }),
  ];
  assert.equal(hora(ANGELA, en("2026-10-14", "16:35"), regs).permitido, true);
});

test("hora: al completar las horas requeridas ya no deja iniciar", () => {
  const regs = Array.from({ length: 34 }, (_, i) => registro({ fecha: `x-${i}` }));
  assert.equal(hora(ANGELA, en("2026-12-01", "16:35"), regs).codigo, "COMPLETO");
});

test("hora: la administradora y los inactivos no registran", () => {
  assert.equal(hora(ADMIN, en("2026-10-13", "16:35")).codigo, "ROL");
  assert.equal(hora({ ...ANGELA, activo: false }, en("2026-10-13", "16:35")).codigo, "INACTIVO");
  assert.equal(hora(null, en("2026-10-13", "16:35")).codigo, "NO_REGISTRADO");
});

// ---------- Sábado ----------

test("sábado: Claribel el 10 de octubre a las 7:05 inicia; suma 8,5 h y finaliza a las 4:30 p.m.", () => {
  const r = sabado(CLARIBEL, en("2026-10-10", "07:05"));
  assert.equal(r.permitido, true);
  assert.equal(r.programacion.tipo, "sabado");
  assert.equal(r.programacion.horas, 8.5);
  assert.equal(r.programacion.finProgramado.toISOString(), "2026-10-10T21:30:00.000Z");
  assert.equal(r.programacion.limiteFinalizar.toISOString(), "2026-10-10T21:45:00.000Z");
});

test("sábado: ventana de inicio con gracia", () => {
  assert.equal(sabado(CLARIBEL, en("2026-10-10", "06:59")).codigo, "ANTES_FRANJA");
  assert.equal(sabado(CLARIBEL, en("2026-10-10", "07:15")).permitido, true);
  assert.equal(sabado(CLARIBEL, en("2026-10-10", "07:16")).codigo, "FRANJA_CERRADA");
});

test("sábado: un sábado que no le toca muestra el próximo asignado", () => {
  const r = sabado(CLARIBEL, en("2026-10-17", "07:05"));
  assert.equal(r.codigo, "NO_ES_SU_SABADO");
  assert.equal(r.proximo.fecha, "2026-10-24");
  assert.match(r.motivo, /sábado 24 de octubre/);
});

test("sábado: quien no tiene sábados asignados no puede", () => {
  assert.equal(sabado(ANGELA, en("2026-10-10", "07:05")).codigo, "SIN_SABADOS");
});

test("sábado: Mónica el 31 de octubre suma 5 h y finaliza a las 12:00 m.", () => {
  const r = sabado(MONICA, en("2026-10-31", "07:00"));
  assert.equal(r.permitido, true);
  assert.equal(r.programacion.horas, 5);
  assert.equal(r.programacion.finProgramado.toISOString(), "2026-10-31T17:00:00.000Z");
});

test("sábado: no se repite y al terminar sus sábados no quedan pendientes", () => {
  const regs = [
    registro({ tipo: "sabado", fecha: "2026-10-10", horas: 8.5 }),
    registro({ tipo: "sabado", fecha: "2026-10-24", horas: 8.5 }),
  ];
  assert.equal(sabado(CLARIBEL, en("2026-10-24", "07:05"), regs).codigo, "YA_REGISTRADO");
  assert.equal(sabado(CLARIBEL, en("2026-10-31", "07:05"), regs).codigo, "SIN_SABADOS_PENDIENTES");
});

// ---------- Finalizar ----------

test("finalizar: antes de las 5:30 no; entre 5:30 y 5:45 sí; después vencido", () => {
  const reg = registro({
    estado: "en_curso",
    finProgramado: en("2026-10-13", "17:30"),
    limiteFinalizar: en("2026-10-13", "17:45"),
  });
  assert.equal(evaluarFinalizar({ registro: reg, ahora: en("2026-10-13", "17:20") }).codigo, "ANTES_FIN");
  assert.equal(evaluarFinalizar({ registro: reg, ahora: en("2026-10-13", "17:30") }).permitido, true);
  assert.equal(evaluarFinalizar({ registro: reg, ahora: en("2026-10-13", "17:45") }).permitido, true);
  assert.equal(evaluarFinalizar({ registro: reg, ahora: en("2026-10-13", "17:46") }).codigo, "VENCIDO");
  assert.equal(evaluarFinalizar({ registro: null, ahora: en("2026-10-13", "17:30") }).codigo, "SIN_CURSO");
});

test("finalizar tarde: si el registro ya quedó sin_finalizar ese día, el motivo es VENCIDO", () => {
  const reg = registro({
    estado: "sin_finalizar",
    finProgramado: en("2026-10-15", "17:30"),
    limiteFinalizar: en("2026-10-15", "17:45"),
  });
  const r = evaluarFinalizar({ registro: reg, ahora: en("2026-10-15", "17:50") });
  assert.equal(r.codigo, "VENCIDO");
  assert.equal(r.motivo, "Se venció el plazo para finalizar (hasta las 5:45 p.m.). Esta compensación no suma horas.");
  // Al día siguiente ya no aplica: no hay nada en curso
  assert.equal(evaluarFinalizar({ registro: reg, ahora: en("2026-10-16", "17:35") }).codigo, "SIN_CURSO");
});

// ---------- Panel y resumen ----------

test("opcionesDelDia junta hora, sábado, en curso y finalizar", () => {
  const o = opcionesDelDia({ config: CONFIG, funcionario: CLARIBEL, registros: [], ahora: en("2026-10-10", "07:05") });
  assert.equal(o.hora.codigo, "ANTES_PERIODO");
  assert.equal(o.sabado.permitido, true);
  assert.equal(o.enCurso, null);
  assert.equal(o.finalizar.codigo, "SIN_CURSO");
});

test("resumen suma solo finalizados y no pasa de las horas requeridas", () => {
  const regs = [
    registro({ fecha: "2026-10-13", inicio: en("2026-10-13", "16:31") }),
    registro({ tipo: "sabado", fecha: "2026-10-10", horas: 8.5, inicio: en("2026-10-10", "07:01") }),
    registro({ fecha: "2026-10-14", estado: "sin_finalizar", inicio: en("2026-10-14", "16:31") }),
  ];
  const r = resumen(CLARIBEL, regs, en("2026-10-15", "08:00"));
  assert.equal(r.horasSemana, 1);
  assert.equal(r.horasSabado, 8.5);
  assert.equal(r.compensadas, 9.5);
  assert.equal(r.restantes, 24.5);
  assert.equal(r.porcentaje, 28);
  assert.equal(r.sinFinalizar, 1);
  assert.equal(r.historial[0].fecha, "2026-10-14");

  const muchas = Array.from({ length: 40 }, (_, i) => registro({ fecha: `d${i}`, inicio: en("2026-10-13", "16:31") }));
  assert.equal(resumen(ANGELA, muchas).compensadas, 34);
  assert.equal(resumen(ANGELA, muchas).porcentaje, 100);
});

test("los motivos que terminan en una hora no quedan con doble punto", () => {
  const motivos = [
    hora(ANGELA, en("2026-10-13", "16:20")).motivo,
    hora(ANGELA, en("2026-10-13", "16:50")).motivo,
    hora(ANGELA, en("2026-10-13", "16:35")).motivo,
    sabado(MONICA, en("2026-10-31", "07:05")).motivo,
    evaluarFinalizar({
      registro: registro({ estado: "en_curso", finProgramado: en("2026-10-13", "17:30"), limiteFinalizar: en("2026-10-13", "17:45") }),
      ahora: en("2026-10-13", "17:00"),
    }).motivo,
  ];
  assert.equal(motivos[0], "La franja abre hoy a las 4:30 p.m.");
  assert.equal(motivos[4], "Podrás finalizar a las 5:30 p.m.");
  assert.equal(motivos[3], "Puedes iniciar. Finalizas a las 12:00 m.");
  for (const m of motivos) assert.doesNotMatch(m, /\.\.$/);
});
