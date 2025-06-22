import mongoose, { Schema, Document } from "mongoose";

// Interface for multimedia files
export interface IMultimediaFile {
  filename: string;
  originalName: string;
  path: string;
  url?: string;
  mimetype: string;
  size: number;
  duration?: number; // For audio/video files in seconds
  uploadedAt: Date;
  metadata?: {
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: number;
    codec?: string;
  };
}

// Interface for lesson multimedia content
export interface ILessonMultimedia {
  lessonIndex: number;
  title: string;
  images: IMultimediaFile[];
  videos: IMultimediaFile[];
  audioFiles: IMultimediaFile[];
  thumbnails?: IMultimediaFile[];
  captions?: {
    language: string;
    file: IMultimediaFile;
  }[];
}

// Interface for generation metadata
export interface IGenerationMetadata {
  generatedAt: Date;
  processingTime: number;
  llamaModel: string;
  stableDiffusionModel?: string;
  barkVoicePreset?: string;
  options: {
    includeImages: boolean;
    includeAudio: boolean;
    includeVideos: boolean;
    voicePreset: string;
    imageStyle: string;
    audioQuality: string;
    videoResolution: string;
  };
  apiUsage?: {
    llamaTokens?: number;
    stableDiffusionCalls?: number;
    barkAudioGenerated?: number;
    totalCost?: number;
  };
}

// Main multimedia training module interface
export interface IMultimediaTrainingModule extends Document {
  title: string;
  description: string;
  domainKnowledge: string;

  // Basic training module properties
  estimatedDuration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  keyTakeaways: string[];

  // Lesson content
  lessons: {
    title: string;
    content: string;
    duration: string;
    type: "theory" | "practical" | "assessment";
    resources: string[];
  }[];

  // Multimedia content
  multimedia: {
    introVideo?: IMultimediaFile;
    introAudio?: IMultimediaFile;
    conclusionVideo?: IMultimediaFile;
    conclusionAudio?: IMultimediaFile;
    lessons: ILessonMultimedia[];
    totalAudioDuration: number;
    totalVideoDuration: number;
    totalStorageSize: number;
  };

  // Metadata and tracking
  generationMetadata: IGenerationMetadata;

  // Database tracking
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: "generating" | "completed" | "failed" | "archived";

  // Usage analytics
  analytics: {
    viewCount: number;
    completionRate: number;
    averageRating: number;
    feedbackCount: number;
    lastAccessed?: Date;
  };

  // Organization
  tags: string[];
  category: string;
  isPublic: boolean;
  sharingPermissions: {
    users: mongoose.Types.ObjectId[];
    roles: string[];
    organizations: mongoose.Types.ObjectId[];
  };

  // Virtual properties
  totalFiles: number;

  // Methods
  calculateStorageUsage(): number;
  updateAnalytics(
    data: Partial<IMultimediaTrainingModule["analytics"]>
  ): Promise<IMultimediaTrainingModule>;
}

// Multimedia file schema
const MultimediaFileSchema = new Schema<IMultimediaFile>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  url: { type: String },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  duration: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  metadata: {
    width: { type: Number },
    height: { type: Number },
    fps: { type: Number },
    bitrate: { type: Number },
    codec: { type: String },
  },
});

// Lesson multimedia schema
const LessonMultimediaSchema = new Schema<ILessonMultimedia>({
  lessonIndex: { type: Number, required: true },
  title: { type: String, required: true },
  images: [MultimediaFileSchema],
  videos: [MultimediaFileSchema],
  audioFiles: [MultimediaFileSchema],
  thumbnails: [MultimediaFileSchema],
  captions: [
    {
      language: { type: String, required: true },
      file: MultimediaFileSchema,
    },
  ],
});

// Generation metadata schema
const GenerationMetadataSchema = new Schema<IGenerationMetadata>({
  generatedAt: { type: Date, default: Date.now },
  processingTime: { type: Number, required: true },
  llamaModel: { type: String, required: true },
  stableDiffusionModel: { type: String },
  barkVoicePreset: { type: String },
  options: {
    includeImages: { type: Boolean, required: true },
    includeAudio: { type: Boolean, required: true },
    includeVideos: { type: Boolean, required: true },
    voicePreset: { type: String, required: true },
    imageStyle: { type: String, required: true },
    audioQuality: { type: String, required: true },
    videoResolution: { type: String, required: true },
  },
  apiUsage: {
    llamaTokens: { type: Number },
    stableDiffusionCalls: { type: Number },
    barkAudioGenerated: { type: Number },
    totalCost: { type: Number },
  },
});

