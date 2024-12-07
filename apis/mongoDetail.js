import Video from "../models/video.js";

export const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find(); // Fetch all video documents
    res.status(200).json(videos); // Send data in JSON format
  } catch (error) {
    console.error("Error fetching videos:", error.message);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};
