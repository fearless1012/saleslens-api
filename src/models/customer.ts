import mongoose from "mongoose";

export interface ICustomer {
  name: string;
  company?: string;
  industry: string;
  position?: string;
  email?: string;
  phone?: string;
  contacts?: {
    name: string;
    position: string;
    email: string;
    phone: string;
  }[];
  notes?: string;
  requirements?: string;
  status: string; // Flexible status field - can be any string
  tags?: string[];
  revenue?: number; // Revenue generated in USD
  dateJoined?: Date;
  leaveDate?: Date;
  reasonForLeaving?: string;
  acquisitionSource?: string;
  customFields?: { [key: string]: any }; // Dynamic fields for various data formats
  originalData?: string; // Store original raw data for reference
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to normalize status values
export const normalizeStatus = (status: string): string => {
  if (!status) return "Unknown";

  const cleanStatus = status.toString().trim().toLowerCase();

  // Map common variations to standard values
  const statusMap: { [key: string]: string } = {
    active: "Active",
    inactive: "Inactive",
    current: "Active",
    former: "Inactive",
    churned: "Inactive",
    lost: "Inactive",
    prospect: "Prospect",
    lead: "Lead",
    trial: "Trial",
    cancelled: "Inactive",
    suspended: "Suspended",
    "on hold": "On Hold",
    onhold: "On Hold",
    pending: "Pending",
  };

  return (
    statusMap[cleanStatus] ||
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  );
};

// Helper function to parse and clean industry names
export const normalizeIndustry = (industry: string): string => {
  if (!industry) return "Other";

  const cleanIndustry = industry.toString().trim();

  // Common industry mappings
  const industryMap: { [key: string]: string } = {
    tech: "Technology",
    healthcare: "Healthcare",
    finance: "Financial Services",
    fintech: "Financial Services",
    edtech: "Education Technology",
    "e-commerce": "E-commerce",
    ecommerce: "E-commerce",
    manufacturing: "Manufacturing",
    retail: "Retail",
    "real estate": "Real Estate",
    realestate: "Real Estate",
  };

  const lowerIndustry = cleanIndustry.toLowerCase();
  return industryMap[lowerIndustry] || cleanIndustry;
};

// Helper function to parse revenue from various formats
export const parseRevenue = (revenue: any): number | undefined => {
  if (!revenue) return undefined;

  if (typeof revenue === "number") return revenue;

  // Handle string formats like "$125,000", "125k", "1.2M", etc.
  const revenueStr = revenue.toString().replace(/[\$,\s]/g, "");

  if (revenueStr.toLowerCase().includes("k")) {
    return parseFloat(revenueStr.replace(/k/i, "")) * 1000;
  }

  if (revenueStr.toLowerCase().includes("m")) {
    return parseFloat(revenueStr.replace(/m/i, "")) * 1000000;
  }

  const parsed = parseFloat(revenueStr);
  return isNaN(parsed) ? undefined : parsed;
};

const customerSchema = new mongoose.Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200, // Increased for longer names
    },
    company: {
      type: String,
      trim: true,
      maxlength: 200, // Increased for longer company names
    },
    industry: {
      type: String,
      required: true,
      trim: true,
      set: normalizeIndustry, // Auto-normalize industry names
    },
    position: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          // Only validate if email is provided
          if (!email) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 50, // Allow various phone number formats
    },
    contacts: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        position: {
          type: String,
          required: true,
          trim: true,
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        phone: {
          type: String,
          trim: true,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: 2000, // Increased for longer notes
    },
    requirements: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      set: normalizeStatus, // Auto-normalize status values
      default: "Unknown",
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
    revenue: {
      type: Number,
      min: 0,
      set: parseRevenue, // Auto-parse revenue from various formats
    },
    dateJoined: {
      type: Date,
    },
    leaveDate: {
      type: Date,
      validate: {
        validator: function (this: ICustomer, leaveDate: Date) {
          // Leave date should be after join date if both exist
          if (!leaveDate || !this.dateJoined) return true;
          return leaveDate >= this.dateJoined;
        },
        message: "Leave date must be after join date",
      },
    },
    reasonForLeaving: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    acquisitionSource: {
      type: String,
      trim: true,
      maxlength: 200,
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
customerSchema.index({ name: "text", company: "text", industry: "text" });

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
