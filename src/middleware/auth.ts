import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/default";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: string };
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res
      .status(401)
      .json({ status: "error", message: "No token, authorization denied" });
  }

  try {
    // Get environment
    const env = process.env.NODE_ENV || "development";
    const envConfig = config[env as keyof typeof config];

    // Verify token
    if (!envConfig.jwtSecret) {
      throw new Error("JWT secret is not defined");
    }

    const decoded = jwt.verify(token, envConfig.jwtSecret) as {
      user: { id: string; role: string };
    };

    // Add user from payload to request
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ status: "error", message: "Token is not valid" });
  }
};
