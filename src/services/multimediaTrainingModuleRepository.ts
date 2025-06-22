import {
  MultimediaTrainingModule,
  IMultimediaTrainingModule,
  IMultimediaFile,
} from "../models/multimediaTrainingModule";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

export interface SaveMultimediaModuleOptions {
  userId: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  generateThumbnails?: boolean;
}

export class MultimediaTrainingModuleRepository {
  /**
   * Save a complete multimedia training module to MongoDB
   */
  async saveMultimediaModule(
    multimediaModule: any,
    filePaths: {
      images: string[];
      videos: string[];
      audioFiles: string[];
      introAudio?: string;
      conclusionAudio?: string;
    },
    options: SaveMultimediaModuleOptions
  ): Promise<IMultimediaTrainingModule> {
    console.log("💾 Saving multimedia training module to MongoDB...");

    try {
      // Process multimedia files
      const processedMultimedia = await this.processMultimediaFiles(filePaths);

      // Create the MongoDB document
      const moduleData: Partial<IMultimediaTrainingModule> = {
        title: multimediaModule.title,
        description: multimediaModule.description,
        domainKnowledge: multimediaModule.domainKnowledge || "",
        estimatedDuration: multimediaModule.estimatedDuration,
        difficulty: multimediaModule.difficulty,
        objectives: multimediaModule.objectives,
        keyTakeaways: multimediaModule.keyTakeaways,
        lessons: multimediaModule.lessons,

        multimedia: {
          introAudio: processedMultimedia.introAudio,
          conclusionAudio: processedMultimedia.conclusionAudio,
          lessons: processedMultimedia.lessons,
          totalAudioDuration:
            multimediaModule.multimedia?.totalAudioDuration || 0,
          totalVideoDuration: 0, // Will be calculated
          totalStorageSize: 0, // Will be calculated
        },

        generationMetadata: multimediaModule.multimedia?.generationMetadata || {
          generatedAt: new Date(),
          processingTime: 0,
          llamaModel: "Unknown",
          options: {
            includeImages: true,
            includeAudio: true,
            includeVideos: false,
            voicePreset: "v2/en_speaker_6",
            imageStyle: "professional",
            audioQuality: "standard",
            videoResolution: "1080p",
          },
        },

        createdBy: mongoose.Types.ObjectId.isValid(options.userId)
          ? new mongoose.Types.ObjectId(options.userId)
          : new mongoose.Types.ObjectId(), // Generate a new ObjectId if invalid
        status: "completed",
        category: options.category || "General Training",
        tags: options.tags || [],
        isPublic: options.isPublic || false,

        analytics: {
          viewCount: 0,
          completionRate: 0,
          averageRating: 0,
          feedbackCount: 0,
        },

        sharingPermissions: {
          users: [],
          roles: [],
          organizations: [],
        },
      };

      // Create and save the module
      const savedModule = new MultimediaTrainingModule(moduleData);

      // Calculate storage usage
      savedModule.calculateStorageUsage();

      // Save to database
      await savedModule.save();

      console.log(`✅ Module saved to MongoDB with ID: ${savedModule._id}`);
      console.log(
        `📊 Total storage: ${(
          savedModule.multimedia.totalStorageSize /
          1024 /
          1024
        ).toFixed(2)} MB`
      );
      console.log(`📁 Total files: ${savedModule.totalFiles}`);

      return savedModule;
    } catch (error) {
      console.error("❌ Error saving multimedia module:", error);
      throw error;
    }
  }

  /**
   * Process multimedia files and create file metadata
   */
  private async processMultimediaFiles(filePaths: {
    images: string[];
    videos: string[];
    audioFiles: string[];
    introAudio?: string;
    conclusionAudio?: string;
  }) {
    const processedFiles = {
      introAudio: undefined as IMultimediaFile | undefined,
      conclusionAudio: undefined as IMultimediaFile | undefined,
      lessons: [] as any[],
    };

    // Process intro audio
    if (filePaths.introAudio) {
      processedFiles.introAudio = await this.createFileMetadata(
        filePaths.introAudio,
        "audio"
      );
    }

    // Process conclusion audio
    if (filePaths.conclusionAudio) {
      processedFiles.conclusionAudio = await this.createFileMetadata(
        filePaths.conclusionAudio,
        "audio"
      );
    }

    // Process lesson files
    const maxLessons = Math.max(
      filePaths.images.length,
      filePaths.videos.length,
      filePaths.audioFiles.length
    );

    for (let i = 0; i < maxLessons; i++) {
      const lessonMultimedia = {
        lessonIndex: i,
        title: `Lesson ${i + 1}`,
        images: [] as IMultimediaFile[],
        videos: [] as IMultimediaFile[],
        audioFiles: [] as IMultimediaFile[],
        thumbnails: [] as IMultimediaFile[],
        captions: [],
      };

      // Process image for this lesson
      if (filePaths.images[i]) {
        const imageFile = await this.createFileMetadata(
          filePaths.images[i],
          "image"
        );
        lessonMultimedia.images.push(imageFile);
      }

      // Process video for this lesson
      if (filePaths.videos[i]) {
        const videoFile = await this.createFileMetadata(
          filePaths.videos[i],
          "video"
        );
        lessonMultimedia.videos.push(videoFile);
      }

      // Process audio for this lesson
      if (filePaths.audioFiles[i]) {
        const audioFile = await this.createFileMetadata(
          filePaths.audioFiles[i],
          "audio"
        );
        lessonMultimedia.audioFiles.push(audioFile);
      }

      processedFiles.lessons.push(lessonMultimedia);
    }

    return processedFiles;
  }

