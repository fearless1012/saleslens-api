import { llamaService } from "./llamaService";
import { promptTemplateEngine, PromptContext } from "./promptTemplateService";
import { fileProcessorService } from "./fileProcessorService";
import { Pitch } from "../models/pitch";
import { Customer } from "../models/customer";
import { DomainKnowledge } from "../models/domainKnowledge";
import { User } from "../models/user";
import mongoose from "mongoose";

export interface LLaMAProcessingRequest {
  templateName: string;
  fileId?: string;
  pitchId?: string;
  customerId?: string;
  domainKnowledgeId?: string;
  userId: string;
  customVariables?: { [key: string]: any };
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  };
}

export interface LLaMAProcessingResult {
  requestId: string;
  templateUsed: string;
  response: string;
  metadata: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    processingTime: number;
    model: string;
    template: {
      name: string;
      variables: string[];
    };
    file?: {
      fileName: string;
      fileType: string;
      wordCount: number;
    };
  };
  context: PromptContext;
}

export interface LLaMAStreamingCallback {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (result: LLaMAProcessingResult) => void;
  onError?: (error: Error) => void;
}

export class LLaMAIntegrationService {
  /**
   * Process a request using LLaMA with template and context
   */
  async processRequest(
    request: LLaMAProcessingRequest
  ): Promise<LLaMAProcessingResult> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Build context from request
      const context = await this.buildContext(request, requestId);

      // Render prompt template
      const renderedPrompt = await promptTemplateEngine.renderPrompt(
        request.templateName,
        context
      );

      // Prepare LLaMA request options
      const llamaOptions = {
        model:
          request.options?.model ||
          renderedPrompt.metadata.model ||
          "llama-3.3-70b-instruct",
        maxTokens:
          request.options?.maxTokens ||
          renderedPrompt.metadata.maxTokens ||
          1000,
        temperature:
          request.options?.temperature ||
          renderedPrompt.metadata.temperature ||
          0.7,
        systemPrompt: renderedPrompt.systemPrompt,
      };

      // Generate response
      const response = await llamaService.generateText(
        renderedPrompt.userPrompt,
        llamaOptions
      );

      const processingTime = Date.now() - startTime;

