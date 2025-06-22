import mongoose from "mongoose";

export interface IPitch {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  customer: mongoose.Types.ObjectId; // Reference to customer
  industry: string;
  successRate: number; // Success rate percentage
  status: string;
  category: string;
  feedbackNotes: string;
  tags: string[];
  callResult?: string; // e.g., "Successful Sale", "Failed Sale"
  salesRep?: string; // Sales representative name
  customFields?: { [key: string]: any }; // Dynamic fields for various data formats
  originalData?: string; // Store original raw data for reference
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to normalize pitch status values
export const normalizePitchStatus = (status: string): string => {
  if (!status) return "Draft";

  const cleanStatus = status.toString().trim().toLowerCase();

  // Map common variations to standard values
  const statusMap: { [key: string]: string } = {
    active: "Active",
    draft: "Draft",
    presented: "Presented",
    successful: "Successful",
    "successful sale": "Successful",
    failed: "Failed",
    "failed sale": "Failed",
    unsuccessful: "Failed",
    pending: "Pending",
    "in progress": "In Progress",
    feedback: "Feedback",
    "follow up": "Follow Up",
    closed: "Closed",
    won: "Successful",
    lost: "Failed",
  };

  return (
    statusMap[cleanStatus] ||
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  );
};

// Helper function to normalize pitch category values
export const normalizePitchCategory = (category: string): string => {
  if (!category) return "Other";

  const cleanCategory = category.toString().trim().toLowerCase();

  // Map common variations to standard values
  const categoryMap: { [key: string]: string } = {
    product: "Product",
    service: "Service",
    solution: "Solution",
    partnership: "Partnership",
    other: "Other",
    analytics: "Analytics",
    "ai model": "AI Model",
    "ai solution": "AI Solution",
    "customer analytics": "Analytics",
    "supply chain": "Solution",
    "clinical data": "Analytics",
    "content generation": "AI Model",
    "fraud detection": "Security",
    security: "Security",
    platform: "Platform",
    suite: "Platform",
  };

  return (
    categoryMap[cleanCategory] ||
    category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
  );
};

const pitchSchema = new mongoose.Schema<IPitch>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200, // Increased for longer titles
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000, // Increased for longer descriptions
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
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      set: normalizePitchStatus, // Auto-normalize status values
      default: "Draft",
    },
    category: {
      type: String,
      required: true,
      trim: true,
      set: normalizePitchCategory, // Auto-normalize category values
    },
    feedbackNotes: {
      type: String,
      trim: true,
      maxlength: 2000, // Increased for longer feedback
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 20; // Reasonable limit
        },
        message: "Maximum 20 tags allowed",
      },
    },
    callResult: {
      type: String,
      trim: true, // e.g., "Successful Sale", "Failed Sale"
    },
    salesRep: {
      type: String,
      trim: true,
      maxlength: 100, // Sales representative name
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed, // Allow any additional fields
      default: {},
    },
    originalData: {
      type: String, // Store original raw data for reference
      maxlength: 5000,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    // Allow additional fields not defined in schema
    strict: false,
  }
);

// Index for better search performance
pitchSchema.index({ title: "text", description: "text", industry: "text" });

export const Pitch = mongoose.model<IPitch>("Pitch", pitchSchema);
