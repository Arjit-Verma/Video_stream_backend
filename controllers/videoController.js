import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import Video from "../models/video.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const files = req.files;

    const videoPath = files["video"][0].path;
    const imagePath = files["image"][0].path;

    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!videoPath)
      return res.status(400).json({ error: "No video file uploaded" });
    if (!imagePath)
      return res.status(400).json({ error: "No image file uploaded" });

    const lessonId = Date.now().toString();
    const outputPath = path.join(__dirname, "../uploads/video/slots", lessonId);
    const hlsPath = path.join(outputPath, "index.m3u8");

    fs.mkdirSync(outputPath, { recursive: true });

    const ffmpegCommand = `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 "${hlsPath}"`;

    exec(ffmpegCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return res.status(500).json({ error: "Video processing failed" });
      }

      try {
        const video = new Video({
          title,
          description,
          videoPath: hlsPath,
          imagePath: imagePath, // Corrected here
          lessonId,
        });

        await video.save();

        res.status(201).json({
          message: "Video uploaded and converted to HLS successfully",
          videoUrl: `http://localhost:8000/uploads/video/${lessonId}/index.m3u8`,
          imageUrl: `http://localhost:8000/${imagePath}`,
          video,
        });
      } catch (dbError) {
        console.error("Database error:", dbError.message);
        res.status(500).json({ error: "Failed to save video details" });
      }
    });
  } catch (error) {
    console.error("Error during upload:", error.message);
    res.status(500).json({ error: error.message || "Video upload failed" });
  }
};

export const streamVideo = async (req, res) => {
  try {
    const { id, file } = req.params; // id: 1733431337399, file: index.m3u8 or segment.ts
    const hlsFolderPath = path.join(__dirname, "../uploads/video/slots/", id);
    const filePath = path.join(hlsFolderPath, file);

    // Validate file existence
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }

    // Serve .m3u8 playlists
    if (file.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.sendFile(filePath);
    }

    // Serve .ts segments with Range support
    if (file.endsWith(".ts")) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return res
            .status(416)
            .send(
              `Requested range not satisfiable\n${start}-${end}/${fileSize}`
            );
        }

        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/MP2T",
        });

        stream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": "video/MP2T",
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      res.status(400).json({ error: "Unsupported file type" });
    }
  } catch (error) {
    console.error("Error during video streaming:", error.message);
    res.status(500).json({ error: "Error streaming video" });
  }
};
