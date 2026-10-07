import express from "express";
import { join } from "path";

import appRouter from "./routes/router.js";
import sesion from "./config/session.js";
import { conectarDB } from "./config/db.js";
import { PORT } from "./config/config.js";
import { variablesVista } from "./middlewares/auth.js";
import { noEncontrado, manejadorErrores } from "./middlewares/errores.js";

const app = express();

app.set("view engine", "ejs");
app.set("views", join(import.meta.dirname, "views"));

app.use(express.static(join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(sesion);
app.use(variablesVista);

app.use("/", appRouter);

app.use(noEncontrado);
app.use(manejadorErrores);

// Primero se conecta a MongoDB; si falla, el servidor no arranca
try {
  await conectarDB();
  // En Express 5 el error de listen (p. ej. puerto ocupado) llega a este callback
  app.listen(PORT, (err) => {
    if (err) {
      console.error(
        `No se pudo iniciar el servidor en el puerto ${PORT}: ${err.code === "EADDRINUSE" ? "el puerto ya está en uso (¿hay otro servidor abierto?)" : err.message}`
      );
      process.exit(1);
    }
    console.log(`Server running 🚀 at http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("No se pudo conectar a MongoDB:", err.message);
  process.exit(1);
}
