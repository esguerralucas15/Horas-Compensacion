# Plan de integración con MongoDB — Horas de Compensación

Este documento resume todo lo decidido y construido para migrar la aplicación de archivos JSON a MongoDB Atlas, y lo que falta por hacer. **Léelo completo antes de cambiar código.**

Explicación detallada de la base (con diagrama): https://claude.ai/code/artifact/e3b76510-bae1-4638-8bbf-0ea0677af223

---

## 0. Contexto y reglas de trabajo

- **Qué es:** página web de la Secretaría de Educación, área de Contabilidad, para registrar las horas de compensación de la **Circular N° 10 del 25 de septiembre de 2026** (descanso de fin de año, diciembre 2026 – enero 2027). Funciona como una **planilla**: cada persona entra solo con su cédula, registra su hora o su sábado y la aplicación suma hasta completar sus horas. La jefe de área (administradora) solo consulta el avance y genera reportes.
- **Stack:** Node.js (ES Modules), Express 5, EJS, express-session, pdfkit, Mongoose 8, connect-mongo 5, dotenv.
- **Rama de trabajo:** `Lucas-Esguerra`. **No tocar `main`. No hacer push sin que el usuario lo pida.**
- **Para revertir:** existe la etiqueta `antes-mongodb` (estado previo a la migración): `git reset --hard antes-mongodb`.
- **Un commit por paso**, con mensaje en español que explique qué cambió.
- **Fin de línea:** los archivos del repo están en CRLF en la copia de trabajo (Windows) y `.gitattributes` tiene `* text=auto`. Respeta CRLF al crear o editar archivos.
- **Idioma:** código, comentarios, mensajes de la interfaz y commits en español.

## 1. Reglas de negocio (confirmadas con el usuario)

| Regla | Detalle |
|---|---|
| Login | Solo con la cédula. Si no está en `funcionarios` o `activo: false`, no entra. El rol (`funcionario` / `admin`) sale del documento; ya no existe `CEDULA_ADMIN`. |
| Horas requeridas | Por persona: `4 × jornadaDiaria` → 34 h normal; 26 h con horario de 6,5 h (María Francisca). |
| Hora adicional | Lunes a viernes hábiles del **13-oct-2026 al 01-dic-2026**, excepto festivos (02-nov y 16-nov). Franja **4:30 a 5:30 p.m.**, igual para todos. Suma 1 h. |
| Gracia | 15 min (`configuracion.graciaMinutos`). **Iniciar:** de 4:30 a 4:45 p.m. **Finalizar:** de 5:30 a 5:45 p.m. |
| Fin fijo | El fin es fijo (5:30 p.m.), no "60 minutos desde que inició". Quien inicia a las 4:40 finaliza a las 5:30 y la hora cuenta completa. |
| Una por día | Un solo registro de tipo `hora` por persona y fecha, aunque haya quedado `sin_finalizar`. |
| Sábados | **Sí limitan**: solo se puede compensar en los sábados que estén en `funcionario.sabados`, en su `horaInicio` (+ gracia) y se finaliza en su `horaFin` (+ gracia). Suma `sabados[].horas` (8,5 / 6,5 / 5). Sábados válidos: 10, 17, 24, 31 de octubre y 7 de noviembre. |
| Turno | **Solo informativo** (1, 2, 3 o `null`). No bloquea nada; se muestra en el panel y el reporte. |
| diasPlaneados | **Solo informativo** (días que la persona acordó con su jefe). No bloquea nada. |
| Un temporizador | Una sola compensación `en_curso` por persona. |
| Tope | Al llegar a `horasRequeridas` ya no se puede iniciar más. El resumen nunca pasa de `horasRequeridas`. |
| Sin finalizar | Si no presiona Finalizar antes de `limiteFinalizar`, el registro pasa a `sin_finalizar` y **no suma**. |
| Administradora | La jefe de área: un documento de `funcionarios` con `rol: "admin"` (su cédula no se escribe en el repositorio, que es público). Solo consulta y reportes; no registra horas ni edita registros. |
| Notificaciones | **Se eliminan** (la administradora solo ve avance y reportes). |

## 2. Base de datos (MongoDB Atlas)

- Proyecto `Project 0`, cluster `Clustercompensacion` (M0, AWS us-east-1), base **`horas_compensacion`**.
- La base vieja `compensación` (con tilde) no se usa; se borrará al final.
- Usuario de la aplicación: `app_horas_compensacion`, rol `readWrite` solo sobre `horas_compensacion`, restringido al cluster. Va en `MONGODB_URI` del `.env`.
- **Network Access:** solo IP autorizadas. Si la conexión falla con `SSL alert number 80` / `ServerSelectionError`, falta autorizar la IP actual en Atlas.

### Colecciones

