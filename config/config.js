// Configuración general de la aplicación
export const PORT = process.env.PORT || 3000;

// Única cédula con acceso a las páginas de administrador
export const CEDULA_ADMIN = "1000000100";

export const SESSION_SECRET =
  process.env.SESSION_SECRET || "horas-compensacion-sed-secret";

// Total de horas que cada funcionario debe compensar para el descanso de diciembre
export const HORAS_REQUERIDAS = 34;

export const PERIODO_DESCANSO = "diciembre de 2026";

// Tipos de compensación:
//  - duracion: horas que corre el temporizador
//  - horas: horas que suman al progreso del funcionario
export const TIPOS_COMPENSACION = {
  // Hora extra después de la jornada laboral
  hora: { duracion: 1, horas: 1, nombre: "Hora extra" },
  // Jornada completa del sábado (8 horas); la hora de almuerzo no cuenta
  sabado: { duracion: 8, horas: 7, nombre: "Jornada sábado" },
};

// Únicos sábados habilitados para compensar (YYYY-MM-DD)
export const SABADOS_HABILITADOS = [
  "2026-10-10",
  "2026-10-17",
  "2026-10-24",
  "2026-10-31",
  "2026-11-07",
];
