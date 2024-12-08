import express from "express";
import multer from "multer";
import { uploadVideo, streamVideo } from "../controllers/videoController.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getAllVideos } from "../apis/mongoDetail.js";
import Video from "../models/video.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videoDir = path.join(__dirname, "../uploads/videos");
const imageDir = path.join(__dirname, "../uploads/images");

// Ensure directories exist
[videoDir, imageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, videoDir);
    } else if (file.fieldname === "image") {
      cb(null, imageDir);
    } else {
      cb(new Error("Invalid field name"), false);
    }
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage }).fields([
  { name: "video", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

const router = express.Router();

router.get("/allvideo", getAllVideos);
router.post("/upload", upload, uploadVideo);
router.get("/stream/:id/:file", streamVideo);
router.get("/list", async (req, res) => {
  try {
    // Retrieve all videos from the database
    const videos = await Video.find({}, "title videoId");
    res.json({ videos, message: "fuck you" }); // Send as JSON response
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch video list" });
  }
});

export default router;
