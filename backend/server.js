import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import moduleRoute from "./routes/moduleRoute.js";
import examRoute from "./routes/examRoute.js";
import studentRoute from "./routes/studentRoute.js";
import trainerRoute from "./routes/trainerRoute.js";
import questionRoute from "./routes/questionRoute.js";
import answerRoute from "./routes/answerRoute.js";
import studentAdminRoute from "./routes/studentAdminRoute.js";
import trainerAdminRoute from "./routes/trainerAdminRoute.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());
app.use(express.json());




// Routes principales
app.use("/api", moduleRoute);
app.use("/api", examRoute);
app.use("/api", studentRoute);
app.use("/api", trainerRoute);
app.use("/api", questionRoute);
app.use("/api", answerRoute);
app.use("/api", studentAdminRoute);
app.use("/api", trainerAdminRoute);

app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});




































