#!/usr/bin/env ts-node

/**
 * Demo script for multimedia training module generation with MongoDB integration
 * Tests the complete pipeline including database storage and retrieval
 */

import { MultimediaTrainingModuleService } from "../services/multimediaTrainingModuleService";
import mongoose from "mongoose";

async function runDemoWithMongoDB() {
  console.log(
    "🚀 Starting Multimedia Training Module Demo with MongoDB Integration"
  );
  console.log("=".repeat(80));

  // Connect to MongoDB (using the same connection as the main app)
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/saleslens"
      );
      console.log("✅ Connected to MongoDB");
    }
  } catch (error) {
    console.warn(
      "⚠️ MongoDB connection failed, continuing with file-only demo:",
      error
    );
  }

  const multimediaService = new MultimediaTrainingModuleService();

  // Sample domain knowledge for demonstration
  const sampleDomainKnowledge = `
Meta Ads Training Module - Advanced Targeting Strategies

Overview:
Meta Ads offers sophisticated targeting capabilities that help businesses reach their ideal customers across Facebook, Instagram, and other Meta platforms.

Key Learning Areas:

1. Demographic Targeting
   - Age, gender, location-based targeting
   - Income and education level considerations
   - Life event targeting (recently moved, new relationship, etc.)

2. Interest-Based Targeting
   - Using Facebook's interest categories
   - Leveraging competitor audience insights
   - Custom audience creation from website visitors

3. Behavioral Targeting
   - Purchase behavior patterns
   - Device usage patterns
   - Travel behavior and preferences

4. Lookalike Audiences
   - Creating effective seed audiences
   - Optimizing lookalike percentages
   - Geographic considerations for lookalikes

5. Campaign Optimization
   - A/B testing different targeting combinations
   - Budget allocation strategies
   - Performance monitoring and adjustment

Best Practices:
- Start broad and narrow down based on performance
- Use exclusion audiences to avoid overlap
- Test different creative formats for each audience
- Monitor frequency to avoid ad fatigue
- Leverage Meta's machine learning capabilities

Success Metrics:
- Cost per acquisition (CPA)
- Return on ad spend (ROAS)
- Click-through rates (CTR)
- Conversion rates by audience segment
`;

  try {
    // Demo user ID (in real application, this would come from authentication)
    const demoUserId = "675de23ac8e3a1a1a1a1a1a1"; // Valid ObjectId format

    console.log("\n📚 Sample Domain Knowledge:");
    console.log(sampleDomainKnowledge.substring(0, 200) + "...");

    // Test different generation options
    const testCases = [
      {
        name: "Quick Demo (Text Only)",
        options: {
          includeImages: false,
          includeAudio: false,
          includeVideos: false,
          voicePreset: "v2/en_speaker_6",
          imageStyle: "professional training presentation",
          audioQuality: "fast" as const,
          videoResolution: "720p" as const,
        },
        saveOptions: {
          category: "Meta Ads Training",
          tags: ["demo", "targeting", "advertising"],
          isPublic: false,
        },
      },
      {
        name: "Full Multimedia Demo",
        options: {
          includeImages: true,
          includeAudio: true,
          includeVideos: false, // Keep false for faster demo
          voicePreset: "v2/en_speaker_1",
          imageStyle:
            "modern advertising presentation with charts and graphics",
          audioQuality: "standard" as const,
          videoResolution: "1080p" as const,
        },
        saveOptions: {
          category: "Meta Ads Training",
          tags: ["full-demo", "multimedia", "advanced-targeting"],
          isPublic: true,
        },
      },
    ];

    const generatedModules = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      console.log(`\n${"=".repeat(80)}`);
      console.log(`🧪 Test Case ${i + 1}: ${testCase.name}`);
      console.log(`${"=".repeat(80)}`);

      try {
        const startTime = Date.now();

        const result = await multimediaService.generateMultimediaTrainingModule(
          sampleDomainKnowledge,
          demoUserId,
          testCase.options,
          testCase.saveOptions
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\n✅ ${testCase.name} completed in ${duration}ms`);
        console.log(`📊 Module Details:`);
        console.log(`   Title: ${result.module.title}`);
        console.log(`   Lessons: ${result.module.lessons.length}`);
        console.log(`   Difficulty: ${result.module.difficulty}`);
        console.log(`   Duration: ${result.module.estimatedDuration}`);

        if (result.savedToDatabase) {
          console.log(`   🗄️ MongoDB ID: ${result.savedToDatabase._id}`);
          console.log(`   📂 Category: ${result.savedToDatabase.category}`);
          console.log(`   🏷️ Tags: ${result.savedToDatabase.tags.join(", ")}`);
          console.log(`   🌐 Public: ${result.savedToDatabase.isPublic}`);
          console.log(`   📅 Created: ${result.savedToDatabase.createdAt}`);
        } else {
          console.log(`   ⚠️ Not saved to MongoDB (file-only mode)`);
        }

        console.log(`\n📁 Generated Files:`);
        console.log(`   Images: ${result.filePaths.images.length} files`);
        console.log(`   Audio: ${result.filePaths.audioFiles.length} files`);
        console.log(`   Videos: ${result.filePaths.videos.length} files`);

        generatedModules.push(result);
      } catch (testError) {
        console.error(`❌ Test case ${testCase.name} failed:`, testError);
      }
    }

    // Test retrieval functionality if we have MongoDB connection
    if (mongoose.connection.readyState === 1 && generatedModules.length > 0) {
      console.log(`\n${"=".repeat(80)}`);
      console.log("🔍 Testing MongoDB Retrieval Functionality");
      console.log(`${"=".repeat(80)}`);

      // Test listing modules
      console.log("\n📋 Listing user modules...");
      const userModules = await multimediaService.listMultimediaModules({
        userId: demoUserId,
        limit: 10,
      });

      console.log(`✅ Found ${userModules.modules.length} modules for user`);
      userModules.modules.forEach((module, index) => {
        console.log(
          `   ${index + 1}. ${module.title} (${module.difficulty}) - ${
            module.status
          }`
        );
      });

      // Test retrieving a specific module
      if (userModules.modules.length > 0) {
        const firstModule = userModules.modules[0];
        console.log(`\n📖 Retrieving module: ${firstModule._id}`);

        const retrievedModule = await multimediaService.getMultimediaModule(
          (firstModule as any)._id.toString()
        );

        if (retrievedModule) {
          console.log(
            `✅ Successfully retrieved module: ${retrievedModule.title}`
          );
          console.log(`   Lessons: ${retrievedModule.lessons.length}`);
          console.log(`   View count: ${retrievedModule.analytics.viewCount}`);
        }
      }

      // Test storage statistics
      console.log(`\n📊 Getting storage statistics...`);
      const stats = await multimediaService.getUserStorageStats(demoUserId);
      console.log(`✅ Storage Statistics:`);
      console.log(`   Total modules: ${stats.totalModules}`);
      console.log(
        `   Storage used: ${(stats.totalStorageUsed / 1024 / 1024).toFixed(
          2
        )} MB`
      );
      console.log(
        `   Average module size: ${(
          stats.averageModuleSize /
          1024 /
          1024
        ).toFixed(2)} MB`
      );
      console.log(`   By difficulty:`, stats.modulesByDifficulty);
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("🎉 Demo completed successfully!");
    console.log(
      `   Generated ${generatedModules.length} multimedia training modules`
    );
    console.log(
      `   MongoDB integration: ${
        mongoose.connection.readyState === 1 ? "Active" : "Inactive"
      }`
    );
    console.log(`${"=".repeat(80)}`);
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    // Note: Don't close MongoDB connection here as it might be used by the main app
    console.log("\n🏁 Demo script finished");
  }
}

// Run the demo
if (require.main === module) {
  runDemoWithMongoDB().catch(console.error);
}

export { runDemoWithMongoDB };
