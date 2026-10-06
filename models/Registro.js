// La planilla: una fila por cada hora adicional o sábado compensado.
import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const ESTADOS = ["en_curso", "finalizado", "sin_finalizar"];
export const TIPOS = ["hora", "sabado"];

const registroSchema = new Schema(
  {
    // Cédula de la persona (apunta al _id de funcionarios)
    funcionario: { type: String, ref: "Funcionario", required: true },
    tipo: { type: String, enum: TIPOS, required: true },
    // Día compensado en hora de Bogotá
    fecha: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Horas que suma; se copian del plan al iniciar y no cambian después
    horas: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS, default: "en_curso" },
    inicio: { type: Date, required: true }, // clic en Iniciar
    finProgramado: { type: Date, required: true }, // desde aquí se puede finalizar
    limiteFinalizar: { type: Date, required: true }, // finProgramado + gracia
    fin: { type: Date, default: null }, // clic en Finalizar
  },
  { collection: "registros", versionKey: false, timestamps: true }
);

// Una sola hora por día y cada sábado una sola vez (aunque haya doble clic)
registroSchema.index(
  { funcionario: 1, tipo: 1, fecha: 1 },
  { unique: true, name: "un_registro_por_dia" }
);

// Un solo temporizador abierto por persona
registroSchema.index(
  { funcionario: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: "en_curso" },
    name: "un_en_curso_por_funcionario",
  }
);

// Mismos nombres de los índices ya creados en Atlas
// (en Atlas quedó con las llaves en orden estado, funcionario; se declara igual)
registroSchema.index({ estado: 1, funcionario: 1 }, { name: "funcionario_estado" });
registroSchema.index({ estado: 1, limiteFinalizar: 1 }, { name: "estado_limiteFinalizar" });
registroSchema.index({ fecha: 1 }, { name: "fecha" });

export default model("Registro", registroSchema);
