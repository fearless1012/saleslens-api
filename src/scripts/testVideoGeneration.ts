#!/usr/bin/env ts-node

import { MultimediaTrainingModuleService } from "../services/multimediaTrainingModuleService";
import { StableDiffusionService } from "../services/stableDiffusionService";
import path from "path";

async function testVideoGeneration() {
  console.log("🎬 Video Generation Test Suite");
  console.log("=".repeat(60));

  const multimediaService = new MultimediaTrainingModuleService();
  const stableDiffusionService = new StableDiffusionService();

  // Test 1: Check video generation status
  console.log("\n📋 Test 1: Video Generation Status");
  console.log("-".repeat(40));

  const status = multimediaService.getVideoGenerationStatus();
  console.log("Video Generation Enabled:", status.enabled);
  console.log("Available Methods:", status.availableMethods.join(", "));
  console.log("HuggingFace Enabled:", status.huggingFaceEnabled);
  console.log("Local API Enabled:", status.localApiEnabled);

  // Test 2: Direct video service test
  console.log("\n🎯 Test 2: Direct Video Service Test");
  console.log("-".repeat(40));

  try {
    const testVideoPath = await stableDiffusionService.generateVideo({
      prompt: "Professional training presentation about Meta AI technology",
      num_frames: 10,
      fps: 6,
      width: 1024,
      height: 576,
    });

    console.log("✅ Direct video generation successful");
    console.log("Video path:", testVideoPath);

    // Check if file exists and get info
    const fs = await import("fs/promises");
    try {
      const stats = await fs.stat(testVideoPath);
      console.log("File size:", stats.size, "bytes");
      console.log("File type:", path.extname(testVideoPath));
    } catch (err) {
      console.log(
        "⚠️  File info unavailable:",
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  } catch (error) {
    console.log(
      "❌ Direct video generation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Test 3: Full multimedia module with videos
  console.log("\n🎓 Test 3: Full Training Module with Videos");
  console.log("-".repeat(40));

  const testDomainKnowledge = `
Meta LLaMA Video Training Module

Introduction:
This is a test module specifically designed to validate video generation capabilities in the SalesLens training system.

Key Topics:
1. Video Technology Basics
2. Training Content Delivery
3. Multimedia Integration
4. Assessment Methods

The system should generate professional training videos for each of these topics.
`;

  try {
    console.log("🚀 Starting full multimedia generation...");

    const result = await multimediaService.generateMultimediaTrainingModule(
      testDomainKnowledge,
      "video-test-user",
      {
        includeImages: false, // Focus on videos
        includeAudio: false, // Focus on videos
        includeVideos: true, // Main test target
        voicePreset: "v2/en_speaker_6",
        imageStyle: "professional training video",
        audioQuality: "fast",
        videoResolution: "720p",
      }
    );

    console.log("✅ Full multimedia generation completed");
    console.log("Module title:", result.module.title);
    console.log("Lessons count:", result.module.lessons.length);
    console.log("Videos generated:", result.filePaths.videos?.length || 0);

    if (result.filePaths.videos && result.filePaths.videos.length > 0) {
      console.log("\n📹 Generated Videos:");
      result.filePaths.videos.forEach((videoPath, index) => {
        console.log(`   ${index + 1}. ${path.basename(videoPath)}`);
      });
    }

    if (result.savedToDatabase) {
      console.log("💾 Saved to database with ID:", result.savedToDatabase._id);
    }
  } catch (error) {
    console.log(
      "❌ Full multimedia generation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Test 4: Performance and capabilities summary
  console.log("\n📊 Test 4: Summary and Recommendations");
  console.log("-".repeat(40));

  console.log("\n🎯 Video Generation Capabilities:");
  console.log("   • Stable Video Diffusion via HuggingFace API");
  console.log("   • Local API fallback support");
  console.log("   • Image sequence video alternative");
  console.log("   • Enhanced placeholder generation");

  console.log("\n💡 Recommendations:");
  console.log("   • Ensure HUGGING_FACE_TOKEN is valid for best results");
  console.log("   • Consider local Stable Diffusion setup for production");
  console.log("   • Monitor API rate limits and costs");
  console.log("   • Implement video post-processing if needed");

  console.log("\n🔧 Next Steps:");
  console.log("   • Test with different video resolutions");
  console.log("   • Experiment with various prompts and styles");
  console.log("   • Integrate with audio for complete video experiences");
  console.log("   • Add video quality validation");

  console.log("\n✅ Video generation test suite completed!");
}

// Run the test if this script is executed directly
if (require.main === module) {
  testVideoGeneration().catch(console.error);
}

export { testVideoGeneration };
