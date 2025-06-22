import mongoose from "mongoose";

interface ISimulation {
  title: string;
  description: string;
  scenario: string;
  difficulty: string;
  clientProfile: {
    name: string;
    company: string;
    industry: string;
    role: string;
    needs: string[];
    challenges: string[];
  };
  llamaModel: string;
  featuresHighlight: string[];
  createdBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const simulationSchema = new mongoose.Schema<ISimulation>(
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
    scenario: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    clientProfile: {
      name: { type: String, required: true },
      company: { type: String, required: true },
      industry: { type: String, required: true },
      role: { type: String, required: true },
      needs: [{ type: String }],
      challenges: [{ type: String }],
    },
    llamaModel: {
      type: String,
      required: true,
    },
    featuresHighlight: [
      {
        type: String,
      },
    ],
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

export const Simulation = mongoose.model<ISimulation>(
  "Simulation",
  simulationSchema
);
