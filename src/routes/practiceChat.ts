import express, { Router, Request, Response } from "express";
// import { auth } from "../middleware/auth"; // Authentication removed for practice endpoints
import { validateRequest } from "../middleware/validateRequest";
import { llamaService } from "../services/llamaService";
import { Customer } from "../models/customer";
import { Pitch } from "../models/pitch";
import { DomainKnowledge } from "../models/domainKnowledge";
import Joi from "joi";

const router: Router = express.Router();

// Validation schemas
const chatRequestSchema = Joi.object({
  message: Joi.string().required(),
  customerProfile: Joi.string().required(),
  conversationHistory: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("user", "assistant").required(),
        content: Joi.string().required(),
      })
    )
    .optional(),
  industryFocus: Joi.string().optional(),
  specificProducts: Joi.array().items(Joi.string()).optional(),
  pitchType: Joi.string()
    .valid("discovery", "demo", "proposal", "closing")
    .optional(),
});

// Validation schema for sentiment analysis
const sentimentRequestSchema = Joi.object({
  message: Joi.string().required(),
  context: Joi.object({
    customerProfile: Joi.string().optional(),
    industryFocus: Joi.string().optional(),
    pitchType: Joi.string()
      .valid("discovery", "demo", "proposal", "closing")
      .optional(),
  }).optional(),
});

/**
 * @route   POST /api/practice-chat/respond
 * @desc    Generate AI response as customer using RAG on uploaded data
 * @access  Public (Authentication removed for practice)
 */
