import { LLaMAService } from "./llamaService";
import { DomainKnowledge } from "../models/domainKnowledge";
import { Module } from "../models/module";
import { Course } from "../models/course";
import fs from "fs";
import path from "path";

export interface TrainingModule {
  title: string;
  description: string;
  lessons: TrainingLesson[];
  estimatedDuration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  keyTakeaways: string[];
}

export interface TrainingLesson {
  title: string;
  content: string;
  duration: string;
  type: "theory" | "practical" | "assessment";
  resources: string[];
}

export class TrainingModuleGeneratorService {
  private llamaService: LLaMAService;

  constructor() {
    this.llamaService = new LLaMAService();
  }

  /**
   * Generate training modules from all domain knowledge documents
   */
  async generateTrainingModulesFromDomainKnowledge(): Promise<
    TrainingModule[]
  > {
    try {
      console.log("🚀 Starting training module generation...");

      // Fetch all domain knowledge documents
      const domainKnowledgeDocs = await DomainKnowledge.find();
      console.log(
        `📚 Found ${domainKnowledgeDocs.length} domain knowledge documents`
      );

      const trainingModules: TrainingModule[] = [];

      for (const doc of domainKnowledgeDocs) {
        console.log(`\n📖 Processing document: ${doc.title}`);

        // Read the file content
        const fileContent = await this.readFileContent(doc.fileUrl);

        if (fileContent) {
          // Generate training module for this document
          const module = await this.generateTrainingModuleFromContent(
            doc.title,
            doc.description,
            doc.category,
            fileContent
          );

          if (module) {
            trainingModules.push(module);
            console.log(`✅ Generated training module: "${module.title}"`);
            this.printTrainingModule(module);
          }
        }
      }

      console.log(
        `\n🎉 Successfully generated ${trainingModules.length} training modules!`
      );
      return trainingModules;
    } catch (error) {
      console.error("❌ Error generating training modules:", error);
      throw error;
    }
  }

