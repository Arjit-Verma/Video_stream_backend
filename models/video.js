import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoPath: { type: String, required: true },
  imagePath: { type: String, required: true },
  createAt: { type: String, default: Date.now },
});

const Video = mongoose.model("Video", videoSchema);

export default Video;
