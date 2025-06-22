import express, { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Lesson } from "../models/lesson";
import { Module } from "../models/module";
import { Course } from "../models/course";
import { Progress } from "../models/progress";
import { auth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update lesson
const lessonSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10),
  content: Joi.string().required(),
  moduleId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }),
  courseId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }),
  type: Joi.string().valid("text", "video", "quiz", "assignment"),
  videoUrl: Joi.string().uri().allow("", null),
  attachments: Joi.array().items(Joi.string()),
  duration: Joi.number().min(0).required(),
  order: Joi.number().min(1).required(),
  isPublished: Joi.boolean(),
});

/**
 * @route   GET api/lessons
 * @desc    Get all lessons (optionally filtered by moduleId)
 * @access  Public
 */
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const { moduleId } = req.query;

    let query = {};
    if (moduleId && typeof moduleId === "string") {
      query = {
        moduleId: mongoose.Types.ObjectId.createFromHexString(moduleId),
      };
    }

    const lessons = await Lesson.find(query)
      .select("title description type duration order isPublished createdAt")
      .sort({ order: 1 });

    res.json({ status: "success", lessons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   GET api/lessons/:id
 * @desc    Get lesson by ID
 * @access  Public
 */
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res
        .status(404)
        .json({ status: "error", message: "Lesson not found" });
    }

    // Get user progress if authenticated
    let progress = null;
    if (req.headers["x-auth-token"]) {
      try {
        // Get environment
        const env = process.env.NODE_ENV || "development";
        const envConfig = config[env as keyof typeof config];

        // Verify token
        if (!envConfig.jwtSecret) {
          throw new Error("JWT secret is not defined");
        }

        const token = req.headers["x-auth-token"] as string;
        const decoded = jwt.verify(token, envConfig.jwtSecret) as {
          user: { id: string; role: string };
        };

        // Find progress for this user and lesson
        progress = await Progress.findOne({
          userId: decoded.user.id,
          lessonId: lesson._id,
        });
      } catch (error) {
        // If token verification fails, continue without progress data
        console.error("Token verification error:", error);
      }
    }

    res.json({
      status: "success",
      lesson,
      progress,
    });
  } catch (err) {
    console.error(err);
    if ((err as Error).name === "CastError") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid lesson ID" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   POST api/lessons
 * @desc    Create a new lesson
 * @access  Private/Admin
 */
router.post(
  "/",
  [auth, adminOnly, validateRequest(lessonSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      content,
      moduleId,
      courseId,
      type,
      videoUrl,
      attachments,
      duration,
      order,
      isPublished,
    } = req.body;

    try {
      // Verify module exists
      const module = await Module.findById(moduleId);
      if (!module) {
        return res
          .status(404)
          .json({ status: "error", message: "Module not found" });
      }

      // Verify course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ status: "error", message: "Course not found" });
      }

      // Create new lesson
      const newLesson = new Lesson({
        title,
        description,
        content,
        moduleId,
        courseId,
        type: type || "text",
        videoUrl,
        attachments: attachments || [],
        duration,
        order,
        createdBy: req.user.id,
        isPublished: isPublished !== undefined ? isPublished : false,
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await newLesson.save({ session });

        // Update module with new lesson
        module.lessons.push(newLesson._id);
        await module.save({ session });

        await session.commitTransaction();

        res.status(201).json({ status: "success", lesson: newLesson });
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   PUT api/lessons/:id
 * @desc    Update a lesson
 * @access  Private/Admin
 */
router.put(
  "/:id",
  [auth, adminOnly, validateRequest(lessonSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      content,
      moduleId,
      courseId,
      type,
      videoUrl,
      attachments,
      duration,
      order,
      isPublished,
    } = req.body;

    try {
      let lesson = await Lesson.findById(req.params.id);

      if (!lesson) {
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }

      // If moduleId is changing, update module references
      if (moduleId && lesson.moduleId.toString() !== moduleId) {
        const newModule = await Module.findById(moduleId);
        if (!newModule) {
          return res
            .status(404)
            .json({ status: "error", message: "Module not found" });
        }

        const oldModule = await Module.findById(lesson.moduleId);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Remove lesson from old module
          if (oldModule) {
            oldModule.lessons = oldModule.lessons.filter(
              (less) => less.toString() !== lesson?._id.toString()
            );
            await oldModule.save({ session });
          }

          // Add lesson to new module
          newModule.lessons.push(lesson._id);
          await newModule.save({ session });

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      }

      // Update lesson fields
      lesson.title = title;
      lesson.description = description;
      lesson.content = content;
      lesson.moduleId = moduleId
        ? mongoose.Types.ObjectId.createFromHexString(moduleId)
        : lesson.moduleId;
      lesson.courseId = courseId
        ? mongoose.Types.ObjectId.createFromHexString(courseId)
        : lesson.courseId;
      lesson.type = type || lesson.type;
      lesson.videoUrl = videoUrl;
      lesson.attachments = attachments || lesson.attachments;
      lesson.duration = duration;
      lesson.order = order;
      if (isPublished !== undefined) {
        lesson.isPublished = isPublished;
      }

      await lesson.save();

      res.json({ status: "success", lesson });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res.status(400).json({ status: "error", message: "Invalid ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   DELETE api/lessons/:id
 * @desc    Delete a lesson
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const lesson = await Lesson.findById(req.params.id);

      if (!lesson) {
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Remove lesson from module
        await Module.updateOne(
          { _id: lesson.moduleId },
          { $pull: { lessons: lesson._id } },
          { session }
        );

        // Delete the lesson
        await Lesson.deleteOne({ _id: req.params.id }, { session });

        // Delete associated progress
        await Progress.deleteMany({ lessonId: req.params.id }, { session });

        await session.commitTransaction();

        res.json({
          status: "success",
          message: "Lesson and associated progress deleted",
        });
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid lesson ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

// Import missing dependencies
import jwt from "jsonwebtoken";
import config from "../config/default";

export default router;
