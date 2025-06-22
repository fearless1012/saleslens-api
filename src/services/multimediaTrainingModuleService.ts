import { LLaMAService } from "./llamaService";
import { StableDiffusionService } from "./stableDiffusionService";
import { BarkAudioService } from "./barkAudioService";
import {
  TrainingModuleGeneratorService,
  TrainingModule,
  TrainingLesson,
} from "./trainingModuleGeneratorService";
import MultimediaTrainingModuleRepository, {
  SaveMultimediaModuleOptions,
} from "./multimediaTrainingModuleRepository";
import { IMultimediaTrainingModule } from "../models/multimediaTrainingModule";
import fs from "fs/promises";
import path from "path";

export interface MultimediaTrainingModule extends TrainingModule {
  multimedia: {
    introAudio?: string;
    conclusionAudio?: string;
    lessons: Array<{
      title: string;
      audioPath?: string;
      imagePath?: string;
      videoPaths?: string[];
      duration: number;
    }>;
    totalAudioDuration: number;
    generationMetadata: {
      generatedAt: string;
      llamaModel: string;
      stableDiffusionModel: string;
      barkVoicePreset: string;
      processingTime: number;
    };
  };
}

export interface MediaGenerationOptions {
  includeImages: boolean;
  includeAudio: boolean;
  includeVideos: boolean;
  voicePreset: string;
  imageStyle: string;
  audioQuality: "fast" | "standard" | "high";
  videoResolution: "720p" | "1080p";
}

export class MultimediaTrainingModuleService {
  private llamaService: LLaMAService;
  private stableDiffusionService: StableDiffusionService;
  private barkAudioService: BarkAudioService;
  private trainingModuleService: TrainingModuleGeneratorService;
  private multimediaRepository: MultimediaTrainingModuleRepository;
  private outputDir: string;

  constructor() {
    this.llamaService = new LLaMAService();
    this.stableDiffusionService = new StableDiffusionService();
    this.barkAudioService = new BarkAudioService();
    this.trainingModuleService = new TrainingModuleGeneratorService();
    this.multimediaRepository = new MultimediaTrainingModuleRepository();
    this.outputDir = path.join(process.cwd(), "multimedia_modules");
    this.ensureOutputDirectories();
  }

