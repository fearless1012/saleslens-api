import express, { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Course } from "../models/course";
import { Module } from "../models/module";
import { Lesson } from "../models/lesson";
import { auth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update module
const moduleSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10),
  courseId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }),
  order: Joi.number().min(1).required(),
  isPublished: Joi.boolean(),
});

/**
 * @route   GET api/modules
 * @desc    Get all modules (optionally filtered by courseId)
 * @access  Public
 */
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const { courseId } = req.query;

    let query = {};
    if (courseId && typeof courseId === "string") {
      query = {
        courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
      };
    }

    const modules = await Module.find(query)
      .select("title description courseId order isPublished createdAt")
      .sort({ order: 1 });

    res.json({ status: "success", modules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   GET api/modules/:id
 * @desc    Get module by ID
 * @access  Public
 */
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const module = await Module.findById(req.params.id);

    if (!module) {
      return res
        .status(404)
        .json({ status: "error", message: "Module not found" });
    }

    // Get lessons for this module
    const lessons = await Lesson.find({ moduleId: module._id })
      .select("title description type duration order")
      .sort({ order: 1 });

    res.json({
      status: "success",
      module: {
        ...module.toObject(),
        lessons,
      },
    });
  } catch (err) {
    console.error(err);
    if ((err as Error).name === "CastError") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid module ID" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   POST api/modules
 * @desc    Create a new module
 * @access  Private/Admin
 */
router.post(
  "/",
  [auth, adminOnly, validateRequest(moduleSchema)],
  async (req: express.Request, res: express.Response) => {
    const { title, description, courseId, order, isPublished } = req.body;

    try {
      // Verify course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ status: "error", message: "Course not found" });
      }

      // Create new module
      const newModule = new Module({
        title,
        description,
        courseId,
        order,
        createdBy: req.user.id,
        isPublished: isPublished !== undefined ? isPublished : false,
        lessons: [],
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await newModule.save({ session });

        // Update course with new module
        course.modules.push(newModule._id);
        await course.save({ session });

        await session.commitTransaction();

        res.status(201).json({ status: "success", module: newModule });
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
 * @route   PUT api/modules/:id
 * @desc    Update a module
 * @access  Private/Admin
 */
router.put(
  "/:id",
  [auth, adminOnly, validateRequest(moduleSchema)],
  async (req: express.Request, res: express.Response) => {
    const { title, description, courseId, order, isPublished } = req.body;

    try {
      let module = await Module.findById(req.params.id);

      if (!module) {
        return res
          .status(404)
          .json({ status: "error", message: "Module not found" });
      }

      // If courseId is changing, verify old and new courses
      if (courseId && module.courseId.toString() !== courseId) {
        const newCourse = await Course.findById(courseId);
        if (!newCourse) {
          return res
            .status(404)
            .json({ status: "error", message: "Course not found" });
        }

        const oldCourse = await Course.findById(module.courseId);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Remove module from old course
          if (oldCourse) {
            oldCourse.modules = oldCourse.modules.filter(
              (mod) => mod.toString() !== module?._id.toString()
            );
            await oldCourse.save({ session });
          }

          // Add module to new course
          newCourse.modules.push(module._id);
          await newCourse.save({ session });

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      }

      // Update module fields
      module.title = title;
      module.description = description;
      module.courseId = courseId
        ? mongoose.Types.ObjectId.createFromHexString(courseId)
        : module.courseId;
      module.order = order;
      if (isPublished !== undefined) {
        module.isPublished = isPublished;
      }

      await module.save();

      res.json({ status: "success", module });
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
 * @route   DELETE api/modules/:id
 * @desc    Delete a module
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const module = await Module.findById(req.params.id);

      if (!module) {
        return res
          .status(404)
          .json({ status: "error", message: "Module not found" });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Remove module from course
        await Course.updateOne(
          { _id: module.courseId },
          { $pull: { modules: module._id } },
          { session }
        );

        // Delete the module
        await Module.deleteOne({ _id: req.params.id }, { session });

        // Delete associated lessons
        await Lesson.deleteMany({ moduleId: req.params.id }, { session });

        await session.commitTransaction();

        res.json({
          status: "success",
          message: "Module and associated lessons deleted",
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
          .json({ status: "error", message: "Invalid module ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

export default router;
