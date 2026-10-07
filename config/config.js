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

