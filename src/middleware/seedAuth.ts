import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/user";
import bcrypt from "bcrypt";

// Load environment variables
dotenv.config();

// Extend Express Request to include user (same as in auth.ts)
declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: string };
    }
  }
}

// Enhanced auth middleware that can bypass for seeding
export const authWithSeedBypass = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if we're in seeding mode (for development/demo purposes)
  if (
    process.env.ALLOW_SEED_BYPASS === "true" &&
    req.header("x-seed-mode") === "true"
  ) {
    // Create a mock user for seeding
    req.user = { id: "seed-user", role: "admin" };
    return next();
  }

  // Use the normal auth middleware
  const { auth } = require("./auth");
  return auth(req, res, next);
};

// Helper function to create default admin user
export const createDefaultAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@saleslens.com" });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const adminUser = new User({
        name: "Admin User",
        email: "admin@saleslens.com",
        password: hashedPassword,
        role: "admin",
      });

      await adminUser.save();
      console.log("Default admin user created: admin@saleslens.com / admin123");
      return adminUser;
    }

    return existingAdmin;
  } catch (error) {
    console.error("Error creating default admin user:", error);
    throw error;
  }
};
