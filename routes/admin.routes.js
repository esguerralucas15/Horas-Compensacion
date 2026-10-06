import { Router } from "express";
import * as admin from "../controllers/adminController.js";
import { requiereSesion, soloAdmin } from "../middlewares/auth.js";

const router = Router();
router.use(requiereSesion, soloAdmin);

router.get("/", (req, res) => res.redirect("/admin/dashboard"));
router.get("/dashboard", admin.dashboard);
router.get("/registros", admin.registros);
router.get("/reporte", admin.reporte);
router.get("/funcionarios/:cedula", admin.detalleFuncionario);

export default router;