**`configuracion`** — un documento `_id: "fin-anio-2026"` con las reglas de la circular: `horaAdicional {desde, hasta, horaInicio, horaFin, horas, diasSemana, ventanaIniciar, ventanaFinalizar}`, `festivos`, `sabadosHabilitados`, `sabado {horaInicio, horaFin, almuerzoMin, horas}`, `graciaMinutos`, `turnos [{numero, disfrute[], reintegro}]`, `turnoInformativo`, `fechaCertificacion` ("2026-12-04"). Se lee con `Configuracion.actual()`.

**`funcionarios`** — 44 documentos (43 funcionarios + 1 admin). `_id` = cédula (texto).
```js
{ _id: "1000000103", nombre: "NOMBRE APELLIDO", rol: "funcionario", turno: 3,
  jornadaDiaria: 8.5, horasRequeridas: 34,
  horaAdicional: { habilitada: true, diasPlaneados: ["2026-10-13", ...] | null },
  sabados: [{ fecha: "2026-10-10", horaInicio: "07:00", horaFin: "16:30", horas: 8.5 }, ...],
  observaciones: "", activo: true }
```
Solo 3 personas tienen sábados: Claribel (10 y 24-oct, 8,5 h), Mónica Varón (10 y 24-oct 8,5 h; 31-oct 7:00–12:00, 5 h), María Francisca (10 y 24-oct, 7:00–14:30, 6,5 h).

**`registros`** — la planilla. Una fila por compensación.
```js
{ funcionario: "1000000101", tipo: "hora" | "sabado", fecha: "2026-10-13", horas: 1,
  estado: "en_curso" | "finalizado" | "sin_finalizar",
  inicio: Date, finProgramado: Date, limiteFinalizar: Date, fin: Date | null }
```
Las horas se copian al crear el registro y **no** se recalculan desde la configuración (auditoría).

**`sessions`** — la crea connect-mongo (paso 4). Reutiliza la conexión de Mongoose (`clientPromise`) en lugar de `mongoUrl`: con dos conexiones simultáneas el DNS a veces rechazaba una consulta SRV (`querySrv EREFUSED`).

### Índices

| Colección | Nombre | Llaves | Notas |
|---|---|---|---|
| funcionarios | `rol_turno` | `{rol, turno}` | ya existe |
| registros | `funcionario_estado` | `{estado, funcionario}` | ya existe — **en Atlas quedó en este orden**; el modelo lo declara igual. No cambiarlo o Mongoose falla al arrancar. |
| registros | `estado_limiteFinalizar` | `{estado, limiteFinalizar}` | ya existe |
| registros | `fecha` | `{fecha}` | ya existe |
| registros | `un_registro_por_dia` | `{funcionario, tipo, fecha}` único | lo crea Mongoose al arrancar (`Registro.init()`) |
| registros | `un_en_curso_por_funcionario` | `{funcionario}` único parcial `estado: "en_curso"` | lo crea Mongoose al arrancar |

No uses `syncIndexes()` (borra índices). Después del primer `npm run dev` verifica que existan los dos únicos.

## 3. Lo que ya está hecho

| Paso | Commit | Qué |
|---|---|---|
| 1 | `01b6de3`, `8fc924b` | Dependencias (`mongoose`, `connect-mongo`, `dotenv`; `nodemon` en dev), `.env.example`, `.gitignore` con `.env` y `.DS_Store`. |
| 2 | `85abd07`, `aacd195` | `config/db.js` (`conectarDB()`), `app.js` conecta antes de `listen`, `config/config.js` lee `.env`, modelos `Funcionario`, `Registro`, `Configuracion`. |
| 3 | `bd257ca` | `services/tiempo.js`, `services/reglas.js`, `services/horas.js` y pruebas en `test/`. |
| 4 | `8a090c9` | Sesiones con connect-mongo y controladores sobre `services/horas.js`; sin notificaciones. |
| 5 | `77e093b` | Vistas: botones con motivo, sábados asignados, temporizador hasta la hora fija, panel con turno y sin finalizar, PDF con turno. |
| 6 | `45d473b`, `eb2337f` | Pruebas con `RELOJ_PRUEBA` (31 automáticas); motivo VENCIDO al finalizar tarde; aviso si el puerto está ocupado. |
| 7 | (este commit) | Limpieza: sin `store.js`, `compensacion.js`, `data/` ni constantes TEMPORAL; README nuevo sin la cédula de la administradora. |

La migración está completa: ya no hay archivos JSON ni constantes TEMPORAL. Las secciones 4 y 5 quedan como registro de lo que se pidió en cada paso.

### API de los servicios nuevos

