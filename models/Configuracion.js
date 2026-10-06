// Reglas de la Circular N° 10 de 2026: fechas, franja, festivos, sábados y gracia.
// Es un solo documento; se edita en Atlas sin tocar el código.
import mongoose from "mongoose";
import { CONFIG_ID } from "../config/config.js";

const { Schema, model } = mongoose;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const configuracionSchema = new Schema(
  {
    _id: { type: String, required: true },
    circular: String,
    area: String,
    zonaHoraria: { type: String, default: "America/Bogota" },
    turnoInformativo: { type: Boolean, default: true },
    horasRequeridasPorDefecto: { type: Number, default: 34 },
    jornadaDiariaPorDefecto: { type: Number, default: 8.5 },
    horaAdicional: {
      desde: { type: String, match: FECHA },
      hasta: { type: String, match: FECHA },
      horaInicio: { type: String, match: HORA },
      horaFin: { type: String, match: HORA },
      duracionMin: Number,
      horas: Number,
      diasSemana: [Number], // 1 = lunes ... 5 = viernes
      ventanaIniciar: { desde: String, hasta: String },
      ventanaFinalizar: { desde: String, hasta: String },
    },
    festivos: [{ type: String, match: FECHA }],
    sabadosHabilitados: [{ type: String, match: FECHA }],
    sabado: {
      horaInicio: { type: String, match: HORA },
      horaFin: { type: String, match: HORA },
      almuerzoMin: Number,
      horas: Number,
    },
    graciaMinutos: { type: Number, default: 15, min: 0 },
    turnos: [
      {
        _id: false,
        numero: Number,
        disfrute: [String],
        reintegro: String,
      },
    ],
    fechaCertificacion: String,
  },
  { collection: "configuracion", versionKey: false }
);

// Devuelve las reglas vigentes como objeto plano
configuracionSchema.statics.actual = async function () {
  const conf = await this.findById(CONFIG_ID).lean();
  if (!conf) throw new Error(`No existe el documento "${CONFIG_ID}" en la colección configuracion`);
  return conf;
};

export default model("Configuracion", configuracionSchema);
