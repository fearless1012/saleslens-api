import mongoose from "mongoose";

interface ILesson {
  title: string;
  description: string;
  content: string;
  moduleId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  type: string;
  videoUrl?: string;
  attachments?: string[];
  duration: number;
  order: number;
  createdBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new mongoose.Schema<ILesson>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "video", "quiz", "assignment"],
      default: "text",
    },
    videoUrl: {
      type: String,
    },
    attachments: {
      type: [String],
    },
    duration: {
      type: Number,
      required: true,
      min: 0, // Duration in minutes
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
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

export const Lesson = mongoose.model<ILesson>("Lesson", lessonSchema);
