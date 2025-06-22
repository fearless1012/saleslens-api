import mongoose from "mongoose";

interface IProgress {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  status: string;
  completedAt?: Date;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new mongoose.Schema<IProgress>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completedAt: {
      type: Date,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique progress entries
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>("Progress", progressSchema);
