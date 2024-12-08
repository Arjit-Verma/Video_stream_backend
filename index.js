import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import videoRoutes from "./routes/videoRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (videos, HLS files, etc.)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads/video/slots"))
);
// Route to serve the index.html file
app.get("/watchIt", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/videos", videoRoutes);

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Start the server
app.listen(4000, "0.0.0.0", () => {
  console.log("Server running on port 4000");
});
