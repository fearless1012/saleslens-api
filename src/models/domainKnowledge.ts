import mongoose from "mongoose";

export interface IDomainKnowledge {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  category: string;
  tags: string[];
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const domainKnowledgeSchema = new mongoose.Schema<IDomainKnowledge>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["product", "technical", "sales", "marketing", "other"],
    },
    tags: {
      type: [String],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Create text index for better search functionality
domainKnowledgeSchema.index(
  { title: "text", description: "text", category: "text" },
  { name: "domain_knowledge_text_index" }
);

export const DomainKnowledge = mongoose.model<IDomainKnowledge>(
  "DomainKnowledge",
  domainKnowledgeSchema
);
