// Capa de datos de la compensación: une las reglas (reglas.js) con MongoDB.
// Los controladores deberían usar solo estas funciones.
import Registro from "../models/Registro.js";
import Funcionario from "../models/Funcionario.js";
import Configuracion from "../models/Configuracion.js";
import { ahora as reloj } from "./tiempo.js";
import { evaluarHora, evaluarSabado, evaluarFinalizar, opcionesDelDia, resumen } from "./reglas.js";

// Marca como sin_finalizar los registros en curso cuyo plazo ya pasó.
// Se llama antes de mostrar un dashboard o de iniciar/finalizar.
export async function vencerRegistros(instante = reloj()) {
  const r = await Registro.updateMany(
    { estado: "en_curso", limiteFinalizar: { $lt: instante } },
    { $set: { estado: "sin_finalizar" } }
  );
  return r.modifiedCount;
}

// Configuración, funcionario y registros de una cédula, ya con los vencidos marcados
export async function contextoFuncionario(cedula, instante = reloj()) {
  await vencerRegistros(instante);
  const [config, funcionario, registros] = await Promise.all([
    Configuracion.actual(),
    Funcionario.findById(cedula).lean(),
    Registro.find({ funcionario: cedula }).sort({ inicio: -1 }).lean(),
  ]);
  return { config, funcionario, registros, ahora: instante };
}

// Datos para el dashboard del funcionario
export async function panelFuncionario(cedula, instante = reloj()) {
  const ctx = await contextoFuncionario(cedula, instante);
  if (!ctx.funcionario) return null;
  return {
    ...ctx,
    resumen: resumen(ctx.funcionario, ctx.registros, instante),
    opciones: opcionesDelDia(ctx),
  };
}

// Crea el registro en_curso si las reglas lo permiten.
// tipo: "hora" | "sabado"
export async function iniciarCompensacion(cedula, tipo, instante = reloj()) {
  const ctx = await contextoFuncionario(cedula, instante);
  const evaluacion = tipo === "sabado" ? evaluarSabado(ctx) : evaluarHora(ctx);
  if (!evaluacion.permitido) return { ok: false, ...evaluacion };

  try {
    const registro = await Registro.create({
      funcionario: cedula,
      ...evaluacion.programacion,
      estado: "en_curso",
      inicio: instante,
    });
    return { ok: true, registro: registro.toObject() };
  } catch (err) {
    // Doble clic o dos pestañas: lo frenan los índices únicos de registros
    if (err?.code === 11000) {
      return { ok: false, codigo: "DUPLICADO", motivo: "Ya tienes una compensación registrada o en curso." };
    }
    throw err;
  }
}

// Pasa el registro en curso a finalizado si está dentro de la ventana.
// La condición de tiempo va en la misma consulta para que no se pueda saltar.
export async function finalizarCompensacion(cedula, instante = reloj()) {
  await vencerRegistros(instante);
  const registro = await Registro.findOneAndUpdate(
    {
      funcionario: cedula,
      estado: "en_curso",
      finProgramado: { $lte: instante },
      limiteFinalizar: { $gte: instante },
    },
    { $set: { estado: "finalizado", fin: instante } },
    { new: true }
  ).lean();
  if (registro) return { ok: true, registro };

  const ultimo = await Registro.findOne({ funcionario: cedula }).sort({ inicio: -1 }).lean();
  return { ok: false, ...evaluarFinalizar({ registro: ultimo, ahora: instante }) };
}

// Avance de todas las personas (panel de la administradora y reporte PDF).
// Parte de funcionarios para que también aparezca quien lleva 0 horas.
export async function avanceEquipo({ turno } = {}, instante = reloj()) {
  await vencerRegistros(instante);
  const filtro = { rol: "funcionario", activo: true };
  if (turno !== undefined) filtro.turno = turno; // null = sin turno escogido
  return Funcionario.aggregate([
    { $match: filtro },
    { $lookup: { from: "registros", localField: "_id", foreignField: "funcionario", as: "r" } },
    {
      $addFields: {
        finalizados: { $filter: { input: "$r", cond: { $eq: ["$$this.estado", "finalizado"] } } },
        sinFinalizar: {
          $size: { $filter: { input: "$r", cond: { $eq: ["$$this.estado", "sin_finalizar"] } } },
        },
        enCurso: { $gt: [{ $size: { $filter: { input: "$r", cond: { $eq: ["$$this.estado", "en_curso"] } } } }, 0] },
      },
    },
    { $addFields: { compensadas: { $min: [{ $sum: "$finalizados.horas" }, "$horasRequeridas"] } } },
    {
      $addFields: {
        restantes: { $subtract: ["$horasRequeridas", "$compensadas"] },
        porcentaje: {
          $round: [{ $multiply: [{ $divide: ["$compensadas", "$horasRequeridas"] }, 100] }, 0],
        },
      },
    },
    { $project: { r: 0, finalizados: 0 } },
    { $sort: { nombre: 1 } },
  ]);
}

// Historial de una persona (más reciente primero)
export async function historialFuncionario(cedula, instante = reloj()) {
  await vencerRegistros(instante);
  return Registro.find({ funcionario: cedula }).sort({ inicio: -1 }).lean();
}
