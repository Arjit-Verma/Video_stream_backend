import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoPath: { type: String, required: true },
  imagePath: { type: String, required: true },
  createAt: { type: Date, default: Date.now },
  videoId: { type: String, required: true },
  imageId: { type: String, required: true },
});

// Use existing model if it exists, otherwise create a new one
const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);

export default Video;