      return {
        requestId,
        templateUsed: request.templateName,
        response,
        metadata: {
          processingTime,
          model: llamaOptions.model,
          template: {
            name: request.templateName,
            variables: renderedPrompt.metadata.variables,
          },
          file: context.file
            ? {
                fileName: context.file.fileName,
                fileType: context.file.fileType,
                wordCount: context.file.content.split(/\s+/).length,
              }
            : undefined,
        },
        context,
      };
    } catch (error: any) {
      throw new Error(`LLaMA processing failed: ${error.message}`);
    }
  }

  /**
   * Process request with streaming response
   */
  async processRequestStream(
    request: LLaMAProcessingRequest,
    callback: LLaMAStreamingCallback
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      callback.onStart?.();

      // Build context
      const context = await this.buildContext(request, requestId);

      // Render prompt template
      const renderedPrompt = await promptTemplateEngine.renderPrompt(
        request.templateName,
        context
      );

      // Prepare streaming request
      const llamaRequest = {
        model:
          request.options?.model ||
          renderedPrompt.metadata.model ||
          "llama-3.3-70b-instruct",
        messages: [
          { role: "system" as const, content: renderedPrompt.systemPrompt },
          { role: "user" as const, content: renderedPrompt.userPrompt },
        ],
        max_tokens:
          request.options?.maxTokens ||
          renderedPrompt.metadata.maxTokens ||
          1000,
        temperature:
          request.options?.temperature ||
          renderedPrompt.metadata.temperature ||
          0.7,
        stream: true,
      };

      let fullResponse = "";

      // Stream response
      await llamaService.streamCompletion(llamaRequest, (chunk: string) => {
        fullResponse += chunk;
        callback.onChunk?.(chunk);
      });

      const processingTime = Date.now() - startTime;

      const result: LLaMAProcessingResult = {
        requestId,
        templateUsed: request.templateName,
        response: fullResponse,
        metadata: {
          processingTime,
          model: llamaRequest.model,
          template: {
            name: request.templateName,
            variables: renderedPrompt.metadata.variables,
          },
          file: context.file
            ? {
                fileName: context.file.fileName,
                fileType: context.file.fileType,
                wordCount: context.file.content.split(/\s+/).length,
              }
            : undefined,
        },
        context,
      };

      callback.onComplete?.(result);
    } catch (error: any) {
      callback.onError?.(new Error(`LLaMA streaming failed: ${error.message}`));
    }
  }

  /**
   * Build context from request parameters
   */
  private async buildContext(
    request: LLaMAProcessingRequest,
    requestId: string
  ): Promise<PromptContext> {
    const context: PromptContext = {
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        source: "llama_integration",
      },
      customVariables: request.customVariables || {},
    };

    // Get user information
    if (request.userId) {
      const user = await User.findById(request.userId).select(
        "name email role"
      );
      if (user) {
        context.user = {
          name: user.name,
          email: user.email,
          role: (user as any).role,
        };
      }
    }

    // Process pitch if provided
    if (request.pitchId) {
      const pitch = await Pitch.findById(request.pitchId);
      if (pitch) {
        context.pitch = pitch.toObject();

        // Extract file content
        if (pitch.fileUrl) {
          try {
            const fileContent =
              await fileProcessorService.extractContentFromFileRecord(pitch);
            context.file = {
              title: pitch.title,
              content: fileContent.text,
              fileName: pitch.fileName,
              fileType: pitch.fileType,
              fileSize: pitch.fileSize,
            };
          } catch (error) {
            console.warn(`Failed to extract content from pitch file: ${error}`);
          }
        }
      }
    }

    // Process customer if provided
    if (request.customerId) {
      const customer = await Customer.findById(request.customerId);
      if (customer) {
        context.customer = customer.toObject();
      }
    }

    // Process domain knowledge if provided
    if (request.domainKnowledgeId) {
      const domainKnowledge = await DomainKnowledge.findById(
        request.domainKnowledgeId
      );
      if (domainKnowledge) {
        context.domainKnowledge = domainKnowledge.toObject();

        // Extract file content
        if (domainKnowledge.fileUrl) {
          try {
            const fileContent =
              await fileProcessorService.extractContentFromFileRecord(
                domainKnowledge
              );
            context.file = {
              title: domainKnowledge.title,
              content: fileContent.text,
              fileName: domainKnowledge.fileName,
              fileType: domainKnowledge.fileType,
              fileSize: domainKnowledge.fileSize,
            };
          } catch (error) {
            console.warn(
              `Failed to extract content from domain knowledge file: ${error}`
            );
          }
        }
      }
    }

    // Process standalone file if provided
    if (request.fileId && !request.pitchId && !request.domainKnowledgeId) {
      // Try to find file in either collection
      let fileRecord = await Pitch.findById(request.fileId);
      if (!fileRecord) {
        fileRecord = await DomainKnowledge.findById(request.fileId);
      }

      if (fileRecord && fileRecord.fileUrl) {
        try {
          const fileContent =
            await fileProcessorService.extractContentFromFileRecord(fileRecord);
          context.file = {
            title: fileRecord.title,
            content: fileContent.text,
            fileName: fileRecord.fileName,
            fileType: fileRecord.fileType,
            fileSize: fileRecord.fileSize,
          };
        } catch (error) {
          console.warn(`Failed to extract content from file: ${error}`);
        }
      }
    }

    return context;
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return promptTemplateEngine.getAvailableTemplates();
  }

  /**
   * Get template details
   */
  getTemplate(name: string) {
    return promptTemplateEngine.getTemplate(name);
  }

  /**
   * Validate LLaMA configuration
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    services: {
      llama: boolean;
      templates: boolean;
      fileProcessor: boolean;
    };
  }> {
    const errors: string[] = [];
    const services = {
      llama: false,
      templates: false,
      fileProcessor: false,
    };

    // Test LLaMA service
    try {
      services.llama = await llamaService.validateConfiguration();
      if (!services.llama) {
        errors.push("LLaMA API configuration is invalid");
      }
    } catch (error: any) {
      errors.push(`LLaMA service error: ${error.message}`);
    }

    // Test template engine
    try {
      const templates = promptTemplateEngine.getAvailableTemplates();
      services.templates = templates.length > 0;
      if (!services.templates) {
        errors.push("No prompt templates available");
      }
    } catch (error: any) {
      errors.push(`Template engine error: ${error.message}`);
      services.templates = false;
    }

    // Test file processor
    try {
      const supportedTypes = fileProcessorService.getSupportedFileTypes();
      services.fileProcessor = supportedTypes.length > 0;
      if (!services.fileProcessor) {
        errors.push("File processor has no supported types");
      }
    } catch (error: any) {
      errors.push(`File processor error: ${error.message}`);
      services.fileProcessor = false;
    }

    return {
      isValid: errors.length === 0,
      errors,
      services,
    };
  }

  /**
   * Analyze file content and suggest best template
   */
  async suggestTemplate(fileId: string): Promise<{
    suggestedTemplate: string;
    confidence: number;
    reasoning: string;
    alternatives: Array<{
      template: string;
      confidence: number;
      reasoning: string;
    }>;
  }> {
    // This is a simplified implementation
    // In a real system, you might use ML models to analyze content and suggest templates

    let fileRecord = await Pitch.findById(fileId);
    let fileType = "pitch";

    if (!fileRecord) {
      fileRecord = await DomainKnowledge.findById(fileId);
      fileType = "domainKnowledge";
    }

    if (!fileRecord) {
      throw new Error("File not found");
    }

    const templates = this.getAvailableTemplates();

    // Simple heuristic-based suggestion
    if (fileType === "pitch") {
      return {
        suggestedTemplate: "sales_pitch_analysis",
        confidence: 0.9,
        reasoning:
          "This is a sales pitch document, best analyzed with the sales pitch analysis template",
        alternatives: [
          {
            template: "document_summarization",
            confidence: 0.7,
            reasoning: "Can provide a general summary of the pitch content",
          },
          {
            template: "content_generation",
            confidence: 0.6,
            reasoning: "Can generate new content based on this pitch",
          },
        ],
      };
    } else {
      return {
        suggestedTemplate: "knowledge_extraction",
        confidence: 0.85,
        reasoning:
          "This is domain knowledge, best processed with knowledge extraction template",
        alternatives: [
          {
            template: "document_summarization",
            confidence: 0.8,
            reasoning: "Can provide a comprehensive summary of the knowledge",
          },
        ],
      };
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalRequests: number;
    averageProcessingTime: number;
    popularTemplates: Array<{
      template: string;
      usage: number;
    }>;
    errorRate: number;
  }> {
    // This would typically query a logging/analytics database
    // For now, return mock data
    return {
      totalRequests: 0,
      averageProcessingTime: 0,
      popularTemplates: [],
      errorRate: 0,
    };
  }
}

// Export singleton instance
export const llamaIntegrationService = new LLaMAIntegrationService();
