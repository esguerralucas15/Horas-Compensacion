// Reporte PDF de horas de compensación del equipo
import PDFDocument from "pdfkit";
import { join } from "path";
import { HORAS_REQUERIDAS, PERIODO_DESCANSO } from "../config/config.js";

const RAIZ = join(import.meta.dirname, "..");
const ROJO = "#bb2d33";
const DORADO = "#e8a63b";
const GRIS = "#6b6b6b";
const GRIS_LINEA = "#e2e2e2";

const COLUMNAS = [
  { titulo: "Nombre y Apellido", ancho: 160, valor: (f) => f.nombreCompleto },
  { titulo: "Cédula", ancho: 90, valor: (f) => f.cedula },
  { titulo: "Horas compensadas", ancho: 100, valor: (f) => `${f.resumen.compensadas} h`, alinear: "center" },
  { titulo: "Horas restantes", ancho: 90, valor: (f) => `${f.resumen.restantes} h`, alinear: "center" },
  { titulo: "Avance", ancho: 72, valor: (f) => `${f.resumen.porcentaje}%`, alinear: "center" },
];

export function generarReportePDF(funcionarios, salida) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50, info: { Title: "Reporte de horas de compensación" } });
  doc.registerFont("Narrow", join(RAIZ, "assets/fonts/PTSansNarrow-Regular.ttf"));
  doc.registerFont("Narrow-Bold", join(RAIZ, "assets/fonts/PTSansNarrow-Bold.ttf"));
  doc.pipe(salida);

  const izq = doc.page.margins.left;
  const anchoUtil = doc.page.width - izq - doc.page.margins.right;

  // Encabezado
  doc.image(join(RAIZ, "public/img/logo.png"), doc.page.width - izq - 32, 40, { width: 32 });
  doc.font("Narrow-Bold").fontSize(24).fillColor("#000").text("Área de Contabilidad", izq, 48);
  doc.font("Narrow").fontSize(14).fillColor(GRIS)
    .text(`Reporte de horas de compensación — descanso de ${PERIODO_DESCANSO}`);
  doc.fontSize(11).text(
    `Generado el ${new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`
  );
  doc.moveTo(izq, 118).lineTo(izq + anchoUtil, 118).strokeColor(ROJO).lineWidth(2).stroke();

  // Resumen
  const total = funcionarios.reduce((s, f) => s + f.resumen.compensadas, 0);
  doc.font("Narrow-Bold").fontSize(13).fillColor(GRIS).text("Horas compensadas por el equipo", izq, 134);
  doc.fontSize(28).fillColor(DORADO).text(`${total} Horas`, izq, 150);
  doc.font("Narrow").fontSize(11).fillColor(GRIS)
    .text(`${funcionarios.length} funcionarios · ${HORAS_REQUERIDAS} horas requeridas por funcionario`, izq, 186);

  // Tabla
  let y = 220;
  const fila = (valores, { negrita = false, color = "#000", fondo } = {}) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    if (fondo) doc.rect(izq, y - 6, anchoUtil, 26).fill(fondo);
    let x = izq + 8;
    doc.font(negrita ? "Narrow-Bold" : "Narrow").fontSize(12).fillColor(color);
    COLUMNAS.forEach((c, i) => {
      doc.text(valores[i], x, y, { width: c.ancho - 8, align: c.alinear || "left", lineBreak: false });
      x += c.ancho;
    });
    y += 26;
    doc.moveTo(izq, y - 6).lineTo(izq + anchoUtil, y - 6).strokeColor(GRIS_LINEA).lineWidth(1).stroke();
  };

  fila(COLUMNAS.map((c) => c.titulo), { negrita: true, color: "#fff", fondo: ROJO });
  if (funcionarios.length) {
    funcionarios.forEach((f) => fila(COLUMNAS.map((c) => String(c.valor(f)))));
  } else {
    doc.font("Narrow").fontSize(12).fillColor(GRIS).text("No hay funcionarios registrados.", izq + 8, y);
  }

  doc.end();
}
