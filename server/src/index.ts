import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import metricsRouter from "./routes/metrics";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/metrics", metricsRouter);

app.listen(PORT, () => {
  console.log(`DevTrack API running on port ${PORT}`);
});
