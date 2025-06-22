import fs from "fs";
import path from "path";

/**
 * Creates the necessary upload directories for file storage if they don't exist
 */
export const createUploadDirectories = (): void => {
  // Create upload directories
  const uploadDirs = [
    "uploads",
    "uploads/knowledge",
    "uploads/customers",
    "uploads/transcripts",
  ];

  uploadDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`Creating directory: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  console.log("Upload directories created successfully");
};