router.post(
  "/respond",
  validateRequest(chatRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        message,
        customerProfile,
        conversationHistory = [],
        industryFocus,
        specificProducts = [],
        pitchType = "discovery",
      } = req.body;

      console.log("🎯 Starting practice chat response generation...");

      // Build context from uploaded data using RAG (public access for practice)
      const context = await buildRAGContext(
        customerProfile,
        industryFocus,
        specificProducts
      );

      // Create system prompt for customer persona
      const systemPrompt = createCustomerPersonaPrompt(
        customerProfile,
        context,
        pitchType,
        industryFocus,
        specificProducts
      );

      // Prepare conversation messages
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: message },
      ];

      console.log("🚀 Calling LLaMA for customer response...");

      // Generate response using LLaMA
      const response = await llamaService.generateText(
        `${systemPrompt}\n\nUser message: ${message}`,
        {
          maxTokens: 500,
          temperature: 0.8,
        }
      );

      console.log("✅ Customer response generated successfully");

      res.status(200).json({
        status: "success",
        data: {
          response: response,
          context: {
            customers: context.customers.length,
            pitches: context.pitches.length,
            domainKnowledge: context.domainKnowledge.length,
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Error generating customer response:", error);

      // Fallback to mock response
      const fallbackResponse = generateFallbackCustomerResponse(
        req.body.message,
        req.body.pitchType
      );

      res.status(200).json({
        status: "success",
        data: {
          response: fallbackResponse,
          context: {
            customers: 0,
            pitches: 0,
            domainKnowledge: 0,
          },
          fallback: true,
        },
      });
    }
  }
);

/**
 * @route   POST /api/practice-chat/sentiment-analysis
 * @desc    Analyze sentiment of user's sales message
 * @access  Public (Authentication removed for practice)
 */
router.post(
  "/sentiment-analysis",
  validateRequest(sentimentRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { message, context = {} } = req.body;

      // Create a specialized prompt for sentiment analysis in sales context
      const sentimentPrompt = `You are an expert sales coach and sentiment analyst. Analyze the following sales message for emotional indicators that would affect customer perception.

Message to analyze: "${message}"

${context.customerProfile ? `Customer context: ${context.customerProfile}` : ""}
${context.industryFocus ? `Industry: ${context.industryFocus}` : ""}
${context.pitchType ? `Sales stage: ${context.pitchType}` : ""}

Analyze this message and provide sentiment scores (0-100) for these specific sales-relevant emotions:

1. **Anxiety/Nervousness** - Signs of uncertainty, hesitation, or pressure
2. **Confidence/Enthusiasm** - Signs of assurance, positivity, and belief in the product
3. **Doubt/Skepticism** - Signs of questioning, uncertainty about claims, or hesitation

Return ONLY a JSON object in this exact format:
{
  "anxiety": <number>,
  "confidence": <number>,
  "doubt": <number>,
  "analysis": "<brief explanation of the sentiment indicators found>"
}

Consider these sales communication factors:
- Confidence in language and tone
- Use of uncertain vs. assertive phrases
- Evidence of preparation vs. improvisation
- Customer-focused vs. product-focused language
- Presence of filler words or hesitation markers`;

      console.log("🎭 Analyzing sentiment for message:", {
        messageLength: message.length,
        hasContext: Object.keys(context).length > 0,
      });

      const sentimentResponse = await llamaService.generateText(
        sentimentPrompt,
        {
          maxTokens: 500,
          temperature: 0.3, // Lower temperature for more consistent analysis
          systemPrompt:
            "You are a precise sales sentiment analysis AI. Return only valid JSON responses.",
        }
      );

      console.log("🎭 Raw sentiment analysis response:", sentimentResponse);

      // Parse the JSON response
      let sentimentData;
      try {
        // Extract JSON from the response if it's wrapped in markdown or other text
        const jsonMatch = sentimentResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : sentimentResponse;
        sentimentData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("❌ Error parsing sentiment analysis JSON:", parseError);

        // Fallback to default sentiment values
        sentimentData = {
          anxiety: 30,
          confidence: 65,
          doubt: 25,
          analysis:
            "Unable to parse detailed sentiment analysis. Using default values based on message length and basic indicators.",
        };
      }

      // Validate and normalize the sentiment scores
      const normalizedSentiment = {
        anxiety: Math.max(0, Math.min(100, sentimentData.anxiety || 30)),
        confidence: Math.max(0, Math.min(100, sentimentData.confidence || 65)),
        doubt: Math.max(0, Math.min(100, sentimentData.doubt || 25)),
        analysis:
          sentimentData.analysis ||
          "Sentiment analysis completed successfully.",
      };

      console.log("✅ Sentiment analysis completed:", normalizedSentiment);

      res.json({
        status: "success",
        data: {
          sentiment: normalizedSentiment,
          originalMessage: message,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("❌ Error in sentiment analysis:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to analyze sentiment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * Build RAG context from uploaded data
 */
async function buildRAGContext(
  customerProfile: string,
  industryFocus?: string,
  specificProducts: string[] = []
) {
  try {
    console.log("🔍 Building RAG context from uploaded data...");

    // Get relevant customer profiles (public access for practice)
    const customers = await Customer.find({
      $or: [
        { profile: { $regex: industryFocus || "", $options: "i" } },
        { industry: { $regex: industryFocus || "", $options: "i" } },
        { companySize: { $regex: customerProfile, $options: "i" } },
      ],
    }).limit(5);

    // Get relevant sales pitches (public access for practice)
    const pitches = await Pitch.find({
      $or: [
        { transcript: { $regex: industryFocus || "", $options: "i" } },
        { tags: { $in: specificProducts } },
        { customerInfo: { $regex: customerProfile, $options: "i" } },
      ],
    }).limit(10);

    // Get relevant domain knowledge (public access for practice)
    const domainKnowledge = await DomainKnowledge.find({
      $or: [
        { content: { $regex: industryFocus || "", $options: "i" } },
        { title: { $regex: industryFocus || "", $options: "i" } },
        { tags: { $in: specificProducts } },
      ],
    }).limit(8);

    console.log("📊 RAG context built:", {
      customers: customers.length,
      pitches: pitches.length,
      domainKnowledge: domainKnowledge.length,
    });

    return {
      customers,
      pitches,
      domainKnowledge,
    };
  } catch (error) {
    console.error("❌ Error building RAG context:", error);
    return {
      customers: [],
      pitches: [],
      domainKnowledge: [],
    };
  }
}

/**
 * Create system prompt for customer persona using RAG context
 */
function createCustomerPersonaPrompt(
  customerProfile: string,
  context: any,
  pitchType: string,
  industryFocus?: string,
  specificProducts: string[] = []
): string {
  let contextInfo = "";

  // Add customer context
  if (context.customers.length > 0) {
    contextInfo += "\n\nRelevant customer information from database:\n";
    context.customers.forEach((customer: any, index: number) => {
      contextInfo += `${index + 1}. ${
        customer.profile || customer.companyName
      } - ${customer.industry || "Unknown industry"}\n`;
    });
  }

  // Add pitch context
  if (context.pitches.length > 0) {
    contextInfo += "\n\nRelevant sales conversations from database:\n";
    context.pitches.forEach((pitch: any, index: number) => {
      contextInfo += `${index + 1}. ${pitch.transcript?.substring(
        0,
        200
      )}...\n`;
    });
  }

  // Add domain knowledge
  if (context.domainKnowledge.length > 0) {
    contextInfo += "\n\nRelevant domain knowledge:\n";
    context.domainKnowledge.forEach((knowledge: any, index: number) => {
      contextInfo += `${index + 1}. ${
        knowledge.title
      }: ${knowledge.content?.substring(0, 150)}...\n`;
    });
  }

  return `You are roleplaying as a potential customer based on this profile: ${customerProfile}

Industry Focus: ${industryFocus || "General business"}
Sales Stage: ${pitchType}
Products/Services of Interest: ${
    specificProducts.join(", ") || "General solutions"
  }

${contextInfo}

Instructions for your customer persona:
1. Respond authentically as this customer would, considering their industry, company size, and needs
2. Use the context information above to inform your responses with realistic business scenarios
3. Show appropriate skepticism, interest, or concerns that this type of customer would have
4. Ask relevant questions that demonstrate you understand the business challenges
5. Reference real business concerns from your industry when appropriate
6. Vary your responses based on the sales stage (${pitchType})
7. Keep responses conversational and realistic (100-300 words typically)

Remember: You are the customer, not the salesperson. React naturally to what the salesperson says.`;
}

/**
 * Generate fallback customer response when AI is unavailable
 */
function generateFallbackCustomerResponse(
  message: string,
  pitchType: string
): string {
  const responses = {
    discovery: [
      "That's interesting. Can you tell me more about how this specifically addresses our industry challenges?",
      "I appreciate the overview. What makes your solution different from what we're currently using?",
      "Thanks for the information. I'd like to understand the implementation process better.",
      "This sounds promising, but I need to understand the total cost of ownership.",
    ],
    demo: [
      "The demo was helpful. How would this integrate with our existing systems?",
      "I can see the potential benefits. What kind of training would our team need?",
      "This looks comprehensive. Can you show me how it handles our specific use case?",
      "Impressive features. What's the typical timeline for getting this fully operational?",
    ],
    proposal: [
      "The proposal looks comprehensive. What's the timeline for implementation?",
      "I'll need to get approval from my team. Can you help me build the business case?",
      "This seems like a significant investment. Can you provide references from similar companies?",
    ],
    closing: [
      "I'm interested, but I need to discuss this with my team first. What's the next step?",
      "The pricing seems reasonable, but I need to make sure we have budget approval.",
      "This looks like a good fit. Can we discuss the contract terms?",
      "I'm ready to move forward, but I have a few questions about the implementation timeline.",
    ],
  };

  const typeResponses =
    responses[pitchType as keyof typeof responses] || responses.discovery;
  return typeResponses[Math.floor(Math.random() * typeResponses.length)];
}

export default router;
