import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user";
import config from "../config/default";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: string };
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header("x-auth-token");

    // Check if no token
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No token provided, authorization denied",
      });
    }

    // Get environment config
    const env = process.env.NODE_ENV || "development";
    const envConfig = config[env as keyof typeof config];

    // Verify token
    if (!envConfig.jwtSecret) {
      throw new Error("JWT secret is not defined");
    }

    const decoded = jwt.verify(token, envConfig.jwtSecret) as {
      user: { id: string; role: string };
    };

    // Check if user still exists
    const user = await User.findById(decoded.user.id).select("-password");
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User no longer exists",
      });
    }

    // Add user from payload to request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({
      status: "error",
      message: "Token is not valid",
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Optional auth middleware (doesn't require authentication)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("x-auth-token");

    if (token) {
      const env = process.env.NODE_ENV || "development";
      const envConfig = config[env as keyof typeof config];

      if (envConfig.jwtSecret) {
        const decoded = jwt.verify(token, envConfig.jwtSecret) as {
          user: { id: string; role: string };
        };

        const user = await User.findById(decoded.user.id).select("-password");
        if (user) {
          req.user = decoded.user;
        }
      }
    }

    next();
  } catch (err) {
    // Continue without authentication if token is invalid
    next();
  }
};
