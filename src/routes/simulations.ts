import express, { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Simulation } from "../models/simulation";
import { SimulationAttempt } from "../models/simulationAttempt";
import { auth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update simulation
const simulationSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10),
  scenario: Joi.string().required().min(20),
  difficulty: Joi.string().valid("beginner", "intermediate", "advanced"),
  clientProfile: Joi.object({
    name: Joi.string().required(),
    company: Joi.string().required(),
    industry: Joi.string().required(),
    role: Joi.string().required(),
    needs: Joi.array().items(Joi.string()),
    challenges: Joi.array().items(Joi.string()),
  }).required(),
  llamaModel: Joi.string().required(),
  featuresHighlight: Joi.array().items(Joi.string()),
  isPublished: Joi.boolean(),
});

// Validation schema for recording an attempt
const attemptSchema = Joi.object({
  transcript: Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string()
            .valid("client", "salesperson", "system")
            .required(),
          content: Joi.string().required(),
        })
      )
      .required(),
  }).required(),
  score: Joi.number().min(0).max(100),
  feedback: Joi.string(),
  completed: Joi.boolean(),
});

/**
 * @route   GET api/simulations
 * @desc    Get all simulations
 * @access  Public
 */
router.get("/", async (req: express.Request, res: express.Response) => {
  try {
    const simulations = await Simulation.find()
      .select("title description difficulty llamaModel isPublished createdAt")
      .sort({ createdAt: -1 });

    res.json({ status: "success", simulations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   GET api/simulations/:id
 * @desc    Get simulation by ID
 * @access  Public
 */
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res
        .status(404)
        .json({ status: "error", message: "Simulation not found" });
    }

    res.json({ status: "success", simulation });
  } catch (err) {
    console.error(err);
    if ((err as Error).name === "CastError") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid simulation ID" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @route   POST api/simulations
 * @desc    Create a new simulation
 * @access  Private/Admin
 */
router.post(
  "/",
  [auth, adminOnly, validateRequest(simulationSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      scenario,
      difficulty,
      clientProfile,
      llamaModel,
      featuresHighlight,
      isPublished,
    } = req.body;

    try {
      const newSimulation = new Simulation({
        title,
        description,
        scenario,
        difficulty: difficulty || "intermediate",
        clientProfile,
        llamaModel,
        featuresHighlight: featuresHighlight || [],
        createdBy: req.user.id,
        isPublished: isPublished !== undefined ? isPublished : false,
      });

      await newSimulation.save();

      res.status(201).json({ status: "success", simulation: newSimulation });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   PUT api/simulations/:id
 * @desc    Update a simulation
 * @access  Private/Admin
 */
router.put(
  "/:id",
  [auth, adminOnly, validateRequest(simulationSchema)],
  async (req: express.Request, res: express.Response) => {
    const {
      title,
      description,
      scenario,
      difficulty,
      clientProfile,
      llamaModel,
      featuresHighlight,
      isPublished,
    } = req.body;

    try {
      let simulation = await Simulation.findById(req.params.id);

      if (!simulation) {
        return res
          .status(404)
          .json({ status: "error", message: "Simulation not found" });
      }

      simulation.title = title;
      simulation.description = description;
      simulation.scenario = scenario;
      simulation.difficulty = difficulty || simulation.difficulty;
      simulation.clientProfile = clientProfile;
      simulation.llamaModel = llamaModel;
      simulation.featuresHighlight =
        featuresHighlight || simulation.featuresHighlight;
      if (isPublished !== undefined) {
        simulation.isPublished = isPublished;
      }

      await simulation.save();

      res.json({ status: "success", simulation });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid simulation ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   DELETE api/simulations/:id
 * @desc    Delete a simulation
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const simulation = await Simulation.findById(req.params.id);

      if (!simulation) {
        return res
          .status(404)
          .json({ status: "error", message: "Simulation not found" });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Delete the simulation
        await Simulation.deleteOne({ _id: req.params.id }, { session });

        // Delete associated attempts
        await SimulationAttempt.deleteMany(
          { simulationId: req.params.id },
          { session }
        );

        await session.commitTransaction();

        res.json({
          status: "success",
          message: "Simulation and associated attempts deleted",
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
          .json({ status: "error", message: "Invalid simulation ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   GET api/simulations/:id/attempts
 * @desc    Get all attempts for a simulation by authenticated user
 * @access  Private
 */
router.get(
  "/:id/attempts",
  auth,
  async (req: express.Request, res: express.Response) => {
    try {
      const simulationId = req.params.id;

      // Verify simulation exists
      const simulation = await Simulation.findById(simulationId);
      if (!simulation) {
        return res
          .status(404)
          .json({ status: "error", message: "Simulation not found" });
      }

      // Get attempts by current user
      const attempts = await SimulationAttempt.find({
        simulationId,
        userId: req.user.id,
      }).sort({ createdAt: -1 });

      res.json({ status: "success", attempts });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid simulation ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   POST api/simulations/:id/attempts
 * @desc    Record a simulation attempt
 * @access  Private
 */
router.post(
  "/:id/attempts",
  [auth, validateRequest(attemptSchema)],
  async (req: express.Request, res: express.Response) => {
    const { transcript, score, feedback, completed } = req.body;
    const simulationId = req.params.id;

    try {
      // Verify simulation exists
      const simulation = await Simulation.findById(simulationId);
      if (!simulation) {
        return res
          .status(404)
          .json({ status: "error", message: "Simulation not found" });
      }

      const newAttempt = new SimulationAttempt({
        userId: req.user.id,
        simulationId,
        transcript,
        score,
        feedback: feedback || "",
        completedAt: completed ? new Date() : undefined,
      });

      await newAttempt.save();

      res.status(201).json({ status: "success", attempt: newAttempt });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid simulation ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

export default router;
