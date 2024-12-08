import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import videoRoutes from "./routes/videoRoutes.js";
const app = express();

connectDB();
app.use(express.static(path.join(__dirname, "public")));

//using cors middleware for security and adding headers and other stuff
app.get("/watchIt", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.use(cors());
app.use(express.json());
app.use("/api/videos", videoRoutes);
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.listen(4000, "0.0.0.0", () => {
  console.log("Sunn rha hu Port :4000");
});
