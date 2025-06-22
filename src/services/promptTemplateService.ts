import nunjucks from "nunjucks";
import path from "path";
import fs from "fs-extra";
import { IPitch } from "../models/pitch";
import { ICustomer } from "../models/customer";
import { IDomainKnowledge } from "../models/domainKnowledge";

export interface PromptContext {
  file?: {
    title: string;
    content: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
  pitch?: IPitch;
  customer?: ICustomer;
  domainKnowledge?: IDomainKnowledge;
  user?: {
    name: string;
    email: string;
    role?: string;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    source: string;
  };
  customVariables?: { [key: string]: any };
}

export interface PromptTemplate {
  name: string;
  description: string;
  category:
    | "analysis"
    | "generation"
    | "extraction"
    | "summarization"
    | "classification"
    | "custom";
  systemPrompt: string;
  userPrompt: string;
  variables: string[];
  examples?: Array<{
    input: PromptContext;
    expectedOutput: string;
  }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class PromptTemplateEngine {
  private env: nunjucks.Environment;
  private templatesDir: string;
  private loadedTemplates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.templatesDir = path.join(__dirname, "../templates/prompts");

    // Configure Nunjucks environment
    this.env = nunjucks.configure(this.templatesDir, {
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
    });

    // Add custom filters
    this.setupCustomFilters();

    // Ensure templates directory exists
    this.ensureTemplatesDirectory();

    // Load all templates
    this.loadAllTemplates();
  }

  private setupCustomFilters(): void {
    // Filter to format file size
    this.env.addFilter("filesize", (bytes: number) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    });

    // Filter to format date
    this.env.addFilter(
      "formatdate",
      (date: Date | string, format = "YYYY-MM-DD") => {
        const d = new Date(date);
        return d.toISOString().split("T")[0]; // Simple ISO date format
      }
    );

    // Filter to truncate text
    this.env.addFilter(
      "truncate",
      (text: string, length = 100, suffix = "...") => {
        if (text.length <= length) return text;
        return text.substring(0, length) + suffix;
      }
    );