**`services/tiempo.js`** (puro, hora de Bogotá con desfase fijo UTC-5):
- `ahora()` → `Date`. Respeta `RELOJ_PRUEBA="2026-10-13T16:35"` (simula fecha/hora de Bogotá y avanza desde ahí).
- `partesBogota(date)` → `{ fecha: "AAAA-MM-DD", hora: "HH:MM", minutos, diaSemana (1=lun…7=dom) }`
- `aFechaHora(fecha, "HH:MM")` → `Date`; `sumarMinutos(date, n)`; `minutosDe("HH:MM")`; `horaDeMinutos(n)`
- `horaLegible("16:30")` → `"4:30 p.m."`; `fechaLegible("2026-10-24")` → `"sábado 24 de octubre"`
- **Nunca uses `new Date().getHours()` ni `toLocaleString` sin zona para reglas:** usa estas funciones.

**`services/reglas.js`** (puro, sin base de datos; probado en `test/reglas.test.js`). Todas devuelven `{ permitido, codigo, motivo, ... }`:
- `evaluarHora({ config, funcionario, registros, ahora })` → si `permitido`, trae `programacion: { tipo, fecha, horas, finProgramado, limiteFinalizar }`.
- `evaluarSabado({ ... })` → igual; si no es su sábado trae `proximo`.
- `evaluarFinalizar({ registro, ahora })`
- `opcionesDelDia({ ... })` → `{ hora, sabado, enCurso, finalizar }` (todo lo del dashboard).
- `resumen(funcionario, registros, ahora)` → `{ horasSemana, horasSabado, compensadas, restantes, requeridas, porcentaje, sinFinalizar, diasCompensados, historial }`.
- `estadoEfectivo`, `horasFinalizadas`, `registroEnCurso`.
- Códigos: `OK, NO_REGISTRADO, INACTIVO, ROL, EN_CURSO, COMPLETO, NO_HABILITADA, ANTES_PERIODO, DESPUES_PERIODO, NO_HABIL, FESTIVO, YA_REGISTRADA, ANTES_FRANJA, FRANJA_CERRADA, SIN_SABADOS, NO_ES_SU_SABADO, SIN_SABADOS_PENDIENTES, YA_REGISTRADO, SIN_CURSO, ANTES_FIN, VENCIDO, DUPLICADO`.

**`services/horas.js`** (async, usa Mongo; **aún no probado contra Atlas**):
- `vencerRegistros(ahora)` → marca `en_curso` vencidos como `sin_finalizar`.
- `contextoFuncionario(cedula)` → `{ config, funcionario, registros, ahora }`.
- `panelFuncionario(cedula)` → contexto + `resumen` + `opciones` (o `null` si no existe).
- `iniciarCompensacion(cedula, "hora" | "sabado")` → `{ ok: true, registro }` o `{ ok: false, codigo, motivo }` (incluye `DUPLICADO` por error 11000).
- `finalizarCompensacion(cedula)` → `{ ok: true, registro }` o `{ ok: false, codigo, motivo }`. La condición de tiempo va dentro de `findOneAndUpdate`.
- `avanceEquipo({ turno })` → lista de funcionarios con `compensadas, restantes, porcentaje, sinFinalizar, enCurso` (aggregate con `$lookup`). `turno: null` = sin turno.
- `historialFuncionario(cedula)`.

## 4. Detalle de los pasos 4 a 7 (hechos)

### Paso 4 — Controladores y sesiones
1. **`config/session.js`**: reemplazar `ArchivoStore` por `connect-mongo` (`MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "sessions", ttl: 10 * 60 * 60 })`). Mantener cookie `horas.sid`, `httpOnly`, `sameSite: "lax"`, `rolling`. Guardar en sesión solo `{ cedula, nombre, rol }`.
2. **`controllers/authController.js`**: `await Funcionario.findOne({ _id: cedula, activo: true }).lean()`; rol desde el documento; quitar `CEDULA_ADMIN`.
3. **`controllers/usuarioController.js`** (todo `async`, usar solo `services/horas.js`):
   - `dashboard`: `panelFuncionario(cedula)` → `resumen`, `opciones`, calendario (en hora de Bogotá), mensajes flash (`registrada`, `flashError`).
   - `sabados` (GET): lista de sus sábados asignados con estado (registrado / pendiente / pasado) y el botón según `opciones.sabado`. El POST de "seleccionar sábado" ya no es necesario: el sábado válido es el de hoy; se puede quitar la ruta o redirigir.
   - `inicio` (GET `?tipo=hora|sabado`): muestra el texto y el botón Iniciar solo si la evaluación está permitida; si no, el `motivo`.
   - `iniciar` (POST): `iniciarCompensacion(cedula, tipo)` → ok: temporizador; si no: `flashError = motivo` y volver al dashboard.
   - `temporizador`: registro en curso; pasar `finProgramadoMs`, `limiteFinalizarMs`, `ahoraMs` (de `ahora()`).
   - `finalizar` (POST): `finalizarCompensacion(cedula)`; ok → `flash = "registrada"`; si no → `flashError = motivo`.
   - Quitar la creación de notificaciones.
