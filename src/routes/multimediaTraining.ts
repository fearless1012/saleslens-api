import express from "express";
import { MultimediaTrainingModuleService } from "../services/multimediaTrainingModuleService";

const router = express.Router();
const multimediaService = new MultimediaTrainingModuleService();

/**
 * Generate multimedia training module with LLAMA + Stable Diffusion + Bark
 */
router.post("/generate-multimedia-module", async (req, res) => {
  try {
    const {
      domainKnowledge,
      userId,
      includeImages = true,
      includeAudio = true,
      includeVideos = true,
      voicePreset = "v2/en_speaker_6",
      imageStyle = "professional training presentation",
      audioQuality = "standard",
      videoResolution = "1080p",
      category = "General Training",
      tags = [],
      isPublic = false,
    } = req.body;

    if (!domainKnowledge) {
      return res.status(400).json({
        error: "Domain knowledge content is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    console.log("🎬 API Request: Generating multimedia training module...");
    console.log("📊 Options:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Images: ${includeImages}`);
    console.log(`   Audio: ${includeAudio}`);
    console.log(`   Videos: ${includeVideos}`);
    console.log(`   Voice: ${voicePreset}`);
    console.log(`   Image Style: ${imageStyle}`);
    console.log(`   Category: ${category}`);
    console.log(`   Tags: ${tags.join(", ")}`);
    console.log(`   Public: ${isPublic}`);

    const options = {
      includeImages,
      includeAudio,
      includeVideos,
      voicePreset,
      imageStyle,
      audioQuality: audioQuality as "fast" | "standard" | "high",
      videoResolution: videoResolution as "720p" | "1080p",
    };

    const saveOptions = {
      category,
      tags,
      isPublic,
    };

    const result = await multimediaService.generateMultimediaTrainingModule(
      domainKnowledge,
      userId,
      options,
      saveOptions
    );

    console.log("✅ Multimedia training module generation completed");
    console.log(`📚 Generated ${result.module.lessons.length} lessons`);
    console.log(
      `🎵 Total audio duration: ${result.module.multimedia.totalAudioDuration} seconds`
    );
    if (result.savedToDatabase) {
      console.log(`🗄️ Saved to MongoDB with ID: ${result.savedToDatabase._id}`);
    }

    res.json({
      success: true,
      module: result.module,
      databaseId: result.savedToDatabase?._id,
      filePaths: result.filePaths,
      summary: {
        lessonCount: result.module.lessons.length,
        imagesGenerated: result.module.multimedia.lessons.filter(
          (l: any) => l.imagePath
        ).length,
        audioFilesGenerated: result.module.multimedia.lessons.filter(
          (l: any) => l.audioPath
        ).length,
        totalAudioDuration: result.module.multimedia.totalAudioDuration,
        processingTime:
          result.module.multimedia.generationMetadata.processingTime,
        savedToDatabase: !!result.savedToDatabase,
        totalFiles: {
          images: result.filePaths.images.length,
          videos: result.filePaths.videos.length,
          audioFiles: result.filePaths.audioFiles.length,
        },
      },
      message: "Multimedia training module generated successfully",
    });
  } catch (error) {
    console.error("❌ Error generating multimedia training module:", error);
    res.status(500).json({
      error: "Failed to generate multimedia training module",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get available voice presets for audio generation
 */
router.get("/voice-presets", (req, res) => {
  try {
    const voices = multimediaService.getAvailableVoices();

    const voiceDescriptions = [
      {
        preset: "v2/en_speaker_0",
        description: "Male, confident and authoritative",
      },
      {
        preset: "v2/en_speaker_1",
        description: "Female, professional and clear",
      },
      { preset: "v2/en_speaker_2", description: "Male, calm and measured" },
      {
        preset: "v2/en_speaker_3",
        description: "Female, energetic and engaging",
      },
      {
        preset: "v2/en_speaker_4",
        description: "Male, authoritative and commanding",
      },
      {
        preset: "v2/en_speaker_5",
        description: "Female, friendly and approachable",
      },
      {
        preset: "v2/en_speaker_6",
        description: "Male, neutral and professional",
      },
      {
        preset: "v2/en_speaker_7",
        description: "Female, warm and encouraging",
      },
      { preset: "v2/en_speaker_8", description: "Male, deep and resonant" },
      {
        preset: "v2/en_speaker_9",
        description: "Female, clear and articulate",
      },
    ];

    res.json({
      success: true,
      voices: voiceDescriptions,
      recommended: {
        training: "v2/en_speaker_6",
        presentation: "v2/en_speaker_1",
        casual: "v2/en_speaker_5",
      },
    });
  } catch (error) {
    console.error("❌ Error getting voice presets:", error);
    res.status(500).json({
      error: "Failed to get voice presets",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Generate training module from uploaded domain knowledge file
 */
router.post("/generate-from-file", async (req, res) => {
  try {
    const { fileContent, fileName, userId, options = {} } = req.body;

    if (!fileContent) {
      return res.status(400).json({
        error: "File content is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    console.log(`📄 Generating multimedia module from file: ${fileName}`);

    const defaultOptions = {
      includeImages: true,
      includeAudio: true,
      includeVideos: true,
      voicePreset: "v2/en_speaker_6",
      imageStyle: "professional training presentation",
      audioQuality: "standard" as const,
      videoResolution: "1080p" as const,
    };

    const finalOptions = { ...defaultOptions, ...options };

    const saveOptions = {
      category: options.category || "File Upload",
      tags: options.tags || [fileName ? fileName.split(".")[0] : "upload"],
      isPublic: options.isPublic || false,
    };

    const result = await multimediaService.generateMultimediaTrainingModule(
      fileContent,
      userId,
      finalOptions,
      saveOptions
    );

    res.json({
      success: true,
      module: result.module,
      databaseId: result.savedToDatabase?._id,
      sourceFile: fileName,
      message: `Multimedia training module generated from ${fileName}`,
    });
  } catch (error) {
    console.error("❌ Error generating module from file:", error);
    res.status(500).json({
      error: "Failed to generate multimedia module from file",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test endpoint for quick multimedia generation testing
 */
router.post("/test-generation", async (req, res) => {
  try {
    console.log("🧪 Testing multimedia generation with sample data...");

    const sampleDomainKnowledge = `
Test Training Module - Meta Ads Basics

Introduction to Meta Advertising:
Meta Ads is a powerful platform for reaching customers on Facebook, Instagram, and other Meta properties.

Key Concepts:
1. Campaign Objectives - Choose the right goal for your ads
2. Audience Targeting - Reach the right people at the right time
3. Creative Assets - Use compelling images and videos
4. Budget Management - Optimize your ad spend for best results

Best Practices:
- Test multiple ad variations
- Monitor performance metrics
- Adjust targeting based on results
- Use high-quality visuals
`;

    const testOptions = {
      includeImages: false, // Faster testing
      includeAudio: false, // Faster testing
      includeVideos: true, // Test video generation
      voicePreset: "v2/en_speaker_6",
      imageStyle: "simple test style",
      audioQuality: "fast" as const,
      videoResolution: "720p" as const,
    };

    const result = await multimediaService.generateMultimediaTrainingModule(
      sampleDomainKnowledge,
      "test-user-id",
      testOptions
    );

    res.json({
      success: true,
      module: result.module,
      databaseId: result.savedToDatabase?._id,
      testMode: true,
      message: "Test multimedia module generated successfully",
    });
  } catch (error) {
    console.error("❌ Error in test generation:", error);
    res.status(500).json({
      error: "Test generation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Clean up old multimedia files
 */
router.post("/cleanup", async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;

    console.log(
      `🧹 Cleaning up multimedia files older than ${olderThanHours} hours...`
    );

    await multimediaService.cleanupOldFiles(olderThanHours);

    res.json({
      success: true,
      message: `Cleanup completed for files older than ${olderThanHours} hours`,
    });
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    res.status(500).json({
      error: "Cleanup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get a specific multimedia training module by ID
 */
router.get("/modules/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;

    console.log(`📖 Retrieving multimedia module: ${moduleId}`);

    const module = await multimediaService.getMultimediaModule(moduleId);

    if (!module) {
      return res.status(404).json({
        error: "Multimedia module not found",
      });
    }

    res.json({
      success: true,
      module,
      message: "Multimedia module retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error retrieving multimedia module:", error);
    res.status(500).json({
      error: "Failed to retrieve multimedia module",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * List multimedia training modules with filtering
 */
router.get("/modules", async (req, res) => {
  try {
    const {
      userId,
      category,
      difficulty,
      tags,
      isPublic,
      limit = "20",
      offset = "0",
    } = req.query;

    console.log("📋 Listing multimedia modules...");
    console.log("   Filters:", {
      userId,
      category,
      difficulty,
      tags,
      isPublic,
    });

    const filters: any = {};

    if (userId) filters.userId = userId as string;
    if (category) filters.category = category as string;
    if (difficulty) filters.difficulty = difficulty as string;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filters.tags = tagArray.map((tag) => tag as string);
    }
    if (isPublic !== undefined) filters.isPublic = isPublic === "true";
    filters.limit = parseInt(limit as string);
    filters.offset = parseInt(offset as string);

    const result = await multimediaService.listMultimediaModules(filters);

    res.json({
      success: true,
      modules: result.modules,
      total: result.total,
      hasMore: result.hasMore,
      filters,
      message: `Found ${result.modules.length} multimedia modules`,
    });
  } catch (error) {
    console.error("❌ Error listing multimedia modules:", error);
    res.status(500).json({
      error: "Failed to list multimedia modules",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Delete a multimedia training module
 */
router.delete("/modules/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    console.log(
      `🗑️ Deleting multimedia module: ${moduleId} for user: ${userId}`
    );

    const deleted = await multimediaService.deleteMultimediaModule(
      moduleId,
      userId
    );

    if (!deleted) {
      return res.status(404).json({
        error: "Multimedia module not found or access denied",
      });
    }

    res.json({
      success: true,
      message: "Multimedia module deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting multimedia module:", error);
    res.status(500).json({
      error: "Failed to delete multimedia module",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get user storage statistics
 */
router.get("/storage-stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📊 Getting storage stats for user: ${userId}`);

    const stats = await multimediaService.getUserStorageStats(userId);

    res.json({
      success: true,
      stats,
      message: "Storage statistics retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error getting storage stats:", error);
    res.status(500).json({
      error: "Failed to get storage statistics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Serve multimedia files
 */
router.get("/files/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const path = require("path");
    const fs = require("fs");

    // This is a basic file server - in production you'd use a proper CDN
    const mediaOutputDir = path.join(process.cwd(), "media_output");

    // Check different subdirectories
    const possiblePaths = [
      path.join(mediaOutputDir, "images", filename),
      path.join(mediaOutputDir, "audio", filename),
      path.join(mediaOutputDir, "videos", filename),
      path.join(process.cwd(), "multimedia_modules", filename),
    ];

    let filePath = null;
    for (const checkPath of possiblePaths) {
      if (fs.existsSync(checkPath)) {
        filePath = checkPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".mp4": "video/mp4",
      ".avi": "video/avi",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("❌ Error serving file:", error);
    res.status(500).json({
      error: "Failed to serve file",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test video generation functionality
 */
router.post("/test-video-generation", async (req, res) => {
  try {
    console.log("🧪 Testing video generation system...");

    const status = multimediaService.getVideoGenerationStatus();
    const testResult = await multimediaService.testVideoGeneration();

    res.json({
      success: true,
      videoGenerationStatus: status,
      testResult,
      message: testResult.success
        ? "Video generation test completed successfully"
        : "Video generation test failed - using fallback methods",
    });
  } catch (error) {
    console.error("❌ Error testing video generation:", error);
    res.status(500).json({
      error: "Failed to test video generation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
