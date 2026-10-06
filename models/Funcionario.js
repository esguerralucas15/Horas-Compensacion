// Personas que pueden entrar a la aplicación y su plan de compensación.
// El _id es la cédula (texto): así el login es una búsqueda directa.
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const FECHA = /^\d{4}-\d{2}-\d{2}$/; // AAAA-MM-DD
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM (24 h)

// Un sábado asignado a la persona. Este sí limita: solo puede compensar
// los sábados que aparecen aquí, en este horario.
const sabadoSchema = new Schema(
  {
    fecha: { type: String, required: true, match: FECHA },
    horaInicio: { type: String, required: true, match: HORA },
    horaFin: { type: String, required: true, match: HORA },
    horas: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const funcionarioSchema = new Schema(
  {
    _id: { type: String, required: true, match: /^\d{5,12}$/ }, // cédula
    nombre: { type: String, required: true, trim: true },
    rol: { type: String, enum: ["funcionario", "admin"], default: "funcionario" },

    // Turno de descanso escogido (1, 2 o 3). Solo informativo para la jefe de área.
    turno: { type: Number, enum: [1, 2, 3], default: null },

    jornadaDiaria: { type: Number, default: 8.5, min: 0 },
    horasRequeridas: { type: Number, default: 34, min: 0 },

    horaAdicional: {
      habilitada: { type: Boolean, default: true },
      // Días que acordó con su jefe. Solo informativo: no limita el registro.
      diasPlaneados: { type: [{ type: String, match: FECHA }], default: null },
    },

    sabados: { type: [sabadoSchema], default: [] },
    observaciones: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { collection: "funcionarios", versionKey: false, timestamps: true }
);

// Mismo nombre del índice ya creado en Atlas
funcionarioSchema.index({ rol: 1, turno: 1 }, { name: "rol_turno" });

funcionarioSchema.virtual("cedula").get(function () {
  return this._id;
});

funcionarioSchema.methods.esAdmin = function () {
  return this.rol === "admin";
};

// Sábado asignado para una fecha (AAAA-MM-DD), o undefined
funcionarioSchema.methods.sabadoAsignado = function (fecha) {
  return this.sabados.find((s) => s.fecha === fecha);
};

export default model("Funcionario", funcionarioSchema);
