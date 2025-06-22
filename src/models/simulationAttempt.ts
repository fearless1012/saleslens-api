import mongoose from "mongoose";

interface ISimulationAttempt {
  userId: mongoose.Types.ObjectId;
  simulationId: mongoose.Types.ObjectId;
  transcript: {
    messages: {
      role: string;
      content: string;
      timestamp: Date;
    }[];
  };
  score?: number;
  feedback: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const simulationAttemptSchema = new mongoose.Schema<ISimulationAttempt>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    simulationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Simulation",
      required: true,
    },
    transcript: {
      messages: [
        {
          role: {
            type: String,
            enum: ["client", "salesperson", "system"],
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
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

export const SimulationAttempt = mongoose.model<ISimulationAttempt>(
  "SimulationAttempt",
  simulationAttemptSchema
);
