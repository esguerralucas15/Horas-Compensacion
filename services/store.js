// Persistencia sencilla en archivos JSON dentro de /data
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "data");

function leer(nombre) {
  const ruta = join(DATA_DIR, `${nombre}.json`);
  if (!existsSync(ruta)) return [];
  return JSON.parse(readFileSync(ruta, "utf-8"));
}

function escribir(nombre, datos) {
  writeFileSync(join(DATA_DIR, `${nombre}.json`), JSON.stringify(datos, null, 2));
}

// ---------- Usuarios ----------
export function buscarUsuario(cedula) {
  return leer("usuarios").find((u) => u.cedula === cedula);
}

export function nombreCompleto(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ");
}

export function listarFuncionarios() {
  return leer("usuarios").filter((u) => u.rol !== "admin");
}

// ---------- Compensaciones ----------
export function listarCompensaciones() {
  return leer("compensaciones");
}

export function compensacionesDe(cedula) {
  return listarCompensaciones().filter((c) => c.cedula === cedula);
}

export function compensacionActiva(cedula) {
  return compensacionesDe(cedula).find((c) => c.estado === "en_curso");
}

export function crearCompensacion(datos) {
  const todas = listarCompensaciones();
  const nueva = { id: Date.now().toString(36), estado: "en_curso", ...datos };
  todas.push(nueva);
  escribir("compensaciones", todas);
  return nueva;
}

export function actualizarCompensacion(id, cambios) {
  const todas = listarCompensaciones();
  const i = todas.findIndex((c) => c.id === id);
  if (i === -1) return null;
  todas[i] = { ...todas[i], ...cambios };
  escribir("compensaciones", todas);
  return todas[i];
}

// ---------- Notificaciones al jefe de área ----------
export function listarNotificaciones() {
  return leer("notificaciones");
}

export function crearNotificacion(datos) {
  const todas = listarNotificaciones();
  todas.unshift({ id: Date.now().toString(36), leida: false, fecha: new Date().toISOString(), ...datos });
  escribir("notificaciones", todas);
}

export function marcarNotificacionesLeidas() {
  escribir("notificaciones", listarNotificaciones().map((n) => ({ ...n, leida: true })));
}