4. **`controllers/adminController.js`**: `avanceEquipo()` para dashboard y reporte; filtros por `?turno=1|2|3|sin` y `?estado=completo|progreso`; `registros` desde `Registro.find()` (filtro por cédula) con nombres de `funcionarios`; `detalleFuncionario` con `Funcionario.findById` + `historialFuncionario` + `resumen`. Quitar notificaciones.
5. **Rutas**: quitar `/admin/notificaciones`.

### Paso 5 — Vistas
- `views/usuario/dashboard.ejs`: botones "Iniciar hora adicional" e "Iniciar sábado" deshabilitados con su `motivo` visible; "Continuar compensación" si hay `enCurso`; mostrar `flashError`; horas por tipo; turno (informativo).
- `views/usuario/sabados.ejs`: lista de sus sábados (fecha legible, horario, horas, estado). Sin selector libre.
- `views/usuario/inicio.ejs`: textos con la franja real (4:30–5:30 p.m.; sábado según su horario y horas).
- `views/usuario/temporizador.ejs` + `public/js/temporizador.js`: cuenta regresiva hasta `finProgramado` (ya no `inicio + duración`); habilita Finalizar al llegar; después de `limiteFinalizar` muestra "plazo vencido" y deshabilita. Mantener la corrección de desfase servidor/navegador (`data-ahora`).
- `views/admin/dashboard.ejs`: saludo con `usuario.nombre` (antes tenía un saludo fijo); columnas Turno y Sin finalizar; filtros; quitar la tarjeta de notificaciones (puede reemplazarse por "Registros sin finalizar" o "En curso ahora").
- `views/admin/registros.ejs` y `funcionario.ejs`: horas desde `registro.horas` (no desde la configuración), nombres de tipo `{ hora: "Hora adicional", sabado: "Sábado" }`, estados `en_curso / finalizado / sin_finalizar`.
- `services/reporte.js`: columna Turno; texto "horas requeridas según jornada" (no siempre 34).
- `views/partials/sidebar.ejs`: quitar el enlace a Notificaciones. Borrar `views/admin/notificaciones.ejs`.
- `services/compensacion.js`: `calendarioMes` usa la hora del servidor; pasarla a `tiempo.js` (Bogotá).

### Paso 6 — Pruebas
- `npm test` debe seguir en verde. Agregar pruebas si cambias reglas.
- `npm run dev` debe mostrar `MongoDB conectado a la base "horas_compensacion"` y crear los dos índices únicos.
- Pruebas manuales con reloj simulado (PowerShell): `$env:RELOJ_PRUEBA="2026-10-13T16:35"; npm run dev`.
  Casos: antes de 4:30, 4:30–4:45, después de 4:45, finalizar antes de 5:30 / 5:30–5:45 / después de 5:45, festivo (2026-11-02), fin de semana, sábado asignado (Claribel 2026-10-10 07:05), sábado no asignado (2026-10-17), doble clic en Iniciar, completar horas, login de admin y de cédula inexistente, reporte PDF.
- **No dejes registros de prueba de personas reales.** Usa un funcionario de prueba temporal (por ejemplo `_id: "1000000001"`, nombre "PRUEBA") y al final borra ese funcionario y sus registros. Pide confirmación al usuario antes de borrar cualquier cosa en la base.

### Paso 7 — Limpieza
- Borrar `services/store.js`, la carpeta `data/`, las constantes TEMPORAL de `config/config.js`, lo que quede sin uso de `services/compensacion.js`, `DURACION_PRUEBA_SEG`.
- `nodemon.json`: quitar `data/*`.
- `README.md`: instrucciones nuevas (`.env`, `npm test`, `RELOJ_PRUEBA`), **quitar la cédula del administrador** (el repo es público).
- La base vieja `compensación` se borra solo cuando el usuario lo confirme.

## 5. Pendientes por confirmar con el usuario
- Gracia de 15 min (iniciar y finalizar).
- Horario de sábado 7:00 a.m.–4:30 p.m. con 8,5 h; el de María Francisca 7:00–2:30 p.m. (6,5 h).
- Modalidad de Nubia Cascante, Rossmary del Busto y Yully Prieto (se asumió hora adicional).

## 6. Fechas clave
- **Sábado 10-oct-2026:** primer sábado habilitado (Claribel, Mónica, María Francisca). Si la app no está lista, se anota en planilla manual y luego se cargan los registros.
- **13-oct-2026:** empieza la hora adicional.
- **01-dic-2026:** último día de hora adicional.
- **04-dic-2026:** la jefe certifica el cumplimiento (reporte PDF).
