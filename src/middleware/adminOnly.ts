import { Request, Response, NextFunction } from "express";

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ status: "error", message: "Access denied. Admin only." });
  }
  next();
};
