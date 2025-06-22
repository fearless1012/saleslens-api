import express, { Router } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import Joi from "joi";
import { User } from "../models/user";
import config from "../config/default";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "admin").default("user"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * @route   POST api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  validateRequest(registerSchema),
  async (req: express.Request, res: express.Response) => {
    const { name, email, password, role } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ status: "error", message: "User already exists" });
      }

      // Create a new user
      user = new User({
        name,
        email,
        password,
        role,
      });

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save the user to the database
      await user.save();

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      const env = process.env.NODE_ENV || "development";
      const envConfig = config[env as keyof typeof config];
      const jwtSecret = envConfig.jwtSecret || "fallback-secret-key";

      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: (envConfig.jwtExpiresIn || "7d") as any,
      });

      res.status(201).json({
        status: "success",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  "/login",
  validateRequest(loginSchema),
  async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid credentials" });
      }

      // Create and return JWT token
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      const env = process.env.NODE_ENV || "development";
      const envConfig = config[env as keyof typeof config];
      const jwtSecret = envConfig.jwtSecret || "fallback-secret-key";

      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: (envConfig.jwtExpiresIn || "7d") as any,
      });

      res.json({
        status: "success",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   GET api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", auth, async (req: express.Request, res: express.Response) => {
  try {
    // Get user by ID excluding password
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    res.json({ status: "success", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

export default router;
