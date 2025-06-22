import express, { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Course } from "../models/course";
import { Module } from "../models/module";
import { auth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update course
const courseSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10),
  imageUrl: Joi.string().uri().allow("", null),
  level: Joi.string().valid("beginner", "intermediate", "advanced"),
  durationInHours: Joi.number().min(0).required(),
  isPublished: Joi.boolean(),
});

/**
 * @route   GET api/courses
 * @desc    Get all courses
 * @access  Public
 */
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const courses = await Course.find()
      .select(
        "title description imageUrl level durationInHours isPublished createdAt"
      )
      .sort({ createdAt: -1 });

    res.json({ status: "success", courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   GET api/courses/:id
 * @desc    Get course by ID
 * @access  Public
 */
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ status: "error", message: "Course not found" });
    }

    // Get modules for this course
    const modules = await Module.find({ courseId: course._id })
      .select("title description order")
      .sort({ order: 1 });

    res.json({
      status: "success",
      course: {
        ...course.toObject(),
        modules,
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
});

/**
 * @route   POST api/courses
 * @desc    Create a new course
 * @access  Private/Admin
 */
router.post(
  "/",
  [auth, adminOnly, validateRequest(courseSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      imageUrl,
      level,
      durationInHours,
      isPublished,
    } = req.body;

    try {
      const newCourse = new Course({
        title,
        description,
        imageUrl,
        level: level || "beginner",
        durationInHours,
        createdBy: req.user.id,
        isPublished: isPublished !== undefined ? isPublished : false,
        modules: [],
      });

      await newCourse.save();

      res.status(201).json({ status: "success", course: newCourse });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   PUT api/courses/:id
 * @desc    Update a course
 * @access  Private/Admin
 */
router.put(
  "/:id",
  [auth, adminOnly, validateRequest(courseSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      imageUrl,
      level,
      durationInHours,
      isPublished,
    } = req.body;

    try {
      let course = await Course.findById(req.params.id);

      if (!course) {
        return res
          .status(404)
          .json({ status: "error", message: "Course not found" });
      }

      course.title = title;
      course.description = description;
      course.imageUrl = imageUrl;
      course.level = level || course.level;
      course.durationInHours = durationInHours;
      if (isPublished !== undefined) {
        course.isPublished = isPublished;
      }

      await course.save();

      res.json({ status: "success", course });
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
 * @route   DELETE api/courses/:id
 * @desc    Delete a course
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res
          .status(404)
          .json({ status: "error", message: "Course not found" });
      }

      // Use transaction to delete course and associated modules
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Delete the course
        await Course.deleteOne({ _id: req.params.id }, { session });

        // Delete associated modules
        await Module.deleteMany({ courseId: req.params.id }, { session });

        await session.commitTransaction();

        res.json({
          status: "success",
          message: "Course and associated modules deleted",
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
          .json({ status: "error", message: "Invalid course ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

export default router;
