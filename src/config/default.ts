import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/saleslens",
    jwtSecret: process.env.JWT_SECRET || "saleslens_jwt_secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    requiresAuth: true,
    llamaApiKey: process.env.LLAMA_API_KEY || "",
    llamaBaseUrl:
      process.env.LLAMA_BASE_URL ||
      "https://api.llama-api.com/chat/completions",
  },
  test: {
    mongoUri: "mongodb://localhost:27017/saleslens_test",
    jwtSecret: "saleslens_test_jwt_secret",
    jwtExpiresIn: "7d",
    requiresAuth: true,
    llamaApiKey: process.env.LLAMA_API_KEY || "",
    llamaBaseUrl:
      process.env.LLAMA_BASE_URL ||
      "https://api.llama-api.com/chat/completions",
  },
  production: {
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    requiresAuth: true,
    llamaApiKey: process.env.LLAMA_API_KEY || "",
    llamaBaseUrl:
      process.env.LLAMA_BASE_URL ||
      "https://api.llama-api.com/chat/completions",
  },
};
