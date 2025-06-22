import mongoose from "mongoose";

export interface IActivity {
  action: string;
  entityType: string; // 'domain', 'customer', 'pitch'
  entityId: mongoose.Types.ObjectId;
  description: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const activitySchema = new mongoose.Schema<IActivity>(
  {
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "view", "upload", "download"],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["domain", "customer", "pitch"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
    },
    description: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // We only need createdAt for activities
);

// Index for better performance on dashboard queries
activitySchema.index({ createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