// Main multimedia training module schema
const MultimediaTrainingModuleSchema = new Schema<IMultimediaTrainingModule>(
  {
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    domainKnowledge: { type: String, required: true },

    // Basic training module properties
    estimatedDuration: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      index: true,
    },
    objectives: [{ type: String, required: true }],
    keyTakeaways: [{ type: String, required: true }],

    // Lesson content
    lessons: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        duration: { type: String, required: true },
        type: {
          type: String,
          enum: ["theory", "practical", "assessment"],
          required: true,
        },
        resources: [{ type: String }],
      },
    ],

    // Multimedia content
    multimedia: {
      introVideo: MultimediaFileSchema,
      introAudio: MultimediaFileSchema,
      conclusionVideo: MultimediaFileSchema,
      conclusionAudio: MultimediaFileSchema,
      lessons: [LessonMultimediaSchema],
      totalAudioDuration: { type: Number, default: 0 },
      totalVideoDuration: { type: Number, default: 0 },
      totalStorageSize: { type: Number, default: 0 },
    },

    // Metadata and tracking
    generationMetadata: GenerationMetadataSchema,

    // Database tracking
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["generating", "completed", "failed", "archived"],
      default: "generating",
      index: true,
    },

    // Usage analytics
    analytics: {
      viewCount: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      feedbackCount: { type: Number, default: 0 },
      lastAccessed: { type: Date },
    },

    // Organization
    tags: [{ type: String, index: true }],
    category: { type: String, required: true, index: true },
    isPublic: { type: Boolean, default: false, index: true },
    sharingPermissions: {
      users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      roles: [{ type: String }],
      organizations: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
    },
  },
  {
    timestamps: true,
    collection: "multimedia_training_modules",
  }
);

// Indexes for performance
MultimediaTrainingModuleSchema.index({ title: "text", description: "text" });
MultimediaTrainingModuleSchema.index({ createdBy: 1, status: 1 });
MultimediaTrainingModuleSchema.index({ category: 1, difficulty: 1 });
MultimediaTrainingModuleSchema.index({ tags: 1 });
MultimediaTrainingModuleSchema.index({ "analytics.lastAccessed": -1 });

// Virtual for total file count
MultimediaTrainingModuleSchema.virtual("totalFiles").get(function () {
  let count = 0;
  if (this.multimedia.introVideo) count++;
  if (this.multimedia.introAudio) count++;
  if (this.multimedia.conclusionVideo) count++;
  if (this.multimedia.conclusionAudio) count++;

  this.multimedia.lessons.forEach((lesson) => {
    count += lesson.images.length;
    count += lesson.videos.length;
    count += lesson.audioFiles.length;
    count += lesson.thumbnails?.length || 0;
    count += lesson.captions?.length || 0;
  });

  return count;
});

// Method to calculate storage usage
MultimediaTrainingModuleSchema.methods.calculateStorageUsage = function () {
  let totalSize = 0;

  if (this.multimedia.introVideo) totalSize += this.multimedia.introVideo.size;
  if (this.multimedia.introAudio) totalSize += this.multimedia.introAudio.size;
  if (this.multimedia.conclusionVideo)
    totalSize += this.multimedia.conclusionVideo.size;
  if (this.multimedia.conclusionAudio)
    totalSize += this.multimedia.conclusionAudio.size;

  this.multimedia.lessons.forEach((lesson: ILessonMultimedia) => {
    lesson.images.forEach((file) => (totalSize += file.size));
    lesson.videos.forEach((file) => (totalSize += file.size));
    lesson.audioFiles.forEach((file) => (totalSize += file.size));
    lesson.thumbnails?.forEach((file) => (totalSize += file.size));
    lesson.captions?.forEach((caption) => (totalSize += caption.file.size));
  });

  this.multimedia.totalStorageSize = totalSize;
  return totalSize;
};

// Method to update analytics
MultimediaTrainingModuleSchema.methods.updateAnalytics = function (
  data: Partial<IMultimediaTrainingModule["analytics"]>
) {
  Object.assign(this.analytics, data);
  this.analytics.lastAccessed = new Date();
  return this.save();
};

// Static method to find by category
MultimediaTrainingModuleSchema.statics.findByCategory = function (
  category: string
) {
  return this.find({ category, status: "completed" });
};

// Static method to find popular modules
MultimediaTrainingModuleSchema.statics.findPopular = function (
  limit: number = 10
) {
  return this.find({ status: "completed" })
    .sort({ "analytics.viewCount": -1, "analytics.averageRating": -1 })
    .limit(limit);
};

export const MultimediaTrainingModule =
  mongoose.model<IMultimediaTrainingModule>(
    "MultimediaTrainingModule",
    MultimediaTrainingModuleSchema
  );

export default MultimediaTrainingModule;
