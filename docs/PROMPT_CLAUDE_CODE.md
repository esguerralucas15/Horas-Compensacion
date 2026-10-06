# Prompt para Claude Code (pasos 4 a 7)

Copia todo el bloque de abajo y pégalo en Claude Code, abierto en la carpeta `Horas-Compensacion`.

```
Hola. Vas a terminar la migración de esta aplicación (Express 5 + EJS) de archivos JSON a MongoDB Atlas. Los pasos 1, 2 y 3 ya están hechos; te toca hacer los pasos 4, 5, 6 y 7.

ANTES DE ESCRIBIR CÓDIGO:
1. Lee completo docs/PLAN_MONGODB.md. Ahí están las reglas de negocio confirmadas, la estructura de la base, los índices, la API de los servicios ya hechos y el detalle de cada paso pendiente. Sigue ese documento; si algo del código actual lo contradice, manda el documento.
2. Revisa services/tiempo.js, services/reglas.js, services/horas.js, los modelos en models/ y config/db.js. No reescribas esa lógica: úsala. Si necesitas cambiar una regla, cambia reglas.js y sus pruebas.
3. Corre `git status`, `git log --oneline -8` y `npm test` (deben pasar 28 pruebas).
4. Corre `npm run dev` y confirma que aparece `MongoDB conectado a la base "horas_compensacion"`. Si falla la conexión, detente y avísame (normalmente es la IP en Network Access de Atlas o el .env).

REGLAS DE TRABAJO:
- Trabaja SOLO en la rama Lucas-Esguerra. No toques main. No hagas push ni abras PR sin que yo lo pida.
- Haz un commit por paso (4, 5, 6 y 7), con mensaje en español que diga qué cambió.
- Respeta los finales de línea CRLF de los archivos existentes.
- Código, comentarios, textos de la interfaz y commits en español.
- Nunca subas .env. No escribas claves en el código ni en los commits.
- No borres datos de la base de MongoDB sin preguntarme primero. Para probar, usa un funcionario de prueba temporal como dice el plan y al final pregúntame antes de borrarlo.
- Para fechas y horas usa siempre services/tiempo.js (hora de Bogotá). Nunca uses getHours() ni la hora local del servidor para las reglas.
- No uses syncIndexes() ni cambies los nombres u orden de llaves de los índices.

ORDEN:
- Paso 4: sesiones con connect-mongo y controladores (auth, usuario, admin) usando services/horas.js. Quitar notificaciones.
- Paso 5: vistas (dashboard con botones y motivo, sábados asignados, temporizador hasta la hora fija de fin, panel de la administradora con turno y sin finalizar, reporte PDF con turno).
- Paso 6: pruebas automáticas y manuales con RELOJ_PRUEBA (lista de casos en el plan). Muéstrame el resultado de cada caso.
- Paso 7: limpieza (store.js, data/, constantes temporales, README sin la cédula del admin).

Al terminar cada paso, muéstrame un resumen corto de los archivos que cambiaste y cómo lo probaste, y espera mi visto bueno antes de seguir con el siguiente. Si algo de las reglas no está claro, pregúntame en vez de suponer.
```
