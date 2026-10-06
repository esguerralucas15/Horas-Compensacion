import { test } from "node:test";
import assert from "node:assert/strict";
import {
  partesBogota,
  aFechaHora,
  horaLegible,
  fechaLegible,
  minutosDe,
  horaDeMinutos,
} from "../services/tiempo.js";

test("partesBogota convierte UTC a hora de Bogotá", () => {
  const p = partesBogota(new Date("2026-10-13T21:35:00Z"));
  assert.deepEqual(p, { fecha: "2026-10-13", hora: "16:35", minutos: 995, diaSemana: 2 });
});

test("partesBogota respeta el cambio de día (noche en Bogotá = madrugada UTC)", () => {
  const p = partesBogota(new Date("2026-10-14T03:00:00Z"));
  assert.equal(p.fecha, "2026-10-13");
  assert.equal(p.hora, "22:00");
});

test("partesBogota: sábado 10 de octubre es el día 6", () => {
  assert.equal(partesBogota(aFechaHora("2026-10-10", "07:00")).diaSemana, 6);
});

test("aFechaHora crea el instante UTC correcto", () => {
  assert.equal(aFechaHora("2026-10-13", "17:30").toISOString(), "2026-10-13T22:30:00.000Z");
});

test("horaLegible", () => {
  assert.equal(horaLegible("16:30"), "4:30 p.m.");
  assert.equal(horaLegible("07:00"), "7:00 a.m.");
  assert.equal(horaLegible("12:00"), "12:00 m.");
  assert.equal(horaLegible("12:30"), "12:30 p.m.");
});

test("fechaLegible", () => {
  assert.equal(fechaLegible("2026-10-24"), "sábado 24 de octubre");
  assert.equal(fechaLegible("2026-12-01"), "martes 1 de diciembre");
});

test("minutosDe y horaDeMinutos", () => {
  assert.equal(minutosDe("16:45"), 1005);
  assert.equal(horaDeMinutos(1005), "16:45");
});
