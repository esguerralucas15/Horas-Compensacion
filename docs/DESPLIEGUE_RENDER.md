# Despliegue en Render + despertador

## 1. Subir el código
Hacer push de la rama que se va a desplegar (por ejemplo `Lucas-Esguerra`) a GitHub.

## 2. Crear el servicio en Render
1. Entrar a https://render.com con la cuenta de GitHub.
2. **New → Web Service** y elegir el repositorio `Horas-Compensacion` y la rama.
3. Configuración (si Render no la toma de `render.yaml`):
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
   - Region: **Ohio** (o Virginia)
   - Health Check Path: `/salud`
4. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = la misma cadena del `.env` (usuario `app_horas_compensacion`)
   - `SESSION_SECRET` = una cadena aleatoria larga (puede ser la del `.env`)
   - **No** poner `RELOJ_PRUEBA` (de todas formas se ignora en producción).
5. **Deploy**. Render da una dirección como `https://horas-compensacion.onrender.com`.

## 3. Permitir a Render conectarse a Atlas
Render no tiene IP fija en el plan gratuito. En Atlas → **Network Access → Add IP Address**:
- Si el panel del servicio en Render muestra **Outbound IP addresses** (pestaña Connect), agregar esos rangos.
- Si no, agregar `0.0.0.0/0` con un comentario "Render". Es aceptable porque el usuario de la
  aplicación solo tiene `readWrite` sobre `horas_compensacion` y su clave es larga; nunca usar el
  usuario administrador en Render.

Si el despliegue muestra `No se pudo conectar a MongoDB`, casi siempre es este paso.

## 4. Despertador (cron-job.org)
El plan gratuito de Render duerme el servicio tras 15 minutos sin visitas y tarda ~1 minuto en despertar.
1. Crear cuenta gratis en https://cron-job.org.
2. **Create cronjob**:
   - URL: `https://<tu-servicio>.onrender.com/salud`
   - Schedule: **cada 10 minutos**, todos los días.
   - Activar notificación por correo si falla.
3. Guardar. Con esto el servicio no se duerme (750 horas gratis al mes alcanzan para estar encendido todo el mes).

`/salud` responde `{"estado":"ok"}` (200) si la app y MongoDB están bien, o 503 si no hay conexión a Mongo.

## 5. Verificar
- Abrir la dirección desde la red de la Secretaría (algunas redes bloquean dominios externos).
- Entrar con una cédula de prueba, revisar el dashboard y cerrar sesión.
- Revisar en cron-job.org que las ejecuciones salen en verde.

## Si después se quiere pagar
En Render → el servicio → **Settings → Instance Type → Starter** (~USD 7/mes). Nunca se duerme y el
despertador deja de ser necesario. No hay que cambiar código.
