import express from 'express';
import { join, resolve } from "path";

import appRouter from "./routes/router.js";

const app = express();
const port = 3000;
app.set("view engine", 'ejs');
app.set("views", "views")
app.use(express.static(join("./public")))
	

app.use("/", appRouter);

app.listen(port, () => {
  console.log(`Server running 🚀 at http://localhost:${port}`);
});