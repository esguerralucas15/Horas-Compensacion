// Configuración general de la aplicación.
// Los valores sensibles se leen del archivo .env (ver .env.example).
import "dotenv/config";

export const PORT = process.env.PORT || 3000;

// Cadena de conexión a MongoDB Atlas (base horas_compensacion)
export const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.includes("<")) {
  throw new Error(
    "Falta MONGODB_URI en el archivo .env (copia .env.example y pon el usuario y la clave de Atlas)."
  );
}

export const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("Falta SESSION_SECRET en el archivo .env.");
}

// _id del documento de la colección configuracion con las reglas de la circular
export const CONFIG_ID = "fin-anio-2026";

// Zona horaria en la que se calculan todas las fechas y horas
export const ZONA_HORARIA = "America/Bogota";

// ---------------------------------------------------------------------------
// TEMPORAL: constantes que todavía usan los controladores y servicios basados
// en archivos JSON. En los pasos 3 y 4 se reemplazan por la colección
// configuracion y por el rol guardado en funcionarios, y se eliminan de aquí.
// ---------------------------------------------------------------------------

// Única cédula con acceso a las páginas de administrador
export const CEDULA_ADMIN = "1000000100";

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
