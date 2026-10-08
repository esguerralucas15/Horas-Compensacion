# Horas Compensación
Página web para el control de las horas de compensación de la Secretaría de Educación, área de Tesorería y Contabilidad
(Circular N° 10 de 2026, descanso de fin de año). Funciona como una planilla: cada persona entra con su cédula,
registra su hora adicional o su sábado y la aplicación suma hasta completar sus horas. La jefe de área consulta
el avance y genera el reporte PDF.

Stack: Node.js (ES Modules), Express 5, EJS, MongoDB Atlas con Mongoose, sesiones en MongoDB (connect-mongo), pdfkit.

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` como `.env` y completar los valores:
   - `MONGODB_URI`: cadena de conexión de Atlas con el usuario de la aplicación (solo `readWrite` sobre `horas_compensacion`).
   - `SESSION_SECRET`: cadena aleatoria larga (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - `PORT`: puerto del servidor (por defecto 3000).

   El archivo `.env` tiene claves: nunca se sube al repositorio.

3. En Atlas, la IP del equipo debe estar autorizada en **Network Access**. Si no, la conexión falla con
   `ServerSelectionError` o `SSL alert number 80`.

## Ejecutar

```bash
npm run dev        # con nodemon; o: npm start
```

Al arrancar debe aparecer `MongoDB conectado a la base "horas_compensacion"`. Abrir http://localhost:3000

Si aparece "el puerto ya está en uso", hay otro servidor abierto en ese puerto: hay que cerrarlo primero.

## Pruebas

```bash
npm test
```

Prueba las reglas de la circular (`services/reglas.js`) y las fechas en hora de Bogotá (`services/tiempo.js`) sin
conectarse a la base.

### Reloj simulado

Para probar los horarios sin esperar al día y la hora reales, `RELOJ_PRUEBA` hace que la aplicación arranque en una
fecha y hora de Bogotá; desde ahí el reloj avanza normalmente.

```powershell
# PowerShell
$env:RELOJ_PRUEBA="2026-10-13T16:35"; npm run dev
# para quitarlo:
Remove-Item Env:RELOJ_PRUEBA
```

```bash
# bash
RELOJ_PRUEBA="2026-10-13T16:35" npm run dev
```

Para las pruebas se usa un funcionario temporal (no personas reales) y después se borran él y sus registros.

## Acceso

- Se entra solo con la cédula. Debe existir en la colección `funcionarios` con `activo: true`.
- El rol sale del documento: `funcionario` → páginas `/usuario/...`; `admin` → páginas `/admin/...`.
- La administradora escribe su cédula seguida de `@` (por ejemplo `12345678@`); solo con la cédula no entra.

## Reglas principales

- **Horas requeridas:** 4 jornadas por persona (34 h con jornada de 8,5 h; 26 h con 6,5 h).
- **Hora adicional:** lunes a viernes hábiles del 13 de octubre al 1 de diciembre de 2026, sin festivos.
  Se inicia de 4:30 a 4:45 p.m. y el fin es fijo a las 5:30 p.m.; Finalizar se presiona de 5:30 a 5:45 p.m. Suma 1 hora.
  Una por día.
- **Sábados:** solo los asignados a cada persona, en su horario (inicio con 15 minutos de gracia, finalizar hasta
  15 minutos después del fin). Suma las horas de ese sábado (8,5, 6,5 o 5).
- **Sin finalizar:** si no se presiona Finalizar a tiempo, el registro queda `sin_finalizar` y no suma.
- Una sola compensación en curso por persona; al completar las horas ya no se puede iniciar otra.
- El turno de descanso es solo informativo.

Las fechas, franjas, festivos y sábados habilitados están en el documento `fin-anio-2026` de la colección
`configuracion`. Todas las horas se calculan en hora de Bogotá (`services/tiempo.js`).

El detalle de las reglas, la estructura de la base y los índices está en [docs/PLAN_MONGODB.md](docs/PLAN_MONGODB.md).

## Rutas

| Ruta | Rol | Vista |
|---|---|---|
| `GET /login` · `POST /login` · `POST /logout` | Público | Inicio de sesión |
| `GET /usuario/dashboard` | Funcionario | Botones del día con su motivo, horas, progreso y calendario |
| `GET /usuario/sabados` | Funcionario | Sábados asignados y su estado |
| `GET /usuario/compensacion/inicio?tipo=hora\|sabado` | Funcionario | Explica el horario y permite iniciar |
| `POST /usuario/compensacion/iniciar` | Funcionario | Crea el registro en curso |
| `GET /usuario/compensacion/temporizador` | Funcionario | Cuenta regresiva hasta la hora de fin |
| `POST /usuario/compensacion/finalizar` | Funcionario | Finaliza el registro dentro de la ventana |
| `GET /admin/dashboard?turno=1\|2\|3\|sin&estado=completo\|progreso` | Administrador | Avance del equipo con filtros |
| `GET /admin/reporte` (mismos filtros) | Administrador | Reporte PDF |
| `GET /admin/registros?cedula=` | Administrador | Registros de la planilla |
| `GET /admin/funcionarios/:cedula` | Administrador | Detalle e historial de una persona |

## Estructura

```
app.js                 Servidor Express (conecta a MongoDB antes de escuchar)
config/                Variables de .env, conexión a MongoDB y sesión
models/                Funcionario, Registro y Configuracion (Mongoose)
services/              tiempo.js (hora de Bogotá), reglas.js (reglas puras),
                       horas.js (reglas + MongoDB), reporte.js (PDF)
controllers/           auth, funcionario y administrador
middlewares/           Protección por sesión/rol, ayudas de formato y errores
routes/                Rutas (auth, usuario, admin)
views/                 auth, usuario, admin, partials, errores (EJS)
public/                css, js, img
test/                  Pruebas de reglas y tiempo (node --test)
docs/                  Plan de la migración a MongoDB
```
