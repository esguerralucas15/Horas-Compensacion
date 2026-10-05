# Horas Compensación
desarrollo de página web para control de horas de compensación de disfrute para la Secretaría de Educación

## Ejecutar

```bash
npm install
npm run dev        # o: npm start
```

Abrir http://localhost:3000

Para probar el flujo sin esperar 1 u 8 horas, se puede acortar la duración de cualquier compensación:

```bash
DURACION_PRUEBA_SEG=10 npm start
```

## Acceso por número de identificación

- **52369618** → páginas de administrador (`/admin/...`).
- Cualquier otra cédula registrada en `data/usuarios.json` → páginas de funcionario (`/usuario/...`).
- Cédulas no registradas no pueden ingresar.

La cédula de administrador, las horas requeridas (34) y la duración de cada tipo de compensación se configuran en `config/config.js`.

## Tipos de compensación

- **Hora extra** (después de la jornada laboral): el temporizador corre 1 hora y suma 1 hora al progreso. Máximo una por día.
- **Sábado**: el temporizador corre la jornada completa (8 horas) y suma 7 horas al progreso, porque la hora de almuerzo no cuenta. Solo se pueden elegir los sábados de `SABADOS_HABILITADOS` (10, 17, 24 y 31 de octubre y 7 de noviembre de 2026), y cada uno una sola vez.

Las sesiones se guardan en `data/sesiones.json`, así que un reinicio del servidor no saca al funcionario del flujo ni detiene su temporizador.

## Rutas

| Ruta | Rol | Vista |
|---|---|---|
| `GET /login` · `POST /login` · `POST /logout` | Público | Inicio de sesión |
| `GET /usuario/dashboard` | Funcionario | Dashboard (horas, progreso, calendario, modal de éxito) |
| `GET /usuario/sabados` · `POST /usuario/sabados` | Funcionario | Compensación día sábado |
| `GET /usuario/compensacion/inicio?tipo=hora\|sabado` | Funcionario | Inicio de compensación (1 hora / jornada 8 horas) |
| `POST /usuario/compensacion/iniciar` | Funcionario | Inicia el tiempo |
| `GET /usuario/compensacion/temporizador` | Funcionario | Reloj de arena con cuenta regresiva |
| `POST /usuario/compensacion/finalizar` | Funcionario | Guarda el registro y notifica al jefe de área |
| `GET /admin/dashboard` | Administrador | Resumen y progreso de funcionarios |
| `GET /admin/reporte` | Administrador | Descarga el PDF con nombre y apellido, cédula y horas de cada funcionario |
| `GET /admin/registros` | Administrador | Todos los registros (filtro por funcionario) |
| `GET /admin/funcionarios/:cedula` | Administrador | Detalle e historial de un funcionario |
| `GET /admin/notificaciones` | Administrador | Notificaciones de compensaciones finalizadas |

## Estructura

```
app.js                 Servidor Express
config/                Configuración y sesión
controllers/           Lógica de auth, funcionario y administrador
middlewares/           Protección por sesión/rol y manejo de errores
routes/                Rutas (auth, usuario, admin)
services/              Persistencia JSON y cálculos de horas
data/                  usuarios.json, compensaciones.json, notificaciones.json
views/                 auth, usuario, admin, partials, errores (EJS)
public/                css, js, img
```
