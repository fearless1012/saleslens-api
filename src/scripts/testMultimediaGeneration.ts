import { MultimediaTrainingModuleService } from "../services/multimediaTrainingModuleService";
import path from "path";

async function testMultimediaTrainingGeneration() {
  console.log(
    "🎬 Testing Multimedia Training Module Generation with LLAMA + Stable Diffusion + Bark"
  );
  console.log("=".repeat(100));

  const multimediaService = new MultimediaTrainingModuleService();

  // Sample domain knowledge from your existing data
  const sampleDomainKnowledge = `
Meta Ads Performance Marketing - Advanced Training

Campaign Strategy and Optimization:
Meta Ads offers powerful tools for reaching your target audience through Facebook, Instagram, and other Meta platforms. Understanding campaign objectives is crucial for success.

Key Campaign Types:
1. Awareness Campaigns: Build brand recognition and reach new audiences
2. Traffic Campaigns: Drive visitors to your website or landing pages  
3. Engagement Campaigns: Increase likes, comments, shares, and interactions
4. Lead Generation: Capture customer information through forms
5. Conversion Campaigns: Drive sales, purchases, or other valuable actions

Advanced Targeting Options:
- Demographics: Age, gender, location, education, income
- Interests: Hobbies, activities, pages liked, behaviors
- Custom Audiences: Upload customer lists, website visitors, app users
- Lookalike Audiences: Find people similar to your best customers
- Behavioral Targeting: Purchase behavior, device usage, travel patterns

Optimization Strategies:
- Campaign Budget Optimization (CBO): Let Meta distribute budget across ad sets
- Audience Overlap: Avoid competing against yourself with overlapping audiences
- Ad Frequency Management: Monitor how often people see your ads
- Creative Testing: A/B test different images, videos, headlines, and copy
- Placement Optimization: Choose automatic or manual ad placements

Key Performance Metrics:
- ROAS (Return on Ad Spend): Revenue generated per dollar spent
- CTR (Click-Through Rate): Percentage of people who click your ad
- CPA (Cost Per Acquisition): Cost to acquire one customer or lead
- CPM (Cost Per Mille): Cost per 1,000 impressions
- Conversion Rate: Percentage of clicks that result in desired actions

Best Practices for Success:
- Use high-quality, engaging visuals and videos
- Write compelling ad copy that speaks to your audience's pain points
- Test multiple ad variations to find what works best
- Monitor performance daily and adjust budgets based on results
- Implement proper tracking with Meta Pixel and Conversions API
- Follow Meta's advertising policies to avoid account restrictions

Common Pitfalls to Avoid:
- Setting budgets too low for effective learning
- Making frequent changes that disrupt the learning phase
- Using poor quality or irrelevant creative assets
- Ignoring mobile optimization and user experience
- Failing to exclude existing customers from acquisition campaigns
`;

  try {
    console.log("\n🔧 Configuration:");
    console.log("   📱 LLAMA Model: Llama-4-Maverick-17B-128E-Instruct-FP8");
    console.log(
      "   🎨 Stable Diffusion: Generating professional training images"
    );
    console.log("   🎵 Bark Audio: Converting text to speech narration");
    console.log("   🎤 Voice: Professional training presenter");

    // Test with different media options
    const mediaOptions = {
      includeImages: true,
      includeAudio: true,
      includeVideos: true, // Enable video generation for testing
      voicePreset: "v2/en_speaker_6", // Professional male voice
      imageStyle:
        "professional business training presentation, clean modern design, Meta company branding",
      audioQuality: "standard" as const,
      videoResolution: "1080p" as const,
    };

    console.log("\n🚀 Starting multimedia generation...");
    console.log("   This may take several minutes as we generate:");
    console.log("   1. Training content with LLAMA");
    console.log("   2. Professional images with Stable Diffusion");
    console.log("   3. Audio narration with Bark");
    console.log("   4. Combined multimedia training package");

    const result = await multimediaService.generateMultimediaTrainingModule(
      sampleDomainKnowledge,
      "test-user-id",
      mediaOptions
    );

    const multimediaModule = result.module;

    console.log(
      "\n✅ Multimedia training module generation completed successfully!"
    );

    // Additional summary
    console.log("\n📊 Generation Summary:");
    console.log("=".repeat(50));
    console.log(`Total Lessons: ${multimediaModule.lessons.length}`);
    console.log(
      `Images Generated: ${
        multimediaModule.multimedia.lessons.filter((l) => l.imagePath).length
      }`
    );
    console.log(
      `Audio Files Generated: ${
        multimediaModule.multimedia.lessons.filter((l) => l.audioPath).length
      }`
    );
    console.log(
      `Total Audio Duration: ${Math.floor(
        multimediaModule.multimedia.totalAudioDuration / 60
      )} minutes`
    );
    console.log(
      `Processing Time: ${multimediaModule.multimedia.generationMetadata.processingTime}ms`
    );

    // Show video generation summary
    if (mediaOptions.includeVideos) {
      console.log("\n🎬 Video Generation Summary:");
      console.log("=".repeat(40));
      console.log(`Videos Generated: ${result.filePaths.videos?.length || 0}`);
      if (result.filePaths.videos && result.filePaths.videos.length > 0) {
        result.filePaths.videos.forEach((videoPath, index) => {
          console.log(`   ${index + 1}. ${path.basename(videoPath)}`);
        });
      }
    }

    // Show available voice options
    console.log("\n🎤 Available Voice Presets:");
    const voices = multimediaService.getAvailableVoices();
    voices.forEach((voice, index) => {
      console.log(`   ${index + 1}. ${voice}`);
    });

    console.log("\n🎯 Next Steps:");
    console.log("   • Review generated content and media files");
    console.log("   • Adjust voice presets or image styles as needed");
    console.log("   • Deploy to learning management system");
    console.log("   • Collect learner feedback for improvements");
  } catch (error) {
    console.error("\n❌ Error during multimedia generation:", error);

    console.log("\n🔧 Troubleshooting Tips:");
    console.log("   • Ensure HUGGING_FACE_TOKEN is set in .env");
    console.log("   • Check if Stable Diffusion/Bark services are available");
    console.log("   • Verify LLAMA API credentials and quota");
    console.log("   • Check network connectivity to external APIs");

    if (error instanceof Error && error.message.includes("quota")) {
      console.log(
        "   • Consider using local installations of Stable Diffusion and Bark"
      );
    }
  }
}

