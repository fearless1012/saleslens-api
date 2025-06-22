import express, { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Progress } from "../models/progress";
import { Lesson } from "../models/lesson";
import { Module } from "../models/module";
import { Course } from "../models/course";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update progress
const progressSchema = Joi.object({
  lessonId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }),
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
  status: Joi.string()
    .valid("not_started", "in_progress", "completed")
    .required(),
  score: Joi.number().min(0).max(100).allow(null),
});

/**
 * @route   GET api/progress
 * @desc    Get user's progress
 * @access  Private
 */
router.get("/", auth, async (req: express.Request, res: express.Response) => {
  try {
    const { courseId } = req.query;

    let query: any = { userId: req.user.id };

    if (courseId && typeof courseId === "string") {
      query.courseId = mongoose.Types.ObjectId.createFromHexString(courseId);
    }

    const progress = await Progress.find(query)
      .populate("lessonId", "title description type")
      .populate("moduleId", "title order")
      .populate("courseId", "title")
      .sort({ updatedAt: -1 });

    res.json({ status: "success", progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   GET api/progress/course/:courseId
 * @desc    Get user's progress summary for a course
 * @access  Private
 */
router.get(
  "/course/:courseId",
  auth,
  async (req: express.Request, res: express.Response) => {
    try {
      const courseId = req.params.courseId;

      // Check if the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ status: "error", message: "Course not found" });
      }

      // Get modules in this course
      const modules = await Module.find({ courseId })
        .sort({ order: 1 })
        .select("_id title order");

      // Get lessons in this course
      const lessons = await Lesson.find({ courseId })
        .sort({ order: 1 })
        .select("_id title moduleId order type duration");

      // Get user's progress for this course
      const progressRecords = await Progress.find({
        userId: req.user.id,
        courseId,
      });

      // Calculate course completion stats
      const totalLessons = lessons.length;
      const completedLessons = progressRecords.filter(
        (p) => p.status === "completed"
      ).length;
      const inProgressLessons = progressRecords.filter(
        (p) => p.status === "in_progress"
      ).length;

      // Calculate completion percentage
      const completionPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // Organize modules with their lessons and progress
      const moduleProgress = modules.map((module) => {
        const moduleLessons = lessons.filter(
          (lesson) => lesson.moduleId.toString() === module._id.toString()
        );

        const moduleCompletedLessons = progressRecords.filter(
          (p) =>
            p.status === "completed" &&
            moduleLessons.some(
              (l) => l._id.toString() === p.lessonId.toString()
            )
        ).length;

        const moduleCompletionPercentage =
          moduleLessons.length > 0
            ? Math.round((moduleCompletedLessons / moduleLessons.length) * 100)
            : 0;

        return {
          moduleId: module._id,
          title: module.title,
          order: module.order,
          totalLessons: moduleLessons.length,
          completedLessons: moduleCompletedLessons,
          completionPercentage: moduleCompletionPercentage,
          lessons: moduleLessons.map((lesson) => {
            const lessonProgress = progressRecords.find(
              (p) => p.lessonId.toString() === lesson._id.toString()
            );

            return {
              lessonId: lesson._id,
              title: lesson.title,
              order: lesson.order,
              type: lesson.type,
              duration: lesson.duration,
              status: lessonProgress?.status || "not_started",
              completedAt: lessonProgress?.completedAt,
              score: lessonProgress?.score,
            };
          }),
        };
      });

      res.json({
        status: "success",
        courseProgress: {
          courseId,
          title: course.title,
          totalLessons,
          completedLessons,
          inProgressLessons,
          completionPercentage,
          modules: moduleProgress,
        },
      });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid course ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   POST api/progress
 * @desc    Update progress for a lesson
 * @access  Private
 */
router.post(
  "/",
  [auth, validateRequest(progressSchema)],
  async (req: express.Request, res: express.Response) => {
    const { lessonId, moduleId, courseId, status, score } = req.body;

    try {
      // Verify lesson exists
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }

      // Check if progress already exists for this user and lesson
      let progress = await Progress.findOne({
        userId: req.user.id,
        lessonId,
      });

      if (progress) {
        // Update existing progress
        progress.status = status;
        if (score !== undefined) {
          progress.score = score;
        }
        if (status === "completed" && progress.status !== "completed") {
          progress.completedAt = new Date();
        }
      } else {
        // Create new progress
        progress = new Progress({
          userId: req.user.id,
          lessonId,
          moduleId,
          courseId,
          status,
          score: score || undefined,
          completedAt: status === "completed" ? new Date() : undefined,
        });
      }

      await progress.save();

      res.json({ status: "success", progress });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res.status(400).json({ status: "error", message: "Invalid ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

export default router;
