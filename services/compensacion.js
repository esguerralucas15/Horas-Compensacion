// Cálculos de horas, resumen y utilidades de fechas
import { HORAS_REQUERIDAS, TIPOS_COMPENSACION, SABADOS_HABILITADOS } from "../config/config.js";
import { compensacionesDe } from "./store.js";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
  "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Fecha local en formato YYYY-MM-DD
export function fechaISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  return `${DIAS[f.getDay()]} ${d} de ${MESES[m - 1]}`;
}

export function resumenUsuario(cedula) {
  const finalizadas = compensacionesDe(cedula).filter((c) => c.estado === "finalizada");
  // Las horas se toman de la configuración del tipo (sábado = 7 h aunque dure 8)
  const sumar = (tipo) =>
    finalizadas.filter((c) => c.tipo === tipo).length * TIPOS_COMPENSACION[tipo].horas;
  const horasSemana = sumar("hora");
  const horasSabado = sumar("sabado");
  const compensadas = Math.min(horasSemana + horasSabado, HORAS_REQUERIDAS);
  const restantes = Math.max(HORAS_REQUERIDAS - compensadas, 0);
  return {
    horasSemana,
    horasSabado,
    compensadas,
    restantes,
    requeridas: HORAS_REQUERIDAS,
    porcentaje: Math.round((compensadas / HORAS_REQUERIDAS) * 100),
    diasCompensados: finalizadas.map((c) => c.fecha),
    historial: finalizadas.sort((a, b) => b.fin.localeCompare(a.fin)),
  };
}

// Los cinco sábados habilitados, marcando los que el funcionario ya compensó
export function sabadosHabilitados(cedula) {
  const compensados = new Set(
    compensacionesDe(cedula)
      .filter((c) => c.tipo === "sabado" && c.estado === "finalizada")
      .map((c) => c.fecha)
  );
  return SABADOS_HABILITADOS.map((iso) => ({
    valor: iso,
    texto: fechaLarga(iso),
    compensado: compensados.has(iso),
  }));
}

// Sábados que todavía se pueden elegir
export function sabadosDisponibles(cedula) {
  return sabadosHabilitados(cedula).filter((s) => !s.compensado);
}

// Matriz de semanas (Domingo a Sábado) para el calendario del mes actual
export function calendarioMes(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  const inicio = new Date(y, m, 1);
  inicio.setDate(1 - inicio.getDay());
  const semanas = [];
  const d = new Date(inicio);
  do {
    const semana = [];
    for (let i = 0; i < 7; i++) {
      semana.push({ dia: d.getDate(), iso: fechaISO(d), delMes: d.getMonth() === m });
      d.setDate(d.getDate() + 1);
    }
    semanas.push(semana);
  } while (d.getMonth() === m);
  return { mes: MESES[m], anio: y, semanas, hoy: fechaISO(fecha) };
}

export function duracionMs(tipo) {
  // Solo para pruebas: DURACION_PRUEBA_SEG=10 acorta cualquier compensación a 10 segundos
  if (process.env.DURACION_PRUEBA_SEG) return Number(process.env.DURACION_PRUEBA_SEG) * 1000;
  return TIPOS_COMPENSACION[tipo].duracion * 60 * 60 * 1000;
}