  /**
   * Create file metadata from file path
   */
  private async createFileMetadata(
    filePath: string,
    type: "image" | "video" | "audio"
  ): Promise<IMultimediaFile> {
    try {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filePath);

      const fileMetadata: IMultimediaFile = {
        filename: filename,
        originalName: filename,
        path: filePath,
        url: `/api/multimedia/files/${filename}`, // API endpoint for serving files
        mimetype: this.getMimeType(ext, type),
        size: stats.size,
        uploadedAt: new Date(),
      };

      // Add type-specific metadata
      if (type === "audio" || type === "video") {
        // For now, we'll set default duration - in production you'd use ffprobe
        fileMetadata.duration = 30; // Default 30 seconds
      }

      if (type === "image") {
        fileMetadata.metadata = {
          width: 1024,
          height: 768,
        };
      }

      if (type === "video") {
        fileMetadata.metadata = {
          width: 1920,
          height: 1080,
          fps: 30,
          codec: "h264",
        };
      }

      return fileMetadata;
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get MIME type based on file extension and type
   */
  private getMimeType(
    extension: string,
    type: "image" | "video" | "audio"
  ): string {
    const mimeTypes: { [key: string]: string } = {
      // Images
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",

      // Audio
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",

      // Video
      ".mp4": "video/mp4",
      ".avi": "video/avi",
      ".mov": "video/quicktime",
      ".webm": "video/webm",
    };

    return mimeTypes[extension.toLowerCase()] || `${type}/*`;
  }

  /**
   * Retrieve a multimedia training module by ID
   */
  async getMultimediaModule(
    moduleId: string
  ): Promise<IMultimediaTrainingModule | null> {
    try {
      const module = await MultimediaTrainingModule.findById(moduleId)
        .populate("createdBy", "name email")
        .exec();

      if (module) {
        // Update view count
        await module.updateAnalytics({
          viewCount: module.analytics.viewCount + 1,
        });
      }

      return module;
    } catch (error) {
      console.error("❌ Error retrieving module:", error);
      throw error;
    }
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
  ): Promise<{
    modules: IMultimediaTrainingModule[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const query: any = { status: "completed" };

      if (filters.userId) {
        query.createdBy = filters.userId;
      }

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.difficulty) {
        query.difficulty = filters.difficulty;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.isPublic !== undefined) {
        query.isPublic = filters.isPublic;
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const [modules, total] = await Promise.all([
        MultimediaTrainingModule.find(query)
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        MultimediaTrainingModule.countDocuments(query),
      ]);

      return {
        modules,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("❌ Error listing modules:", error);
      throw error;
    }
  }

  /**
   * Update module analytics
   */
  async updateModuleAnalytics(
    moduleId: string,
    analytics: Partial<IMultimediaTrainingModule["analytics"]>
  ): Promise<void> {
    try {
      const module = await MultimediaTrainingModule.findById(moduleId);
      if (module) {
        await module.updateAnalytics(analytics);
      }
    } catch (error) {
      console.error("❌ Error updating analytics:", error);
      throw error;
    }
  }

  /**
   * Delete a multimedia training module
   */
  async deleteMultimediaModule(
    moduleId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const module = await MultimediaTrainingModule.findOne({
        _id: moduleId,
        createdBy: userId,
      });

      if (!module) {
        return false;
      }

      // TODO: Delete associated files from storage
      // This would involve deleting files from the filesystem or cloud storage

      await MultimediaTrainingModule.findByIdAndDelete(moduleId);
      console.log(`✅ Module ${moduleId} deleted successfully`);

      return true;
    } catch (error) {
      console.error("❌ Error deleting module:", error);
      throw error;
    }
  }

  /**
   * Get storage statistics for a user
   */
  async getUserStorageStats(userId: string): Promise<{
    totalModules: number;
    totalStorageUsed: number;
    averageModuleSize: number;
    modulesByDifficulty: { [key: string]: number };
  }> {
    try {
      const modules = await MultimediaTrainingModule.find({
        createdBy: userId,
      });

      const stats = {
        totalModules: modules.length,
        totalStorageUsed: 0,
        averageModuleSize: 0,
        modulesByDifficulty: { beginner: 0, intermediate: 0, advanced: 0 },
      };

      modules.forEach((module) => {
        stats.totalStorageUsed += module.multimedia.totalStorageSize;
        stats.modulesByDifficulty[module.difficulty]++;
      });

      stats.averageModuleSize =
        stats.totalModules > 0
          ? stats.totalStorageUsed / stats.totalModules
          : 0;

      return stats;
    } catch (error) {
      console.error("❌ Error getting storage stats:", error);
      throw error;
    }
  }
}

export default MultimediaTrainingModuleRepository;
