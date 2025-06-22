import express, { Router, Request, Response } from "express";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { llamaIntegrationService } from "../services/llamaIntegrationService";
import { Customer } from "../models/customer";
import { Pitch } from "../models/pitch";
import { DomainKnowledge } from "../models/domainKnowledge";
import Joi from "joi";

const router: Router = express.Router();

// Validation schema for transcript generation
const generateTranscriptSchema = Joi.object({
  customerProfile: Joi.string().required().min(10).max(2000),
  includeHistoricalData: Joi.boolean().default(true),
  industryFocus: Joi.string().optional(),
  specificProducts: Joi.array().items(Joi.string()).optional(),
  pitchType: Joi.string()
    .valid("discovery", "demo", "proposal", "closing")
    .default("discovery"),
});

/**
 * @route   POST /api/transcripts/generate
 * @desc    Generate a sales pitch transcript using LLaMA AI
 * @access  Private
 */
router.post(
  "/generate",
  auth,
  validateRequest(generateTranscriptSchema),
  async (req: Request, res: Response) => {
    try {
      console.log("🎯 Starting transcript generation for user:", req.user.id);

      const {
        customerProfile,
        includeHistoricalData,
        industryFocus,
        specificProducts,
        pitchType,
      } = req.body;

      // Test LLaMA service availability first
      console.log("🔍 Testing LLaMA service availability...");
      const isLlamaAvailable =
        await llamaIntegrationService.validateConfiguration();
      if (!isLlamaAvailable) {
        console.warn("⚠️  LLaMA service not available, but proceeding...");
      }

      // Get historical pitch data for context
      let historicalPitches = "";
      if (includeHistoricalData) {
        try {
          console.log("📊 Loading historical pitches...");
          const recentPitches = await Pitch.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("customer", "name company industry");

          historicalPitches = recentPitches
            .map((pitch) => {
              const customer = pitch.customer as any;
              return `
Previous Successful Pitch:
Customer: ${customer?.name || "Unknown"} at ${
                customer?.company || "Unknown Company"
              }
Industry: ${customer?.industry || "Unknown"}
Title: ${pitch.title}
Key Points: ${pitch.description || "No description available"}
Outcome: ${pitch.status || "Unknown"}
---`;
            })
            .join("\n");

          console.log(`✅ Loaded ${recentPitches.length} historical pitches`);
        } catch (error) {
          console.warn("⚠️  Failed to load historical pitches:", error);
        }
      }

      // Get relevant domain knowledge
      let domainKnowledgeContext = "";
      if (industryFocus) {
        try {
          console.log(
            `🧠 Loading domain knowledge for industry: ${industryFocus}...`
          );
          const relevantKnowledge = await DomainKnowledge.find({
            $or: [
              { title: new RegExp(industryFocus, "i") },
              { description: new RegExp(industryFocus, "i") },
              { tags: { $in: [industryFocus] } },
            ],
          }).limit(3);

          domainKnowledgeContext = relevantKnowledge
            .map((knowledge) => {
              return `
Domain Knowledge:
Title: ${knowledge.title}
Description: ${knowledge.description}
Category: ${knowledge.category}
---`;
            })
            .join("\n");

          console.log(
            `✅ Loaded ${relevantKnowledge.length} domain knowledge items`
          );
        } catch (error) {
          console.warn("⚠️  Failed to load domain knowledge:", error);
        }
      }

      // Build the system prompt for transcript generation
      const systemPrompt = `You are an expert sales coach and transcript generator. Your task is to create realistic, successful sales pitch transcripts based on customer profiles and historical data.

Guidelines:
1. Create a natural conversation between a sales representative (Alex) and the customer
2. The conversation should feel authentic and demonstrate best sales practices
3. Include discovery questions, value proposition, objection handling, and closing techniques
4. The transcript should be 8-12 exchanges long
5. Show progression from introduction to successful outcome
6. Use industry-specific language when appropriate
7. Demonstrate active listening and consultative selling

The generated transcript should serve as a training example for sales representatives.`;

      const userPrompt = `Generate a successful sales pitch transcript based on the following information:

CUSTOMER PROFILE:
${customerProfile}

PITCH TYPE: ${pitchType}

${industryFocus ? `INDUSTRY FOCUS: ${industryFocus}` : ""}

${
  specificProducts && specificProducts.length > 0
    ? `SPECIFIC PRODUCTS TO MENTION: ${specificProducts.join(", ")}`
    : ""
}

${
  historicalPitches
    ? `
HISTORICAL SUCCESS EXAMPLES FOR REFERENCE:
${historicalPitches}
`
    : ""
}

${
  domainKnowledgeContext
    ? `
RELEVANT DOMAIN KNOWLEDGE:
${domainKnowledgeContext}
`
    : ""
}

Please generate a realistic sales conversation transcript that demonstrates:
1. Proper discovery and qualification
2. Clear value proposition alignment
3. Professional objection handling
4. Natural conversation flow
5. Successful closing techniques

Format the output as a conversation with speaker names (Alex: and [Customer Name]:) on separate lines.`;

      // Process the request using LLaMA
      console.log("🚀 Calling LLaMA integration service...");
      const result = await llamaIntegrationService.processRequest({
        templateName: "transcript_generation",
        userId: req.user.id,
        customVariables: {
          systemPrompt,
          userPrompt,
          customerProfile,
          pitchType,
          industryFocus,
          specificProducts,
        },
        options: {
          model: "llama-3.3-70b-instruct",
          maxTokens: 2500,
          temperature: 0.8,
        },
      });

      // Parse the generated transcript
      const generatedTranscript = result.response;

      if (!generatedTranscript || generatedTranscript.trim().length < 100) {
        throw new Error("Generated transcript is too short or empty");
      }

      // Save the generated transcript for future reference
      const transcriptRecord = {
        customerProfile,
        generatedTranscript,
        pitchType,
        industryFocus,
        specificProducts,
        generatedBy: req.user.id,
        metadata: {
          model: result.metadata.model,
          tokens: result.metadata.totalTokens,
          processingTime: result.metadata.processingTime,
        },
        createdAt: new Date(),
      };

      console.log("✅ Transcript generated successfully:", {
        length: generatedTranscript.length,
        processingTime: result.metadata.processingTime,
        model: result.metadata.model,
      });

      res.status(200).json({
        status: "success",
        data: {
          transcript: generatedTranscript,
          metadata: transcriptRecord.metadata,
          customerProfile,
          pitchType,
        },
      });
    } catch (error: any) {
      console.error("❌ Transcript generation error:", error);

      // More detailed error handling
      if (error.message && error.message.includes("LLAMA_API_KEY")) {
        return res.status(500).json({
          status: "error",
          message:
            "LLaMA API configuration is missing or invalid. Please check your API key.",
          details:
            "The LLaMA API key is not properly configured in the environment variables.",
        });
      }

      if (error.message && error.message.includes("LLaMA API Error")) {
        return res.status(500).json({
          status: "error",
          message: "LLaMA API service error",
          details: error.message,
        });
      }

      if (error.message && error.message.includes("Template")) {
        return res.status(500).json({
          status: "error",
          message: "Template processing error",
          details: error.message,
        });
      }

      res.status(500).json({
        status: "error",
        message: error.message || "Failed to generate transcript",
        details: error.stack ? error.stack.split("\n")[0] : "Unknown error",
      });
    }
  }
);