    // Filter to extract keywords (simple implementation)
    this.env.addFilter("keywords", (text: string, count = 5) => {
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3);

      const frequency: { [key: string]: number } = {};
      words.forEach((word) => {
        frequency[word] = (frequency[word] || 0) + 1;
      });

      return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, count)
        .map(([word]) => word);
    });

    // Filter to capitalize
    this.env.addFilter("capitalize", (text: string) => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    });
  }

  private async ensureTemplatesDirectory(): Promise<void> {
    await fs.ensureDir(this.templatesDir);
  }

  private async loadAllTemplates(): Promise<void> {
    try {
      const templateFiles = await fs.readdir(this.templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith(".json")) {
          const templatePath = path.join(this.templatesDir, file);
          const templateData = await fs.readJson(templatePath);
          const templateName = path.basename(file, ".json");
          this.loadedTemplates.set(templateName, templateData);
        }
      }
    } catch (error) {
      console.warn(
        "No templates directory found, creating default templates..."
      );
      await this.createDefaultTemplates();
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: PromptTemplate[] = [
      {
        name: "sales_pitch_analysis",
        description:
          "Analyze a sales pitch document for effectiveness and provide recommendations",
        category: "analysis",
        systemPrompt: `You are an expert sales analyst with over 15 years of experience in evaluating sales presentations and pitches. Your role is to provide comprehensive, actionable feedback to help sales teams improve their effectiveness.`,
        userPrompt: `Please analyze this sales pitch document:

**Document Information:**
- Title: {{ file.title }}
- File: {{ file.fileName }}
- Size: {{ file.fileSize | filesize }}
- Type: {{ file.fileType }}

**Content:**
{{ file.content | truncate(2000) }}

{% if pitch %}
**Pitch Metadata:**
- Industry: {{ pitch.industry }}
- Category: {{ pitch.category }}
- Status: {{ pitch.status }}
- Success Rate: {{ pitch.successRate }}%
{% if pitch.tags %}
- Tags: {{ pitch.tags | join(', ') }}
{% endif %}
{% endif %}

**Analysis Required:**
1. **Effectiveness Score** (1-10): Rate the overall effectiveness
2. **Strengths**: Identify key strengths in the pitch
3. **Weaknesses**: Point out areas for improvement
4. **Recommendations**: Provide 3-5 specific actionable recommendations
5. **Target Audience Alignment**: Assess how well the pitch aligns with the target audience
6. **Call-to-Action Analysis**: Evaluate the clarity and persuasiveness of the CTA
7. **Competitive Positioning**: Comment on how well the pitch differentiates from competitors

Please provide your analysis in a structured format with clear headings and bullet points.`,
        variables: ["file", "pitch"],
        model: "llama-3.3-70b-instruct",
        maxTokens: 1500,
        temperature: 0.3,
      },
      {
        name: "customer_insight_generation",
        description: "Generate insights about a customer based on their data",
        category: "analysis",
        systemPrompt: `You are a customer relationship expert and data analyst specializing in B2B customer insights. You excel at identifying patterns, opportunities, and risks from customer data.`,
        userPrompt: `Generate comprehensive insights for this customer:

**Customer Information:**
{% if customer %}
- Name: {{ customer.name }}
- Company: {{ customer.company }}
- Industry: {{ customer.industry }}
- Position: {{ customer.position }}
- Status: {{ customer.status }}
{% if customer.revenue %}
- Revenue: ${"$"}{{ customer.revenue }}
{% endif %}
{% if customer.requirements %}
- Requirements: {{ customer.requirements }}
{% endif %}
{% if customer.notes %}
- Notes: {{ customer.notes }}
{% endif %}
{% endif %}

**Analysis Required:**
1. **Customer Profile Summary**: Brief overview of the customer
2. **Business Potential**: Assess the potential value and opportunity size
3. **Risk Assessment**: Identify potential risks or red flags
4. **Engagement Strategy**: Recommend the best approach for engagement
5. **Upselling/Cross-selling Opportunities**: Identify potential expansion opportunities
6. **Communication Preferences**: Suggest optimal communication style and frequency
7. **Next Steps**: Recommend specific next actions

Provide actionable insights that can help the sales team better serve this customer.`,
        variables: ["customer"],
        model: "llama-3.3-70b-instruct",
        maxTokens: 1200,
        temperature: 0.4,
      },
      {
        name: "document_summarization",
        description: "Create a comprehensive summary of any uploaded document",
        category: "summarization",
        systemPrompt: `You are an expert document analyst capable of creating clear, concise, and comprehensive summaries of business documents.`,
        userPrompt: `Please create a summary of this document:

**Document Details:**
- Title: {{ file.title }}
- File: {{ file.fileName }}
- Type: {{ file.fileType }}
- Size: {{ file.fileSize | filesize }}

**Content:**
{{ file.content }}

**Summary Requirements:**
1. **Executive Summary**: 2-3 sentence overview
2. **Key Points**: 5-7 main points from the document
3. **Important Details**: Critical information that shouldn't be missed
4. **Action Items**: Any tasks, deadlines, or next steps mentioned
5. **Keywords**: {{ file.content | keywords(10) | join(', ') }}

Please provide a clear, structured summary that captures the essence and important details of this document.`,
        variables: ["file"],
        model: "llama-3.3-70b-instruct",
        maxTokens: 800,
        temperature: 0.2,
      },
      {
        name: "knowledge_extraction",
        description:
          "Extract structured knowledge from domain knowledge documents",
        category: "extraction",
        systemPrompt: `You are a knowledge management expert skilled at extracting and structuring information from business documents into actionable knowledge bases.`,
        userPrompt: `Extract structured knowledge from this domain knowledge document:

**Document Information:**
- Title: {{ file.title }}
- Category: {{ domainKnowledge.category if domainKnowledge else 'N/A' }}
- File: {{ file.fileName }}

**Content:**
{{ file.content }}

**Extraction Requirements:**
1. **Core Concepts**: List the main concepts or topics covered
2. **Key Facts**: Extract important facts, figures, or data points
3. **Processes/Procedures**: Identify any workflows, processes, or procedures
4. **Best Practices**: Extract recommended practices or guidelines
5. **Definitions**: List important terms and their definitions
6. **References**: Note any external references, links, or citations
7. **Applications**: How this knowledge can be applied in practice

Present the extracted knowledge in a structured, searchable format that can be easily referenced by the sales team.`,
        variables: ["file", "domainKnowledge"],
        model: "llama-3.3-70b-instruct",
        maxTokens: 1000,
        temperature: 0.1,
      },
      {
        name: "content_generation",
        description: "Generate new content based on existing materials",
        category: "generation",
        systemPrompt: `You are a creative content strategist and copywriter specializing in sales and marketing materials. You excel at creating compelling, persuasive content that drives engagement and conversions.`,
        userPrompt: `Based on the following source material, generate new content:

**Source Material:**
{% if file %}
- Document: {{ file.title }}
- Content: {{ file.content | truncate(1500) }}
{% endif %}

{% if pitch %}
**Pitch Context:**
- Industry: {{ pitch.industry }}
- Category: {{ pitch.category }}
- Target Success Rate: {{ pitch.successRate }}%
{% endif %}

**Content Generation Request:**
{{ customVariables.contentType if customVariables.contentType else 'Please specify the type of content to generate' }}

**Requirements:**
1. **Target Audience**: {{ customVariables.targetAudience if customVariables.targetAudience else 'Business professionals' }}
2. **Tone**: {{ customVariables.tone if customVariables.tone else 'Professional and persuasive' }}
3. **Length**: {{ customVariables.length if customVariables.length else 'Medium (300-500 words)' }}
4. **Key Messages**: Focus on value proposition and benefits
5. **Call-to-Action**: Include a clear, compelling CTA

Generate high-quality content that aligns with the source material and meets the specified requirements.`,
        variables: ["file", "pitch", "customVariables"],
        model: "llama-3.3-70b-instruct",
        maxTokens: 1200,
        temperature: 0.7,
      },
    ];

    // Save default templates
    for (const template of defaultTemplates) {
      await this.saveTemplate(template);
    }
  }

  /**
   * Render a prompt template with the given context
   */
  async renderPrompt(
    templateName: string,
    context: PromptContext
  ): Promise<{
    systemPrompt: string;
    userPrompt: string;
    metadata: {
      template: string;
      variables: string[];
      model?: string;
      maxTokens?: number;
      temperature?: number;
    };
  }> {
    const template = this.loadedTemplates.get(templateName);

    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Add metadata to context
    const enrichedContext = {
      ...context,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: context.metadata?.requestId || `req_${Date.now()}`,
        source: context.metadata?.source || "api",
        ...context.metadata,
      },
    };

    try {
      const systemPrompt = this.env.renderString(
        template.systemPrompt,
        enrichedContext
      );
      const userPrompt = this.env.renderString(
        template.userPrompt,
        enrichedContext
      );

      return {
        systemPrompt,
        userPrompt,
        metadata: {
          template: templateName,
          variables: template.variables,
          model: template.model,
          maxTokens: template.maxTokens,
          temperature: template.temperature,
        },
      };
    } catch (error: any) {
      throw new Error(
        `Error rendering template '${templateName}': ${error.message}`
      );
    }
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): PromptTemplate[] {
    return Array.from(this.loadedTemplates.values());
  }

  /**
   * Get a specific template
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.loadedTemplates.get(name);
  }

  /**
   * Save a new template
   */
  async saveTemplate(template: PromptTemplate): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${template.name}.json`);
    await fs.writeJson(templatePath, template, { spaces: 2 });
    this.loadedTemplates.set(template.name, template);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(name: string): Promise<void> {
    const templatePath = path.join(this.templatesDir, `${name}.json`);
    await fs.remove(templatePath);
    this.loadedTemplates.delete(name);
  }

  /**
   * Validate template variables against context
   */
  validateTemplateContext(
    templateName: string,
    context: PromptContext
  ): {
    isValid: boolean;
    missingVariables: string[];
    availableVariables: string[];
  } {
    const template = this.loadedTemplates.get(templateName);

    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const availableVariables = Object.keys(context);
    const missingVariables = template.variables.filter(
      (variable) => !availableVariables.includes(variable)
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      availableVariables,
    };
  }
}

// Export singleton instance
export const promptTemplateEngine = new PromptTemplateEngine();
