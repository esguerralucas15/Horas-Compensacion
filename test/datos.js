// Datos de prueba con la misma forma que la base horas_compensacion (sin conexión).
// Las cédulas son inventadas: el repositorio es público.
import { aFechaHora } from "../services/tiempo.js";

export const CONFIG = {
  _id: "fin-anio-2026",
  zonaHoraria: "America/Bogota",
  graciaMinutos: 15,
  horaAdicional: {
    desde: "2026-10-13",
    hasta: "2026-12-01",
    horaInicio: "16:30",
    horaFin: "17:30",
    duracionMin: 60,
    horas: 1,
    diasSemana: [1, 2, 3, 4, 5],
  },
  festivos: ["2026-11-02", "2026-11-16"],
  sabadosHabilitados: ["2026-10-10", "2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07"],
  sabado: { horaInicio: "07:00", horaFin: "16:30", almuerzoMin: 60, horas: 8.5 },
};

const base = {
  rol: "funcionario",
  jornadaDiaria: 8.5,
  horasRequeridas: 34,
  horaAdicional: { habilitada: true, diasPlaneados: null },
  sabados: [],
  activo: true,
};

export const ANGELA = { ...base, _id: "1000000101", nombre: "ANGELA", turno: 2 };
export const ADRIANA_SIN_TURNO = { ...base, _id: "1000000102", nombre: "ADRIANA", turno: null };
export const CLARIBEL = {
  ...base,
  _id: "1000000103",
  nombre: "CLARIBEL",
  turno: 3,
  horaAdicional: { habilitada: true, diasPlaneados: ["2026-10-13", "2026-10-14"] },
  sabados: [
    { fecha: "2026-10-10", horaInicio: "07:00", horaFin: "16:30", horas: 8.5 },
    { fecha: "2026-10-24", horaInicio: "07:00", horaFin: "16:30", horas: 8.5 },
  ],
};
export const MONICA = {
  ...base,
  _id: "1000000104",
  nombre: "MONICA",
  turno: 1,
  sabados: [{ fecha: "2026-10-31", horaInicio: "07:00", horaFin: "12:00", horas: 5 }],
};
export const ADMIN = { ...base, _id: "1000000100", nombre: "ADMINISTRADORA", rol: "admin", turno: null };

// Instante a partir de fecha y hora de Bogotá
export const en = (fecha, hora) => aFechaHora(fecha, hora);

export function registro(datos) {
  return { estado: "finalizado", horas: 1, tipo: "hora", ...datos };
}
