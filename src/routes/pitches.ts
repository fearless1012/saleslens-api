import express, { Router } from "express";
import { auth } from "../middleware/auth";
import { Pitch } from "../models/pitch";
import { Customer } from "../models/customer";
import { Activity } from "../models/activity";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router: Router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/pitches");

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
  // Removed file type restrictions to allow any file format
});

/**
 * @route   GET api/pitches
 * @desc    Get all pitches with enhanced data formatting
 * @access  Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      industry,
      salesRep,
      customer,
    } = req.query;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (industry) filter.industry = industry;
    if (salesRep) filter.salesRep = new RegExp(salesRep as string, "i");

    // Handle customer filter
    if (customer) {
      const customers = await Customer.find({
        $or: [
          { name: new RegExp(customer as string, "i") },
          { company: new RegExp(customer as string, "i") },
        ],
      });
      if (customers.length > 0) {
        filter.customer = { $in: customers.map((c: any) => c._id) };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const pitches = await Pitch.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("uploadedBy", "name email")
      .populate("customer", "name company industry");

    const total = await Pitch.countDocuments(filter);

    // Format the response with enhanced data structure
    const formattedPitches = pitches.map((pitch) => {
      const customFields = pitch.customFields || {};

      return {
        id: pitch._id,
        title: pitch.title,
        description: pitch.description,
        date: customFields.date || pitch.createdAt.toISOString().split("T")[0],
        customer:
          customFields.customer ||
          (pitch.customer
            ? `${(pitch.customer as any).name} at ${
                (pitch.customer as any).company
              }`
            : "Unknown Customer"),
        salesRep: pitch.salesRep || "Unknown Sales Rep",
        product: customFields.product || pitch.title,
        callResult: pitch.callResult || pitch.status,
        context: customFields.context || pitch.description,
        transcript: customFields.transcript || pitch.originalData || "",
        industry: pitch.industry,
        category: pitch.category,
        status: pitch.status,
        successRate: pitch.successRate,
        feedbackNotes: pitch.feedbackNotes,
        tags: pitch.tags,
        filename: pitch.fileName,
        fileUrl: pitch.fileUrl,
        createdAt: pitch.createdAt,
        updatedAt: pitch.updatedAt,
      };
    });

    res.status(200).json({
      status: "success",
      data: formattedPitches,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
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
 * @route   GET api/pitches/:id
 * @desc    Get pitch by ID
 * @access  Private
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id)
      .populate("uploadedBy", "name email")
      .populate("customer", "name company industry");

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    // Create activity log for view
    const activity = new Activity({
      action: "view",
      entityType: "pitch",
      entityId: pitch._id,
      description: `Viewed pitch: ${pitch.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: pitch,
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
 * @route   POST api/pitches
 * @desc    Create a new pitch with flexible data formats
 * @access  Private
 */
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a file",
      });
    }

    // Handle flexible data format - extract any additional fields that aren't explicitly defined
    const knownFields = [
      "title",
      "description",
      "customer",
      "industry",
      "successRate",
      "status",
      "category",
      "feedbackNotes",
      "tags",
    ];
    const customFields: any = {};

    // Store any additional fields from req.body as custom fields
    for (const [key, value] of Object.entries(req.body)) {
      if (!knownFields.includes(key)) {
        customFields[key] = value;
      }
    }

    // Create pitch record with fallbacks for missing data
    const pitch = new Pitch({
      title: req.body.title || file.originalname || "Untitled Pitch",
      description: req.body.description || "",
      fileUrl: `/uploads/pitches/${file.filename}`,
      fileType:
        path.extname(file.originalname).toLowerCase().substring(1) || "unknown",
      fileName: file.originalname,
      fileSize: file.size,
      customer: req.body.customer || null,
      industry: req.body.industry || "Unknown",
      successRate: Number(req.body.successRate) || 0,
      status: req.body.status || "draft",
      category: req.body.category || "Other",
      feedbackNotes: req.body.feedbackNotes || "",
      tags: Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags
        ? req.body.tags.split(",").map((tag: string) => tag.trim())
        : [],
      customFields: Object.keys(customFields).length > 0 ? customFields : {},
      originalData: JSON.stringify(req.body), // Store original request data for reference
      uploadedBy: req.user.id,
    });

    await pitch.save();

    // Create activity log
    const activity = new Activity({
      action: "upload",
      entityType: "pitch",
      entityId: pitch._id,
      description: `Uploaded new pitch: ${pitch.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(201).json({
      status: "success",
      data: pitch,
    });
  } catch (error: any) {
    console.error("Pitch upload error:", error);

    // Handle Joi validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        details: error.message,
      });
    }

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   PUT api/pitches/:id
 * @desc    Update a pitch with flexible data formats
 * @access  Private
 */
router.put("/:id", auth, async (req, res) => {
  try {
    let pitch = await Pitch.findById(req.params.id);

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    // Check if the user is the uploader or an admin
    if (
      pitch.uploadedBy.toString() !== req.user.id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to update this pitch",
      });
    }

    pitch = await Pitch.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        customer: req.body.customer || null,
        industry: req.body.industry,
        successRate: req.body.successRate || pitch.successRate,
        status: req.body.status || pitch.status,
        category: req.body.category,
        feedbackNotes: req.body.feedbackNotes || pitch.feedbackNotes,
        tags: req.body.tags || pitch.tags,
      },
      { new: true }
    );

    // Create activity log
    const activity = new Activity({
      action: "update",
      entityType: "pitch",
      entityId: pitch?._id,
      description: `Updated pitch: ${pitch?.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: pitch,
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
 * @route   PUT api/pitches/:id/feedback
 * @desc    Add feedback to a pitch
 * @access  Private
 */
router.put("/:id/feedback", auth, async (req, res) => {
  try {
    const { feedbackNotes, successRate } = req.body;

    if (!feedbackNotes && typeof successRate !== "number") {
      return res.status(400).json({
        status: "error",
        message: "Feedback notes or success rate is required",
      });
    }

    let pitch = await Pitch.findById(req.params.id);

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    const updateData: any = { status: "feedback" };

    if (feedbackNotes) {
      updateData.feedbackNotes = feedbackNotes;
    }

    if (typeof successRate === "number") {
      updateData.successRate = Math.min(100, Math.max(0, successRate)); // Ensure between 0-100

      // Update status based on success rate
      if (successRate >= 70) {
        updateData.status = "successful";
      } else if (successRate <= 30) {
        updateData.status = "unsuccessful";
      }
    }

    pitch = await Pitch.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    // Create activity log
    const activity = new Activity({
      action: "update",
      entityType: "pitch",
      entityId: pitch?._id,
      description: `Added feedback to pitch: ${pitch?.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: pitch,
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
 * @route   DELETE api/pitches/:id
 * @desc    Delete a pitch
 * @access  Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id);

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    // Check if the user is the uploader or an admin
    if (
      pitch.uploadedBy.toString() !== req.user.id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to delete this pitch",
      });
    }

    // Delete file from storage
    const filePath = path.join(__dirname, "../..", pitch.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete pitch from database
    await Pitch.findByIdAndDelete(req.params.id);

    // Create activity log
    const activity = new Activity({
      action: "delete",
      entityType: "pitch",
      entityId: pitch._id,
      description: `Deleted pitch: ${pitch.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      message: "Pitch deleted successfully",
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
 * @route   GET api/pitches/download/:id
 * @desc    Download a pitch document
 * @access  Private
 */
router.get("/download/:id", auth, async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id);

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    const filePath = path.join(__dirname, "../..", pitch.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message: "File not found",
      });
    }

    // Create activity log for download
    const activity = new Activity({
      action: "download",
      entityType: "pitch",
      entityId: pitch._id,
      description: `Downloaded pitch: ${pitch.title}`,
      userId: req.user.id,
    });
    await activity.save();

    res.download(filePath, pitch.fileName);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   GET api/pitches/search/:query
 * @desc    Search pitches
 * @access  Private
 */
router.get("/search/:query", auth, async (req, res) => {
  try {
    const searchQuery = req.params.query;

    const pitches = await Pitch.find(
      { $text: { $search: searchQuery } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate("uploadedBy", "name email")
      .populate("customer", "name company");

    res.status(200).json({
      status: "success",
      data: pitches,
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
 * @route   GET api/pitches/analytics/summary
 * @desc    Get pitch analytics summary
 * @access  Private
 */
router.get("/analytics/summary", auth, async (req, res) => {
  try {
    const totalPitches = await Pitch.countDocuments();
    const successfulPitches = await Pitch.countDocuments({
      status: "Successful",
    });
    const failedPitches = await Pitch.countDocuments({ status: "Failed" });
    const pendingPitches = await Pitch.countDocuments({ status: "Pending" });

    // Success rate by industry
    const industryStats = await Pitch.aggregate([
      {
        $group: {
          _id: "$industry",
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ["$status", "Successful"] }, 1, 0] },
          },
          avgSuccessRate: { $avg: "$successRate" },
        },
      },
      {
        $project: {
          industry: "$_id",
          total: 1,
          successful: 1,
          successRate: {
            $round: [
              { $multiply: [{ $divide: ["$successful", "$total"] }, 100] },
              1,
            ],
          },
          avgSuccessRate: { $round: ["$avgSuccessRate", 1] },
        },
      },
    ]);

    // Success rate by sales rep
    const salesRepStats = await Pitch.aggregate([
      {
        $group: {
          _id: "$salesRep",
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ["$status", "Successful"] }, 1, 0] },
          },
          avgSuccessRate: { $avg: "$successRate" },
        },
      },
      {
        $project: {
          salesRep: "$_id",
          total: 1,
          successful: 1,
          successRate: {
            $round: [
              { $multiply: [{ $divide: ["$successful", "$total"] }, 100] },
              1,
            ],
          },
          avgSuccessRate: { $round: ["$avgSuccessRate", 1] },
        },
      },
      { $sort: { successRate: -1 } },
    ]);

    // Monthly pitch trends
    const monthlyTrends = await Pitch.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ["$status", "Successful"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: "$_id.month" },
            ],
          },
          total: 1,
          successful: 1,
          successRate: {
            $round: [
              { $multiply: [{ $divide: ["$successful", "$total"] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const overallSuccessRate =
      totalPitches > 0
        ? Math.round((successfulPitches / totalPitches) * 100)
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        summary: {
          totalPitches,
          successfulPitches,
          failedPitches,
          pendingPitches,
          overallSuccessRate,
        },
        industryStats,
        salesRepStats,
        monthlyTrends,
      },
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
 * @route   GET api/pitches/transcript/:id
 * @desc    Get formatted transcript for a pitch
 * @access  Private
 */
router.get("/transcript/:id", auth, async (req, res) => {
  try {
    const pitch = await Pitch.findById(req.params.id).populate(
      "customer",
      "name company industry"
    );

    if (!pitch) {
      return res.status(404).json({
        status: "error",
        message: "Pitch not found",
      });
    }

    const customFields = pitch.customFields || {};
    const transcript = customFields.transcript || pitch.originalData || "";

    // Parse transcript into structured format
    const lines = transcript.split("\n").filter((line: string) => line.trim());
    const parsedTranscript = lines.map((line: string, index: number) => {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(":") && !trimmedLine.startsWith(" ")) {
        const [speaker, ...rest] = trimmedLine.split(":");
        return {
          id: index,
          speaker: speaker.trim(),
          message: rest.join(":").trim(),
          timestamp: null, // Could be enhanced with actual timestamps
        };
      }
      return {
        id: index,
        speaker: null,
        message: trimmedLine,
        timestamp: null,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        pitchId: pitch._id,
        title: pitch.title,
        customer:
          customFields.customer ||
          (pitch.customer
            ? `${(pitch.customer as any).name} at ${
                (pitch.customer as any).company
              }`
            : "Unknown Customer"),
        date: customFields.date || pitch.createdAt.toISOString().split("T")[0],
        salesRep: pitch.salesRep,
        product: customFields.product || pitch.title,
        callResult: pitch.callResult || pitch.status,
        transcript: parsedTranscript,
        rawTranscript: transcript,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

export default router;