// Test with minimal options for faster testing
async function testQuickGeneration() {
  console.log("\n🚀 Quick Test - Text + Placeholder Media");
  console.log("=".repeat(50));

  const multimediaService = new MultimediaTrainingModuleService();

  const quickDomainKnowledge = `
Quick Test Training Module:

This is a simple test to verify the multimedia training system works correctly.

Key Points:
1. System integration between LLAMA, Stable Diffusion, and Bark
2. Content generation and media creation pipeline
3. Output formatting and console display

This test should complete quickly and show the full multimedia module structure.
`;

  try {
    const result = await multimediaService.generateMultimediaTrainingModule(
      quickDomainKnowledge,
      "test-user-id",
      {
        includeImages: false, // Skip for faster testing
        includeAudio: false, // Skip for faster testing
        includeVideos: true, // Test video generation
        voicePreset: "v2/en_speaker_6",
        imageStyle: "simple test image",
        audioQuality: "fast" as const,
        videoResolution: "720p" as const,
      }
    );

    console.log("\n✅ Quick test completed successfully!");
  } catch (error) {
    console.error("❌ Quick test failed:", error);
  }
}

async function runTests() {
  console.log("🧪 Multimedia Training Module Generation Tests");
  console.log("=".repeat(100));

  const testType = process.argv[2] || "full";

  if (testType === "quick") {
    await testQuickGeneration();
  } else {
    await testMultimediaTrainingGeneration();
  }

  console.log("\n👋 Testing completed!");
}

// Run the tests
runTests().catch(console.error);
