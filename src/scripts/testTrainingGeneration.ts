#!/usr/bin/env node

/**
 * Simple test script to verify LLAMA integration and training module generation
 * This script can be run independently to test the functionality
 */

import TrainingModuleGeneratorService from "../services/trainingModuleGeneratorService";

async function testTrainingModuleGeneration() {
  console.log("🧪 Testing Training Module Generation (Standalone)");
  console.log("=".repeat(60));

  try {
    const generatorService = new TrainingModuleGeneratorService();

    // Test synthetic data generation (doesn't require DB)
    console.log("\n🔄 Testing synthetic data module generation...");
    const modules = await generatorService.generateFromSyntheticData();

    if (modules.length > 0) {
      console.log(
        `✅ Successfully generated ${modules.length} module(s) from synthetic data!`
      );
    } else {
      console.log("⚠️  No modules generated from synthetic data");
    }

    console.log("\n🎉 Test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);

    // Check if it's a LLAMA API issue
    if (error instanceof Error && error.message.includes("LLAMA_API_KEY")) {
      console.log(
        "\n💡 Tip: Make sure to set your LLAMA_API_KEY in the environment variables"
      );
      console.log("   Example: export LLAMA_API_KEY=your_api_key_here");
    }
  }
}

// Run the test
if (require.main === module) {
  testTrainingModuleGeneration().finally(() => {
    console.log("\n👋 Test script finished");
    process.exit(0);
  });
}

export default testTrainingModuleGeneration;