  /**
   * Generate a training module from specific content
   */
  private async generateTrainingModuleFromContent(
    title: string,
    description: string,
    category: string,
    content: string
  ): Promise<TrainingModule | null> {
    try {
      const systemPrompt = `You are an expert training designer specializing in creating comprehensive sales training modules. Your task is to analyze domain knowledge content and create structured training modules for new hires to gain subject matter expertise.

Create a well-structured training module that includes:
1. Clear learning objectives
2. Progressive lessons (theory → practical → assessment)
3. Realistic time estimates
4. Key takeaways
5. Relevant resources

Format your response as valid JSON with the following structure:
{
  "title": "Module Title",
  "description": "Brief description",
  "estimatedDuration": "X hours",
  "difficulty": "beginner|intermediate|advanced",
  "objectives": ["objective1", "objective2"],
  "keyTakeaways": ["takeaway1", "takeaway2"],
  "lessons": [
    {
      "title": "Lesson Title",
      "content": "Detailed lesson content",
      "duration": "X minutes",
      "type": "theory|practical|assessment",
      "resources": ["resource1", "resource2"]
    }
  ]
}`;

      const userPrompt = `Create a comprehensive training module based on the following domain knowledge:

Title: ${title}
Description: ${description}
Category: ${category}

Content:
${content.substring(0, 3000)} ${content.length > 3000 ? "..." : ""}

Generate a training module that helps new sales hires understand this domain knowledge and become effective at selling these solutions. Include practical scenarios, key selling points, common objections, and assessment questions.`;

      const response = await this.llamaService.generateText(userPrompt, {
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse the JSON response
      const cleanedResponse = this.cleanJsonResponse(response);
      const trainingModule = JSON.parse(cleanedResponse) as TrainingModule;

      return trainingModule;
    } catch (error) {
      console.error(`❌ Error generating module for "${title}":`, error);
      return null;
    }
  }

  /**
   * Read file content from file system
   */
  private async readFileContent(fileUrl: string): Promise<string | null> {
    try {
      // Handle different file URL formats
      let filePath: string;

      if (fileUrl.startsWith("http")) {
        // For uploaded files that might have HTTP URLs
        const filename = path.basename(fileUrl);
        filePath = path.join(
          __dirname,
          "../../uploads/domain-knowledge",
          filename
        );
      } else {
        // For local file paths
        filePath = fileUrl;
      }

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return content;
      } else {
        console.warn(`⚠️  File not found: ${filePath}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error reading file ${fileUrl}:`, error);
      return null;
    }
  }

  /**
   * Clean JSON response from LLAMA model
   */
  private cleanJsonResponse(response: string): string {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Find the first { and last } to extract just the JSON
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  /**
   * Print training module to console in a formatted way
   */
  private printTrainingModule(module: TrainingModule): void {
    console.log("\n" + "=".repeat(80));
    console.log(`📚 TRAINING MODULE: ${module.title.toUpperCase()}`);
    console.log("=".repeat(80));

    console.log(`\n📖 Description: ${module.description}`);
    console.log(`⏱️  Estimated Duration: ${module.estimatedDuration}`);
    console.log(`📊 Difficulty: ${module.difficulty}`);

    console.log(`\n🎯 Learning Objectives:`);
    module.objectives.forEach((objective, index) => {
      console.log(`   ${index + 1}. ${objective}`);
    });

    console.log(`\n🔑 Key Takeaways:`);
    module.keyTakeaways.forEach((takeaway, index) => {
      console.log(`   ${index + 1}. ${takeaway}`);
    });

    console.log(`\n📋 Lessons (${module.lessons.length} total):`);
    module.lessons.forEach((lesson, index) => {
      console.log(`\n   Lesson ${index + 1}: ${lesson.title}`);
      console.log(`   Type: ${lesson.type} | Duration: ${lesson.duration}`);
      console.log(
        `   Content: ${lesson.content.substring(0, 200)}${
          lesson.content.length > 200 ? "..." : ""
        }`
      );

      if (lesson.resources.length > 0) {
        console.log(`   Resources: ${lesson.resources.join(", ")}`);
      }
    });

    console.log("\n" + "=".repeat(80));
  }

  /**
   * Save generated training modules to database
   */
  async saveTrainingModulesToDatabase(
    modules: TrainingModule[],
    createdBy: string
  ): Promise<void> {
    try {
      console.log("\n💾 Saving training modules to database...");

      // Create or find a course for AI-generated modules
      let course = await Course.findOne({
        title: "AI-Generated Training Modules",
      });

      if (!course) {
        course = new Course({
          title: "AI-Generated Training Modules",
          description:
            "Training modules automatically generated from domain knowledge",
          createdBy,
          isPublished: true,
        });
        await course.save();
        console.log("✅ Created new course for AI-generated modules");
      }

      // Save each module
      for (let i = 0; i < modules.length; i++) {
        const moduleData = modules[i];

        const module = new Module({
          title: moduleData.title,
          description: moduleData.description,
          courseId: course._id,
          order: i + 1,
          createdBy,
          isPublished: true,
        });

        await module.save();
        console.log(`✅ Saved module: ${moduleData.title}`);
      }

      console.log(
        `🎉 Successfully saved ${modules.length} modules to database!`
      );
    } catch (error) {
      console.error("❌ Error saving modules to database:", error);
      throw error;
    }
  }

  /**
   * Generate training modules from synthetic data
   */
  async generateFromSyntheticData(): Promise<TrainingModule[]> {
    try {
      console.log("🔄 Generating training modules from synthetic data...");

      // Read the synthetic domain knowledge data
      const syntheticDataPath = path.join(
        __dirname,
        "../../../saleslens/sythetic-data/Domain Knowledge/data.txt"
      );

      if (!fs.existsSync(syntheticDataPath)) {
        console.warn("⚠️  Synthetic data file not found");
        return [];
      }

      const syntheticData = fs.readFileSync(syntheticDataPath, "utf-8");

      const module = await this.generateTrainingModuleFromContent(
        "Meta Llama Sales Training",
        "Comprehensive training on Meta Llama models for sales teams",
        "product",
        syntheticData
      );

      if (module) {
        console.log("✅ Generated training module from synthetic data");
        this.printTrainingModule(module);
        return [module];
      }

      return [];
    } catch (error) {
      console.error("❌ Error generating from synthetic data:", error);
      return [];
    }
  }
}

export default TrainingModuleGeneratorService;
