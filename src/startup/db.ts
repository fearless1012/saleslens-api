import mongoose from "mongoose";
import config from "../config/default";
import dotenv from "dotenv";
import { createUploadDirectories } from "../utils/directoryUtil";

// Load environment variables
dotenv.config();

// Get environment
const env = process.env.NODE_ENV || "development";
const envConfig = config[env as keyof typeof config];

export const connectToDatabase = async () => {
  try {
    const mongoUri = envConfig.mongoUri;
    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined");
    }
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB...");

    // Create necessary directories for file uploads
    try {
      createUploadDirectories();
      console.log("Upload directories created successfully");
    } catch (error) {
      console.error("Error creating upload directories:", error);
      // Continue even if directory creation fails
    }
  } catch (error) {
    console.error("Could not connect to MongoDB...", error);
    process.exit(1);
  }
};
