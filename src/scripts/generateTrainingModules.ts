#!/usr/bin/env node

/**
 * Script to generate training modules from domain knowledge using LLAMA
 * Usage: npm run generate-modules
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import TrainingModuleGeneratorService from "../services/trainingModuleGeneratorService";

// Load environment variables
dotenv.config();

async function generateTrainingModules() {
  try {
    console.log("🚀 Starting Training Module Generation Script");
    console.log("=".repeat(50));

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/saleslens";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Initialize the service
    const generatorService = new TrainingModuleGeneratorService();

    // Generate modules from existing domain knowledge
    console.log("\n📚 Generating modules from existing domain knowledge...");
    const modulesFromDB =
      await generatorService.generateTrainingModulesFromDomainKnowledge();

    // Generate modules from synthetic data
    console.log("\n🔄 Generating modules from synthetic data...");
    const modulesFromSynthetic =
      await generatorService.generateFromSyntheticData();

    // Combine all modules
    const allModules = [...modulesFromDB, ...modulesFromSynthetic];

    console.log("\n📊 Generation Summary:");
    console.log(`   • Modules from database: ${modulesFromDB.length}`);
    console.log(
      `   • Modules from synthetic data: ${modulesFromSynthetic.length}`
    );
    console.log(`   • Total modules generated: ${allModules.length}`);

    // Optionally save to database (uncomment if needed)
    /*
    if (allModules.length > 0) {
      console.log("\n💾 Saving modules to database...");
      await generatorService.saveTrainingModulesToDatabase(
        allModules,
        "64b1234567890abcdef123456" // Default admin user ID
      );
    }
    */

    console.log("\n🎉 Training module generation completed successfully!");
  } catch (error) {
    console.error("❌ Error in training module generation:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  generateTrainingModules();
}

export default generateTrainingModules;