  private async ensureOutputDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "images"), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "audio"), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, "videos"), { recursive: true });
    } catch (error) {
      console.error("Error creating multimedia output directories:", error);
    }
  }

  /**
   * Generate a complete multimedia training module and save to MongoDB
   */
  async generateMultimediaTrainingModule(
    domainKnowledge: string,
    userId: string,
    options: MediaGenerationOptions = {
      includeImages: true,
      includeAudio: true,
      includeVideos: true,
      voicePreset: "v2/en_speaker_6",
      imageStyle: "professional training presentation",
      audioQuality: "standard",
      videoResolution: "1080p",
    },
    saveOptions: Partial<SaveMultimediaModuleOptions> = {}
  ): Promise<{
    module: MultimediaTrainingModule;
    savedToDatabase: IMultimediaTrainingModule | null;
    filePaths: {
      images: string[];
      videos: string[];
      audioFiles: string[];
      introAudio?: string;
      conclusionAudio?: string;
    };
  }> {
    const startTime = Date.now();

    console.log("🚀 Starting multimedia training module generation...");
    console.log("📊 Options:", JSON.stringify(options, null, 2));

    try {
      // Step 1: Generate base training module using LLAMA
      console.log("\n📚 Step 1: Generating training content with LLAMA...");
      const baseModule = await this.generateBaseModule(domainKnowledge);

      console.log("✅ Base module generated:");
      console.log(`   Title: ${baseModule.title}`);
      console.log(`   Lessons: ${baseModule.lessons.length}`);
      console.log(`   Difficulty: ${baseModule.difficulty}`);
      console.log(`   Duration: ${baseModule.estimatedDuration}`);

      // Step 2: Generate images if requested
      let lessonImages: Array<{ title: string; imagePath: string }> = [];
      if (options.includeImages) {
        console.log("\n🎨 Step 2: Generating images with Stable Diffusion...");
        lessonImages = await this.generateModuleImages(
          baseModule,
          options.imageStyle
        );
      }

      // Step 3: Generate audio if requested
      let audioFiles: Array<{
        title: string;
        audioPath: string;
        duration: number;
      }> = [];
      let introAudio: string | undefined;
      let conclusionAudio: string | undefined;

      if (options.includeAudio) {
        console.log("\n🎵 Step 3: Generating audio with Bark...");
        const audioResults = await this.generateModuleAudio(
          baseModule,
          options.voicePreset
        );
        audioFiles = audioResults.lessons;
        introAudio = audioResults.intro;
        conclusionAudio = audioResults.conclusion;
      }

      // Step 4: Generate videos if requested (placeholder for future implementation)
      let videoFiles: Array<{ title: string; videoPaths: string[] }> = [];
      if (options.includeVideos) {
        console.log("\n🎬 Step 4: Generating videos...");
        videoFiles = await this.generateModuleVideos(
          baseModule,
          lessonImages,
          options
        );
      }

      // Step 5: Combine everything into multimedia module
      console.log("\n🔗 Step 5: Assembling multimedia training module...");
      const multimediaModule = await this.assembleMultimediaModule(
        baseModule,
        lessonImages,
        audioFiles,
        videoFiles,
        introAudio,
        conclusionAudio,
        startTime,
        options
      );

      // Step 6: Prepare file paths for database storage
      const filePaths = this.prepareFilePathsForDatabase(
        lessonImages,
        audioFiles,
        videoFiles,
        introAudio,
        conclusionAudio
      );

      // Step 7: Save the complete module to filesystem (local backup)
      console.log("\n💾 Step 7: Saving multimedia module to filesystem...");
      await this.saveMultimediaModuleToFilesystem(multimediaModule);

      // Step 8: Save to MongoDB
      console.log("\n🗄️ Step 8: Saving multimedia module to MongoDB...");
      let savedToDatabase: IMultimediaTrainingModule | null = null;

      try {
        const saveOptionsWithDefaults: SaveMultimediaModuleOptions = {
          userId,
          category: saveOptions.category || "General Training",
          tags: saveOptions.tags || [],
          isPublic: saveOptions.isPublic || false,
          generateThumbnails: saveOptions.generateThumbnails || false,
        };

        // Enhance the multimedia module with domain knowledge for database storage
        const enhancedModule = {
          ...multimediaModule,
          domainKnowledge: domainKnowledge,
        };

        savedToDatabase = await this.multimediaRepository.saveMultimediaModule(
          enhancedModule,
          filePaths,
          saveOptionsWithDefaults
        );

        console.log(
          `✅ Module successfully saved to MongoDB with ID: ${savedToDatabase._id}`
        );
      } catch (dbError) {
        console.error(
          "⚠️ Warning: Failed to save to MongoDB, but module was generated successfully:",
          dbError
        );
        console.log("📁 Module files are still available in the filesystem");
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `\n✅ Multimedia training module generation completed in ${processingTime}ms!`
      );

      // Print the complete module to console
      this.printMultimediaModuleToConsole(multimediaModule);

      return {
        module: multimediaModule,
        savedToDatabase,
        filePaths,
      };
    } catch (error) {
      console.error("❌ Error generating multimedia training module:", error);
      throw error;
    }
  }

  /**
   * Retrieve a multimedia training module from MongoDB
   */
  async getMultimediaModule(
    moduleId: string
  ): Promise<IMultimediaTrainingModule | null> {
    return await this.multimediaRepository.getMultimediaModule(moduleId);
  }

  /**
   * List multimedia training modules with filtering
   */
  async listMultimediaModules(
    filters: {
      userId?: string;
      category?: string;
      difficulty?: string;
      tags?: string[];
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return await this.multimediaRepository.listMultimediaModules(filters);
  }

  /**
   * Delete a multimedia training module
   */
  async deleteMultimediaModule(
    moduleId: string,
    userId: string
  ): Promise<boolean> {
    return await this.multimediaRepository.deleteMultimediaModule(
      moduleId,
      userId
    );
  }

  /**
   * Get user storage statistics
   */
  async getUserStorageStats(userId: string) {
    return await this.multimediaRepository.getUserStorageStats(userId);
  }

  private prepareFilePathsForDatabase(
    lessonImages: Array<{ title: string; imagePath: string }>,
    audioFiles: Array<{ title: string; audioPath: string; duration: number }>,
    videoFiles: Array<{ title: string; videoPaths: string[] }>,
    introAudio?: string,
    conclusionAudio?: string
  ) {
    const filePaths = {
      images: lessonImages.map((img) => img.imagePath),
      videos: videoFiles.flatMap((video) => video.videoPaths),
      audioFiles: audioFiles.map((audio) => audio.audioPath),
      introAudio,
      conclusionAudio,
    };

    console.log("📁 Prepared file paths for database storage:");
    console.log(`   Images: ${filePaths.images.length} files`);
    console.log(`   Audio: ${filePaths.audioFiles.length} files`);
    console.log(`   Videos: ${filePaths.videos.length} files`);
    if (filePaths.introAudio)
      console.log(`   Intro Audio: ${filePaths.introAudio}`);
    if (filePaths.conclusionAudio)
      console.log(`   Conclusion Audio: ${filePaths.conclusionAudio}`);

    return filePaths;
  }

  private async generateBaseModule(
    domainKnowledge: string
  ): Promise<TrainingModule> {
    // Use existing training module generator
    const prompt = `Create a comprehensive training module based on this domain knowledge:

${domainKnowledge}

Focus on creating:
1. Clear learning objectives
2. Well-structured lessons with practical content
3. Key takeaways for retention
4. Assessment opportunities
5. Real-world application scenarios

Make it engaging and suitable for multimedia presentation.`;

    const response = await this.llamaService.generateText(prompt, {
      systemPrompt:
        "You are an expert instructional designer creating comprehensive training modules.",
      maxTokens: 2000,
      temperature: 0.7,
    });

    try {
      const cleanedResponse = this.cleanJsonResponse(response);
      return JSON.parse(cleanedResponse) as TrainingModule;
    } catch (parseError) {
      console.error("Error parsing LLAMA response, using fallback structure");
      return this.createFallbackModule(domainKnowledge);
    }
  }

  private async generateModuleImages(
    module: TrainingModule,
    imageStyle: string
  ): Promise<Array<{ title: string; imagePath: string }>> {
    console.log("🖼️ Generating images for training lessons...");

    const lessonTitles = module.lessons.map((lesson) => lesson.title);

    // Add module title slide
    const allTitles = [module.title, ...lessonTitles];

    return await this.stableDiffusionService.generateTrainingImages(
      allTitles,
      imageStyle
    );
  }

  private async generateModuleAudio(
    module: TrainingModule,
    voicePreset: string
  ): Promise<{
    lessons: Array<{ title: string; audioPath: string; duration: number }>;
    intro: string;
    conclusion: string;
  }> {
    console.log("🎙️ Generating audio narration...");

    // Generate lesson audio
    const lessons = await this.barkAudioService.generateTrainingNarration(
      module.lessons.map((lesson) => ({
        title: lesson.title,
        content: lesson.content,
      })),
      voicePreset
    );

    // Generate intro and conclusion
    const { intro, conclusion } =
      await this.barkAudioService.generateModuleIntroConclusion(
        module.title,
        module.objectives,
        module.keyTakeaways,
        voicePreset
      );

    return { lessons, intro, conclusion };
  }

  private async generateModuleVideos(
    module: TrainingModule,
    images: Array<{ title: string; imagePath: string }>,
    options: MediaGenerationOptions
  ): Promise<Array<{ title: string; videoPaths: string[] }>> {
    console.log("🎬 Generating training videos...");
    console.log(`📊 Creating videos for ${module.lessons.length} lessons`);

    const videoResults: Array<{ title: string; videoPaths: string[] }> = [];

    try {
      // Process each lesson to create a video
      for (const [index, lesson] of module.lessons.entries()) {
        console.log(
          `🎥 Generating video ${index + 1}/${module.lessons.length}: ${
            lesson.title
          }`
        );

        // Find corresponding image for this lesson
        const lessonImage = images.find((img) => img.title === lesson.title);

        if (lessonImage) {
          // Generate video using Stable Video Diffusion with the existing image
          const videoPrompt = `Professional training presentation video for "${
            lesson.title
          }". Educational content about ${lesson.content.substring(0, 200)}...`;

          console.log(`📝 Video prompt: ${videoPrompt.substring(0, 100)}...`);

          try {
            const videoPath = await this.stableDiffusionService.generateVideo({
              prompt: videoPrompt,
              num_frames: options.videoResolution === "1080p" ? 25 : 14,
              fps: 8,
              motion_bucket_id: 127,
              noise_aug_strength: 0.02,
              width: options.videoResolution === "1080p" ? 1920 : 1280,
              height: options.videoResolution === "1080p" ? 1080 : 720,
            });

            videoResults.push({
              title: lesson.title,
              videoPaths: [videoPath],
            });

            console.log(
              `✅ Video generated for "${lesson.title}": ${videoPath}`
            );
          } catch (videoError) {
            console.error(
              `❌ Failed to generate video for "${lesson.title}":`,
              videoError
            );

            // Fallback: Create a placeholder video
            const placeholderPath = await this.createVideoPlaceholder(
              lesson.title,
              lesson.content
            );
            videoResults.push({
              title: lesson.title,
              videoPaths: [placeholderPath],
            });
          }
        } else {
          console.warn(
            `⚠️ No image found for lesson "${lesson.title}", creating text-based video`
          );

          // Generate video from text prompt only
          try {
            const textVideoPath =
              await this.stableDiffusionService.generateVideo({
                prompt: `Training slide with title "${lesson.title}" and professional presentation design`,
                num_frames: 14,
                fps: 6,
                motion_bucket_id: 100,
                noise_aug_strength: 0.1,
              });

            videoResults.push({
              title: lesson.title,
              videoPaths: [textVideoPath],
            });
          } catch (error) {
            // Create placeholder as last resort
            const placeholderPath = await this.createVideoPlaceholder(
              lesson.title,
              lesson.content
            );
            videoResults.push({
              title: lesson.title,
              videoPaths: [placeholderPath],
            });
          }
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(
        `🎉 Video generation completed: ${videoResults.length} videos created`
      );
      return videoResults;
    } catch (error) {
      console.error("❌ Error in video generation pipeline:", error);

      // Fallback: Create placeholder videos for all lessons
      return module.lessons.map((lesson) => ({
        title: lesson.title,
        videoPaths: [
          `placeholder_video_${lesson.title
            .replace(/\s+/g, "_")
            .toLowerCase()}.mp4`,
        ],
      }));
    }
  }

  private async assembleMultimediaModule(
    baseModule: TrainingModule,
    images: Array<{ title: string; imagePath: string }>,
    audioFiles: Array<{ title: string; audioPath: string; duration: number }>,
    videoFiles: Array<{ title: string; videoPaths: string[] }>,
    introAudio: string | undefined,
    conclusionAudio: string | undefined,
    startTime: number,
    options: MediaGenerationOptions
  ): Promise<MultimediaTrainingModule> {
    const multimediaLessons = baseModule.lessons.map((lesson, index) => {
      const image = images.find((img) => img.title === lesson.title);
      const audio = audioFiles.find((aud) => aud.title === lesson.title);
      const video = videoFiles.find((vid) => vid.title === lesson.title);

      return {
        title: lesson.title,
        audioPath: audio?.audioPath,
        imagePath: image?.imagePath,
        videoPaths: video?.videoPaths,
        duration: audio?.duration || 120, // default 2 minutes if no audio
      };
    });

    const totalAudioDuration = audioFiles.reduce(
      (total, audio) => total + audio.duration,
      0
    );
    const processingTime = Date.now() - startTime;

    return {
      ...baseModule,
      multimedia: {
        introAudio,
        conclusionAudio,
        lessons: multimediaLessons,
        totalAudioDuration,
        generationMetadata: {
          generatedAt: new Date().toISOString(),
          llamaModel: "Llama-4-Maverick-17B-128E-Instruct-FP8",
          stableDiffusionModel: "runwayml/stable-diffusion-v1-5",
          barkVoicePreset: options.voicePreset,
          processingTime,
        },
      },
    };
  }

  private async saveMultimediaModuleToFilesystem(
    module: MultimediaTrainingModule
  ): Promise<void> {
    const moduleDir = path.join(
      this.outputDir,
      `${module.title.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`
    );
    await fs.mkdir(moduleDir, { recursive: true });

    // Save module metadata
    const moduleMetadataPath = path.join(moduleDir, "module.json");
    await fs.writeFile(moduleMetadataPath, JSON.stringify(module, null, 2));

    console.log("💾 Module saved to filesystem:", moduleDir);
  }

  private printMultimediaModuleToConsole(
    module: MultimediaTrainingModule
  ): void {
    console.log("\n" + "=".repeat(100));
    console.log("🎓 MULTIMEDIA TRAINING MODULE - COMPLETE PACKAGE");
    console.log("=".repeat(100));

    console.log(`\n📚 Module Title: ${module.title.toUpperCase()}`);
    console.log("=".repeat(100));

    console.log(`\n📖 Description: ${module.description}`);
    console.log(`⏱️  Estimated Duration: ${module.estimatedDuration}`);
    console.log(`📊 Difficulty Level: ${module.difficulty}`);
    console.log(
      `🎵 Total Audio Duration: ${Math.floor(
        module.multimedia.totalAudioDuration / 60
      )} minutes ${module.multimedia.totalAudioDuration % 60} seconds`
    );

    console.log("\n🎯 Learning Objectives:");
    module.objectives.forEach((objective, index) => {
      console.log(`   ${index + 1}. ${objective}`);
    });

    console.log("\n🔑 Key Takeaways:");
    module.keyTakeaways.forEach((takeaway, index) => {
      console.log(`   ${index + 1}. ${takeaway}`);
    });

    if (module.multimedia.introAudio) {
      console.log(`\n🎬 Introduction Audio: ${module.multimedia.introAudio}`);
    }

    console.log(`\n📋 Lessons (${module.lessons.length} total):`);
    console.log("=".repeat(100));

    module.lessons.forEach((lesson, index) => {
      const multimedia = module.multimedia.lessons[index];

      console.log(`\n   Lesson ${index + 1}: ${lesson.title}`);
      console.log(`   Type: ${lesson.type} | Duration: ${lesson.duration}`);
      console.log(`   Content: ${lesson.content.substring(0, 200)}...`);

      if (multimedia.imagePath) {
        console.log(`   🖼️  Image: ${multimedia.imagePath}`);
      }

      if (multimedia.audioPath) {
        console.log(
          `   🎵 Audio: ${multimedia.audioPath} (${multimedia.duration}s)`
        );
      }

      if (multimedia.videoPaths && multimedia.videoPaths.length > 0) {
        console.log(`   🎬 Videos: ${multimedia.videoPaths.join(", ")}`);
      }

      if (lesson.resources && lesson.resources.length > 0) {
        console.log(`   📚 Resources: ${lesson.resources.join(", ")}`);
      }
    });

    if (module.multimedia.conclusionAudio) {
      console.log(
        `\n🎬 Conclusion Audio: ${module.multimedia.conclusionAudio}`
      );
    }

    console.log("\n📊 Generation Metadata:");
    console.log("=".repeat(100));
    console.log(
      `   Generated At: ${module.multimedia.generationMetadata.generatedAt}`
    );
    console.log(
      `   LLAMA Model: ${module.multimedia.generationMetadata.llamaModel}`
    );
    console.log(
      `   Stable Diffusion Model: ${module.multimedia.generationMetadata.stableDiffusionModel}`
    );
    console.log(
      `   Bark Voice Preset: ${module.multimedia.generationMetadata.barkVoicePreset}`
    );
    console.log(
      `   Processing Time: ${module.multimedia.generationMetadata.processingTime}ms`
    );

    console.log("\n" + "=".repeat(100));
    console.log("✅ MULTIMEDIA TRAINING MODULE GENERATION COMPLETE!");
    console.log("=".repeat(100));
  }

  private cleanJsonResponse(response: string): string {
    // Remove any markdown code blocks
    response = response.replace(/```json\s*|\s*```/g, "");

    // Find JSON-like content
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return response.trim();
  }

  private createFallbackModule(domainKnowledge: string): TrainingModule {
    return {
      title: "AI-Generated Training Module",
      description: "Comprehensive training based on provided domain knowledge",
      estimatedDuration: "4 hours",
      difficulty: "intermediate" as const,
      objectives: [
        "Understand key concepts from the domain knowledge",
        "Apply learned principles in practical scenarios",
        "Demonstrate mastery through assessments",
      ],
      keyTakeaways: [
        "Core principles are essential for success",
        "Practical application reinforces learning",
        "Continuous improvement is key",
      ],
      lessons: [
        {
          title: "Introduction to Key Concepts",
          content: domainKnowledge.substring(0, 500) + "...",
          duration: "45 minutes",
          type: "theory" as const,
          resources: ["Reference Material", "Additional Reading"],
        },
        {
          title: "Practical Application",
          content: "Apply the concepts learned in real-world scenarios...",
          duration: "60 minutes",
          type: "practical" as const,
          resources: ["Hands-on Exercises", "Case Studies"],
        },
        {
          title: "Assessment and Review",
          content: "Test your understanding and review key concepts...",
          duration: "30 minutes",
          type: "assessment" as const,
          resources: ["Quiz", "Review Materials"],
        },
      ],
    };
  }

  /**
   * Get available voice options for audio generation
   */
  getAvailableVoices(): string[] {
    return this.barkAudioService.getAvailableVoices();
  }

  /**
   * Clean up old multimedia files
   */
  async cleanupOldFiles(olderThanHours: number = 24): Promise<void> {
    console.log("🧹 Cleaning up old multimedia files...");

    await Promise.all([
      this.stableDiffusionService.cleanupOldFiles(olderThanHours),
      this.barkAudioService.cleanupOldFiles(olderThanHours),
    ]);

    console.log("✅ Cleanup completed!");
  }

  /**
   * Create a video placeholder file when actual video generation fails
   */
  private async createVideoPlaceholder(
    title: string,
    content: string
  ): Promise<string> {
    console.log(`📄 Creating video placeholder for: ${title}`);

    const placeholderPath = path.join(
      this.outputDir,
      "videos",
      `placeholder_video_${title
        .replace(/\s+/g, "_")
        .toLowerCase()}_${Date.now()}.txt`
    );

    await fs.mkdir(path.dirname(placeholderPath), { recursive: true });

    const placeholderContent = `Video Placeholder
    
Title: ${title}
Content Preview: ${content.substring(0, 300)}${
      content.length > 300 ? "..." : ""
    }
Generated: ${new Date().toISOString()}
Reason: Fallback when video generation fails

This would be a training video covering:
${title}
`;

    await fs.writeFile(placeholderPath, placeholderContent);
    console.log(`📄 Video placeholder saved: ${placeholderPath}`);

    return placeholderPath;
  }

  /**
   * Get video generation capabilities and status
   */
  getVideoGenerationStatus(): {
    enabled: boolean;
    availableMethods: string[];
    huggingFaceEnabled: boolean;
    localApiEnabled: boolean;
  } {
    const availableMethods =
      this.stableDiffusionService.getAvailableVideoMethods();

    return {
      enabled: true,
      availableMethods,
      huggingFaceEnabled: availableMethods.includes("huggingface"),
      localApiEnabled: availableMethods.includes("local_api"),
    };
  }

  /**
   * Test video generation functionality
   */
  async testVideoGeneration(): Promise<{
    success: boolean;
    method: string;
    filePath?: string;
    error?: string;
  }> {
    console.log("🧪 Testing video generation functionality...");

    try {
      const testPrompt = "Test training video: Professional presentation slide";
      const videoPath = await this.stableDiffusionService.generateVideo({
        prompt: testPrompt,
        num_frames: 10,
        fps: 6,
      });

      return {
        success: true,
        method: "stable_diffusion",
        filePath: videoPath,
      };
    } catch (error) {
      return {
        success: false,
        method: "none",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ...existing code...
}