/**
 * @route   GET /api/transcripts/history
 * @desc    Get previously generated transcripts
 * @access  Private
 */
router.get("/history", auth, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // For now, return recent pitches as history
    // In a full implementation, you'd have a separate transcripts collection
    const recentPitches = await Pitch.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("customer", "name company industry");

    const total = await Pitch.countDocuments({});

    const formattedHistory = recentPitches.map((pitch) => ({
      id: pitch._id,
      customerProfile: `${(pitch.customer as any)?.name || "Unknown"} at ${
        (pitch.customer as any)?.company || "Unknown Company"
      }`,
      title: pitch.title,
      industry: (pitch.customer as any)?.industry || "Unknown",
      createdAt: pitch.createdAt,
      status: pitch.status,
    }));

    res.status(200).json({
      status: "success",
      data: {
        transcripts: formattedHistory,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching transcript history:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/transcripts/test-connection
 * @desc    Test LLaMA API connection
 * @access  Private
 */
router.get("/test-connection", auth, async (req: Request, res: Response) => {
  try {
    console.log("🔍 Testing LLaMA connection...");
    const isConnected = await llamaIntegrationService.validateConfiguration();

    res.status(200).json({
      status: "success",
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString(),
        message: isConnected
          ? "LLaMA API is working properly"
          : "LLaMA API connection failed",
      },
    });
  } catch (error: any) {
    console.error("❌ Connection test failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to test connection",
      details: error.message,
    });
  }
});

export default router;
