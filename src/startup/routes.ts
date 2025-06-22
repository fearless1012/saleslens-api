import express, { Express } from "express";
import authRoutes from "../routes/auth";
import userRoutes from "../routes/users";
import courseRoutes from "../routes/courses";
import moduleRoutes from "../routes/modules";
import lessonRoutes from "../routes/lessons";
import progressRoutes from "../routes/progress";
import simulationsRoutes from "../routes/simulations";
import domainKnowledgeRoutes from "../routes/domainKnowledge";
import customerRoutes from "../routes/customers";
import pitchRoutes from "../routes/pitches";
import uploadRoutes from "../routes/upload";
import llamaRoutes from "../routes/llama";
import trainingModulesRoutes from "../routes/trainingModules";
import transcriptsRoutes from "../routes/transcripts";

export const setupRoutes = (app: Express): void => {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/modules", moduleRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/simulations", simulationsRoutes);
  app.use("/api/domain-knowledge", domainKnowledgeRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/pitches", pitchRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/llama", llamaRoutes);
  app.use("/api/training-modules", trainingModulesRoutes);
  app.use("/api/transcripts", transcriptsRoutes);

  // Error handling middleware
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error(err.stack);
      res.status(500).send({
        status: "error",
        message: "Something went wrong!",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  );
};
