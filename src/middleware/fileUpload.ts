import multer from "multer";
import path from "path";
import fs from "fs";

// Create upload directories if they don't exist
const uploadDirs = [
  "uploads/knowledge",
  "uploads/customers",
  "uploads/transcripts",
  "uploads/pitches",
];

uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Define allowed file types
const allowedFileTypes = {
  documents: /pdf|doc|docx|txt|md|rtf|odt/,
  spreadsheets: /csv|xlsx|xls|ods/,
  presentations: /ppt|pptx|odp/,
  audio: /mp3|wav|ogg/,
};

// Set up storage engine factory function
const createStorage = (destination: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), destination);

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Create a safe filename with timestamp
      const fileName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "_");
      const timestamp = Date.now();
      cb(null, `${timestamp}-${fileName}`);
    },
  });
};

// Check file type helper
const checkFileType = (
  file: Express.Multer.File,
  allowedTypes: RegExp,
  cb: multer.FileFilterCallback
) => {
  // Extract extension
  const extname = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  if (allowedTypes.test(extname)) {
    return cb(null, true);
  } else {
    return cb(new Error(`Only ${allowedTypes.source} files are allowed`));
  }
};

// Create specialized upload middlewares
export const uploadKnowledge = multer({
  storage: createStorage("uploads/knowledge"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    checkFileType(file, allowedFileTypes.documents, cb);
  },
});

export const uploadCustomer = multer({
  storage: createStorage("uploads/customers"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow spreadsheets, text files, CSV, and JSON for customers
    const combinedTypes = new RegExp(
      allowedFileTypes.spreadsheets.source + "|txt|csv|json"
    );
    checkFileType(file, combinedTypes, cb);
  },
});

export const uploadTranscript = multer({
  storage: createStorage("uploads/transcripts"),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    // Transcripts can be documents or audio files
    const combinedTypes = new RegExp(
      allowedFileTypes.documents.source + "|" + allowedFileTypes.audio.source
    );
    checkFileType(file, combinedTypes, cb);
  },
});

// Error handling middleware for multer
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size is too large. Please upload a smaller file.",
      });
    }
    return res.status(400).json({
      message: `Multer error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
  next();
};
