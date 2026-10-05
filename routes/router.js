import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usuarioRoutes from "./usuario.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/", authRoutes);
router.use("/usuario", usuarioRoutes);
router.use("/admin", adminRoutes);

export default router;
