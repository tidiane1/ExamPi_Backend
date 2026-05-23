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
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ API serveur examen fonctionne avec SQLite");
});


// Routes principales
app.use("/api", moduleRoute);
app.use("/api", examRoute);
app.use("/api", studentRoute);
app.use("/api", trainerRoute);
app.use("/api", questionRoute);
app.use("/api", answerRoute);
app.use("/api", studentAdminRoute);
app.use("/api", trainerAdminRoute);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});




































