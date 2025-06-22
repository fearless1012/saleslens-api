import express, { Router } from "express";
import Joi from "joi";
import { User } from "../models/user";
import { auth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

// Validation schema for create/update user
const userSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6),
  role: Joi.string().valid("user", "admin"),
});

/**
 * @route   GET api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
  "/",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const users = await User.find().select("-password");
      res.json({ status: "success", users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   GET api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }
      res.json({ status: "success", user });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid user ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   POST api/users
 * @desc    Create a user (admin only)
 * @access  Private/Admin
 */
router.post(
  "/",
  [auth, adminOnly, validateRequest(userSchema)],
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
      const bcrypt = await import("bcrypt");
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save the user to the database
      await user.save();

      res.status(201).json({
        status: "success",
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
 * @route   PUT api/users/:id
 * @desc    Update a user
 * @access  Private/Admin
 */
router.put(
  "/:id",
  [auth, adminOnly, validateRequest(userSchema)],
  async (req: express.Request, res: express.Response) => {
    const { name, email, password, role } = req.body;

    try {
      let user = await User.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      // Check if email is already in use by another user
      if (email !== user.email) {
        const userWithEmail = await User.findOne({ email });
        if (userWithEmail) {
          return res
            .status(400)
            .json({ status: "error", message: "Email already in use" });
        }
      }

      // Update user fields
      user.name = name;
      user.email = email;
      user.role = role || user.role;

      // Update password if provided
      if (password) {
        const bcrypt = await import("bcrypt");
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      res.json({
        status: "success",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid user ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

/**
 * @route   DELETE api/users/:id
 * @desc    Delete a user
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  [auth, adminOnly],
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      await User.deleteOne({ _id: req.params.id });

      res.json({ status: "success", message: "User deleted" });
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "CastError") {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid user ID" });
      }
      res.status(500).json({ status: "error", message: "Server error" });
    }
  }
);

export default router;
