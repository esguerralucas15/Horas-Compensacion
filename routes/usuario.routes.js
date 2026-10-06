import { Router } from "express";
import * as usuario from "../controllers/usuarioController.js";
import { requiereSesion, soloUsuario } from "../middlewares/auth.js";

const router = Router();
router.use(requiereSesion, soloUsuario);

router.get("/", (req, res) => res.redirect("/usuario/dashboard"));
router.get("/dashboard", usuario.dashboard);
router.get("/sabados", usuario.sabados);
router.get("/compensacion/inicio", usuario.inicio);
router.post("/compensacion/iniciar", usuario.iniciar);
router.get("/compensacion/temporizador", usuario.temporizador);
router.post("/compensacion/finalizar", usuario.finalizar);

export default router;
