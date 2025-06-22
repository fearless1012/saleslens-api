import express, { Router } from "express";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { DomainKnowledge } from "../models/domainKnowledge";
import { Activity } from "../models/activity";
import Joi from "joi";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router: Router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/domain-knowledge");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Check file type
    const filetypes = /pdf|doc|docx|txt|md|ppt|pptx/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, TXT, MD, PPT files are allowed!"));
    }
  },
});

// Validation schemas
const domainKnowledgeSchema = Joi.object({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(500).required(),
  category: Joi.string()
    .valid("product", "technical", "sales", "marketing", "other")
    .required(),
  tags: Joi.array().items(Joi.string()),
});

/**
 * @route   GET api/domain-knowledge
 * @desc    Get all domain knowledge documents
 * @access  Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const domainKnowledge = await DomainKnowledge.find()
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email");

    res.status(200).json({
      status: "success",
      data: domainKnowledge,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   GET api/domain-knowledge/:id
 * @desc    Get domain knowledge document by ID
 * @access  Private
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const domainKnowledge = await DomainKnowledge.findById(
      req.params.id
    ).populate("uploadedBy", "name email");

    if (!domainKnowledge) {
      return res.status(404).json({
        status: "error",
        message: "Document not found",
      });
    }

    // Create activity log for view
    const activity = new Activity({
      action: "view",
      entityType: "domain",
      entityId: domainKnowledge._id,
      description: `Viewed document: ${domainKnowledge.title}`,
      userId: req.user?.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: domainKnowledge,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   POST api/domain-knowledge
 * @desc    Create a new domain knowledge document
 * @access  Private
 */
router.post(
  "/",
  auth,
  upload.single("file"),
  validateRequest(domainKnowledgeSchema),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          status: "error",
          message: "Please upload a file",
        });
      }

      // Create domain knowledge record
      const domainKnowledge = new DomainKnowledge({
        title: req.body.title,
        description: req.body.description,
        fileUrl: `/uploads/domain-knowledge/${file.filename}`,
        fileType: path.extname(file.originalname).toLowerCase().substring(1),
        fileName: file.originalname,
        fileSize: file.size,
        category: req.body.category,
        tags: req.body.tags || [],
        uploadedBy: req.user?.id,
      });

      await domainKnowledge.save();

      // Create activity log
      const activity = new Activity({
        action: "upload",
        entityType: "domain",
        entityId: domainKnowledge._id,
        description: `Uploaded new document: ${domainKnowledge.title}`,
        userId: req.user?.id,
      });
      await activity.save();

      res.status(201).json({
        status: "success",
        data: domainKnowledge,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "error",
        message: "Server error",
      });
    }
  }
);

/**
 * @route   PUT api/domain-knowledge/:id
 * @desc    Update a domain knowledge document
 * @access  Private
 */
router.put(
  "/:id",
  auth,
  validateRequest(domainKnowledgeSchema),
  async (req, res) => {
    try {
      let domainKnowledge = await DomainKnowledge.findById(req.params.id);

      if (!domainKnowledge) {
        return res.status(404).json({
          status: "error",
          message: "Document not found",
        });
      }

      // Check if the user is the uploader or an admin
      if (
        domainKnowledge.uploadedBy.toString() !== req.user?.id.toString() &&
        req.user?.role !== "admin"
      ) {
        return res.status(403).json({
          status: "error",
          message: "Not authorized to update this document",
        });
      }

      domainKnowledge = await DomainKnowledge.findByIdAndUpdate(
        req.params.id,
        {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags || [],
        },
        { new: true }
      );

      // Create activity log
      const activity = new Activity({
        action: "update",
        entityType: "domain",
        entityId: domainKnowledge?._id,
        description: `Updated document: ${domainKnowledge?.title}`,
        userId: req.user?.id,
      });
      await activity.save();

      res.status(200).json({
        status: "success",
        data: domainKnowledge,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: "error",
        message: "Server error",
      });
    }
  }
);

/**
 * @route   DELETE api/domain-knowledge/:id
 * @desc    Delete a domain knowledge document
 * @access  Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const domainKnowledge = await DomainKnowledge.findById(req.params.id);

    if (!domainKnowledge) {
      return res.status(404).json({
        status: "error",
        message: "Document not found",
      });
    }

    // Check if the user is the uploader or an admin
    if (
      domainKnowledge.uploadedBy.toString() !== req.user?.id.toString() &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to delete this document",
      });
    }

    // Delete file from storage
    const filePath = path.join(__dirname, "../..", domainKnowledge.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database
    await DomainKnowledge.findByIdAndDelete(req.params.id);

    // Create activity log
    const activity = new Activity({
      action: "delete",
      entityType: "domain",
      entityId: domainKnowledge._id,
      description: `Deleted document: ${domainKnowledge.title}`,
      userId: req.user?.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   GET api/domain-knowledge/download/:id
 * @desc    Download a domain knowledge document
 * @access  Private
 */
router.get("/download/:id", auth, async (req, res) => {
  try {
    const domainKnowledge = await DomainKnowledge.findById(req.params.id);

    if (!domainKnowledge) {
      return res.status(404).json({
        status: "error",
        message: "Document not found",
      });
    }

    const filePath = path.join(__dirname, "../..", domainKnowledge.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message: "File not found",
      });
    }

    // Create activity log for download
    const activity = new Activity({
      action: "download",
      entityType: "domain",
      entityId: domainKnowledge._id,
      description: `Downloaded document: ${domainKnowledge.title}`,
      userId: req.user?.id,
    });
    await activity.save();

    res.download(filePath, domainKnowledge.fileName);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

export default router;
