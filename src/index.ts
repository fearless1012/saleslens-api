import express from "express";
import http from "http";
import session from "express-session";
import cors from "cors";
import { Server } from "socket.io";
import { createClient } from "redis";
import path from "path";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";

import { setupChatHandlers } from "./utils/chatHandlers";
import config from "config";
import { setupRoutes } from "./startup/routes";
import { setupLogging } from "./startup/logging";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/saleslens")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// Initialize Redis client for caching (optional)
let redisClient: any = null;
if (process.env.USE_REDIS === "true") {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  redisClient.on("error", (err: any) =>
    console.error("Redis Client Error:", err)
  );

  // Connect to Redis
  (async () => {
    await redisClient.connect();
    console.log("Connected to Redis");
  })();
}

// Initialize HTTP and WebSocket servers
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// Setup middleware and routes
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

// Setup session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "saleslens_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Set up static file directories for uploads
app.use(
  "/uploads/knowledge",
  express.static(path.join(__dirname, "../uploads/knowledge"))
);
app.use(
  "/uploads/customers",
  express.static(path.join(__dirname, "../uploads/customers"))
);
app.use(
  "/uploads/transcripts",
  express.static(path.join(__dirname, "../uploads/transcripts"))
);
app.use(
  "/uploads/pitches",
  express.static(path.join(__dirname, "../uploads/pitches"))
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", environment: process.env.NODE_ENV });
});

// Setup routes
setupRoutes(app);

// Setup logging
setupLogging();

// Listen for WebSocket connections
io.on("connection", (socket) => {
  console.log(`New WebSocket connection: ${socket.id}`);

  // Setup chat handlers
  setupChatHandlers(socket, io, redisClient);

  // Handle room joining for learning modules
  socket.on("joinRoom", (data) => {
    const { moduleId } = data;
    if (moduleId) {
      socket.join(`module_${moduleId}`);
      console.log(`Socket ${socket.id} joined room: module_${moduleId}`);
    }
  });

  // Handle real-time notifications
  socket.on("notification", (data) => {
    const { type, message, targetUsers } = data;
    if (type && message) {
      if (targetUsers && Array.isArray(targetUsers)) {
        // Send to specific users
        targetUsers.forEach((userId) => {
          io.to(`user_${userId}`).emit("notification", data);
        });
      } else {
        // Broadcast to all connected clients
        socket.broadcast.emit("notification", data);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`WebSocket disconnected: ${socket.id}`);
  });
});

// Make io instance available to route handlers
app.set("io", io);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export { app, server, io, redisClient };
