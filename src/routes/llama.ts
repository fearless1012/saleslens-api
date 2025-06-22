import express, { Router, Request, Response } from "express";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { llamaIntegrationService } from "../services/llamaIntegrationService";
import { promptTemplateEngine } from "../services/promptTemplateService";
import { fileProcessorService } from "../services/fileProcessorService";
import Joi from "joi";

const router: Router = express.Router();

// Validation schemas
const processRequestSchema = Joi.object({
  templateName: Joi.string().required(),
  fileId: Joi.string().optional(),
  pitchId: Joi.string().optional(),
  customerId: Joi.string().optional(),
  domainKnowledgeId: Joi.string().optional(),
  customVariables: Joi.object().optional(),
  options: Joi.object({
    model: Joi.string().optional(),
    maxTokens: Joi.number().min(1).max(4000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    stream: Joi.boolean().optional(),
  }).optional(),
});

const templateSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string()
    .valid(
      "analysis",
      "generation",
      "extraction",
      "summarization",
      "classification",
      "custom"
    )
    .required(),
  systemPrompt: Joi.string().required(),
  userPrompt: Joi.string().required(),
  variables: Joi.array().items(Joi.string()).required(),
  model: Joi.string().optional(),
  maxTokens: Joi.number().min(1).max(4000).optional(),
  temperature: Joi.number().min(0).max(2).optional(),
  examples: Joi.array().items(Joi.object()).optional(),
});

/**
 * @route   POST /api/llama/process
 * @desc    Process a request using LLaMA with templates
 * @access  Private
 */
router.post(
  "/process",
  auth,
  validateRequest(processRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const request = {
        ...req.body,
        userId: req.user.id,
      };

      const result = await llamaIntegrationService.processRequest(request);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error: any) {
      console.error("LLaMA processing error:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/llama/process/stream
 * @desc    Process a request using LLaMA with streaming response
 * @access  Private
 */
router.post(
  "/process/stream",
  auth,
  validateRequest(processRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const request = {
        ...req.body,
        userId: req.user.id,
      };

      // Set up Server-Sent Events
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      await llamaIntegrationService.processRequestStream(request, {
        onStart: () => {
          res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);
        },
        onChunk: (chunk: string) => {
          res.write(
            `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`
          );
        },
        onComplete: (result) => {
          res.write(
            `data: ${JSON.stringify({ type: "complete", result })}\n\n`
          );
          res.write(`data: ${JSON.stringify({ type: "end" })}\n\n`);
          res.end();
        },
        onError: (error) => {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: error.message,
            })}\n\n`
          );
          res.end();
        },
      });
    } catch (error: any) {
      console.error("LLaMA streaming error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
      );
      res.end();
    }
  }
);

/**
 * @route   GET /api/llama/templates
 * @desc    Get all available prompt templates
 * @access  Private
 */
router.get("/templates", auth, async (req: Request, res: Response) => {
  try {
    const templates = llamaIntegrationService.getAvailableTemplates();

    res.status(200).json({
      status: "success",
      data: templates,
    });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/llama/templates/:name
 * @desc    Get a specific template
 * @access  Private
 */
router.get("/templates/:name", auth, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const template = llamaIntegrationService.getTemplate(name);

    if (!template) {
      return res.status(404).json({
        status: "error",
        message: "Template not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: template,
    });
  } catch (error: any) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/llama/templates
 * @desc    Create a new prompt template
 * @access  Private
 */
router.post(
  "/templates",
  auth,
  validateRequest(templateSchema),
  async (req: Request, res: Response) => {
    try {
      const template = req.body;
      await promptTemplateEngine.saveTemplate(template);

      res.status(201).json({
        status: "success",
        message: "Template created successfully",
        data: template,
      });
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/llama/templates/:name
 * @desc    Update an existing template
 * @access  Private
 */
router.put(
  "/templates/:name",
  auth,
  validateRequest(templateSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const template = { ...req.body, name };

      await promptTemplateEngine.saveTemplate(template);

      res.status(200).json({
        status: "success",
        message: "Template updated successfully",
        data: template,
      });
    } catch (error: any) {
      console.error("Error updating template:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/llama/templates/:name
 * @desc    Delete a template
 * @access  Private
 */
router.delete("/templates/:name", auth, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await promptTemplateEngine.deleteTemplate(name);

    res.status(200).json({
      status: "success",
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/llama/suggest-template
 * @desc    Suggest the best template for a file
 * @access  Private
 */
router.post("/suggest-template", auth, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        status: "error",
        message: "fileId is required",
      });
    }

    const suggestion = await llamaIntegrationService.suggestTemplate(fileId);

    res.status(200).json({
      status: "success",
      data: suggestion,
    });
  } catch (error: any) {
    console.error("Error suggesting template:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/llama/validate-context
 * @desc    Validate template context against available data
 * @access  Private
 */
router.post("/validate-context", auth, async (req: Request, res: Response) => {
  try {
    const {
      templateName,
      fileId,
      pitchId,
      customerId,
      domainKnowledgeId,
      customVariables,
    } = req.body;

    if (!templateName) {
      return res.status(400).json({
        status: "error",
        message: "templateName is required",
      });
    }

    // Build a mock context to validate
    const context: any = {
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: "validation",
        source: "validation",
      },
      customVariables: customVariables || {},
    };

    if (fileId)
      context.file = {
        title: "test",
        content: "test",
        fileName: "test",
        fileType: "test",
        fileSize: 0,
      };
    if (pitchId) context.pitch = {};
    if (customerId) context.customer = {};
    if (domainKnowledgeId) context.domainKnowledge = {};

    const validation = promptTemplateEngine.validateTemplateContext(
      templateName,
      context
    );

    res.status(200).json({
      status: "success",
      data: validation,
    });
  } catch (error: any) {
    console.error("Error validating context:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/llama/file/estimate/:fileId
 * @desc    Get processing estimate for a file
 * @access  Private
 */
router.get(
  "/file/estimate/:fileId",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;

      // Try to find the file in database
      const { Pitch } = require("../models/pitch");
      const { DomainKnowledge } = require("../models/domainKnowledge");

      let fileRecord = await Pitch.findById(fileId);
      if (!fileRecord) {
        fileRecord = await DomainKnowledge.findById(fileId);
      }

      if (!fileRecord) {
        return res.status(404).json({
          status: "error",
          message: "File not found",
        });
      }

      const estimate = await fileProcessorService.getProcessingEstimate(
        fileRecord.fileUrl
      );

      res.status(200).json({
        status: "success",
        data: {
          ...estimate,
          fileName: fileRecord.fileName,
          fileType: fileRecord.fileType,
        },
      });
    } catch (error: any) {
      console.error("Error getting file estimate:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/llama/status
 * @desc    Check LLaMA integration status
 * @access  Private
 */
router.get("/status", auth, async (req: Request, res: Response) => {
  try {
    const status = await llamaIntegrationService.validateConfiguration();

    res.status(200).json({
      status: "success",
      data: status,
    });
  } catch (error: any) {
    console.error("Error checking status:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/llama/stats
 * @desc    Get processing statistics
 * @access  Private
 */
router.get("/stats", auth, async (req: Request, res: Response) => {
  try {
    const stats = await llamaIntegrationService.getProcessingStats();

    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/llama/models
 * @desc    Get available LLaMA models
 * @access  Private
 */
router.get("/models", auth, async (req: Request, res: Response) => {
  try {
    const { llamaService } = require("../services/llamaService");
    const models = llamaService.getAvailableModels();

    res.status(200).json({
      status: "success",
      data: models,
    });
  } catch (error: any) {
    console.error("Error getting models:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

export default router;
