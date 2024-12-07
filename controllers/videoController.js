import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import Video from "../models/video.js";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const files = req.files;

    const videoFile = files["video"]?.[0];
    const imageFile = files["image"]?.[0];

    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!videoFile)
      return res.status(400).json({ error: "No video file uploaded" });
    if (!imageFile)
      return res.status(400).json({ error: "No image file uploaded" });

    const videoId = uuidv4();
    const imageId = uuidv4();

    // Directories for video and image
    const videoOutputPath = path.join(
      __dirname,
      "../uploads/video/slots",
      videoId
    );
    const imageOutputPath = path.join(__dirname, "../uploads/images");

    // Create directories
    fs.mkdirSync(videoOutputPath, { recursive: true });
    fs.mkdirSync(imageOutputPath, { recursive: true });

    // Video HLS Conversion
    const hlsPath = path.join(videoOutputPath, "index.m3u8");
    const ffmpegCommand = `ffmpeg -i "${videoFile.path}" \
-codec:v libx264 -preset ultrafast -crf 28 \
-codec:a aac -b:a 64k \
-hls_time 30 -hls_playlist_type vod \
-hls_segment_filename "${videoOutputPath}/segment%03d.ts" \
-threads 2 \
-start_number 0 \
"${hlsPath}"`;

    exec(ffmpegCommand, async (error) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return res.status(500).json({ error: "Video processing failed" });
      }

      try {
        // Rename image with imageId
        const imageExtension = path.extname(imageFile.originalname); // Get original file extension
        const renamedImagePath = path.join(
          imageOutputPath,
          `${imageId}${imageExtension}`
        );
        fs.renameSync(imageFile.path, renamedImagePath);

        // Save to database
        const video = new Video({
          title,
          description,
          videoPath: hlsPath,
          imagePath: renamedImagePath,
          videoId,
          imageId,
        });

        await video.save();

        res.status(201).json({
          message: "Video and image uploaded successfully",
          videoUrl: `http://localhost:8000/uploads/video/slots/${videoId}/index.m3u8`,
          imageUrl: `http://localhost:8000/uploads/image/slots/${imageId}${imageExtension}`,
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
