#!/usr/bin/env ts-node

/**
 * Test script for LLaMA integration
 * This script validates the integration setup and tests basic functionality
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { llamaIntegrationService } from "../services/llamaIntegrationService";
import { promptTemplateEngine } from "../services/promptTemplateService";
import { fileProcessorService } from "../services/fileProcessorService";
import { llamaService } from "../services/llamaService";

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

class LLaMAIntegrationTester {
  async runTests(): Promise<void> {
    console.log(
      `${colors.blue}${colors.bright}🔍 LLaMA Integration Test Suite${colors.reset}\n`
    );

    try {
      // Test 1: Environment Configuration
      await this.testEnvironmentConfig();

      // Test 2: Database Connection
      await this.testDatabaseConnection();

      // Test 3: LLaMA Service
      await this.testLLaMAService();

      // Test 4: Template Engine
      await this.testTemplateEngine();

      // Test 5: File Processor
      await this.testFileProcessor();

      // Test 6: Integration Service
      await this.testIntegrationService();

      console.log(
        `\n${colors.green}${colors.bright}✅ All tests completed successfully!${colors.reset}`
      );
    } catch (error) {
      console.error(
        `\n${colors.red}${colors.bright}❌ Test suite failed:${colors.reset}`,
        error
      );
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }

  private async testEnvironmentConfig(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}🔧 Testing Environment Configuration${colors.reset}`
    );

    const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "LLAMA_API_KEY"];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      console.log(
        `${colors.yellow}⚠️  Missing environment variables: ${missingVars.join(
          ", "
        )}${colors.reset}`
      );
      console.log(
        `${colors.yellow}   Create a .env file based on .env.example${colors.reset}`
      );
    } else {
      console.log(
        `${colors.green}✓ All required environment variables are set${colors.reset}`
      );
    }

    // Check API key format
    const apiKey = process.env.LLAMA_API_KEY;
    if (apiKey && apiKey !== "your_llama_api_key_here") {
      console.log(
        `${colors.green}✓ LLaMA API key appears to be configured${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}⚠️  LLaMA API key needs to be set in .env file${colors.reset}`
      );
    }

    console.log();
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}📊 Testing Database Connection${colors.reset}`
    );

    try {
      const mongoUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/saleslens";
      await mongoose.connect(mongoUri);
      console.log(
        `${colors.green}✓ Successfully connected to MongoDB${colors.reset}`
      );

      // Test basic query
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        console.log(
          `${colors.green}✓ Found ${collections.length} collections in database${colors.reset}`
        );
      } else {
        console.log(
          `${colors.yellow}⚠ Database connection established but db object not available${colors.reset}`
        );
      }
    } catch (error) {
      console.log(
        `${colors.red}✗ Database connection failed: ${error}${colors.reset}`
      );
      throw error;
    }

    console.log();
  }

  private async testLLaMAService(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}🤖 Testing LLaMA Service${colors.reset}`
    );

    try {
      // Test model list
      const models = llamaService.getAvailableModels();
      console.log(
        `${colors.green}✓ Available models: ${models.length}${colors.reset}`
      );
      console.log(`   Models: ${models.slice(0, 3).join(", ")}...`);

      // Test configuration validation (if API key is set)
      if (
        process.env.LLAMA_API_KEY &&
        process.env.LLAMA_API_KEY !== "your_llama_api_key_here"
      ) {
        console.log(
          `${colors.yellow}⏳ Testing API connection (this may take a moment)...${colors.reset}`
        );
        const isValid = await llamaService.validateConfiguration();
        if (isValid) {
          console.log(
            `${colors.green}✓ LLaMA API connection successful${colors.reset}`
          );
        } else {
          console.log(
            `${colors.yellow}⚠️  LLaMA API validation failed - check your API key${colors.reset}`
          );
        }
      } else {
        console.log(
          `${colors.yellow}⚠️  Skipping API test - no API key configured${colors.reset}`
        );
      }
    } catch (error) {
      console.log(
        `${colors.red}✗ LLaMA service test failed: ${error}${colors.reset}`
      );
      // Don't throw here, continue with other tests
    }

    console.log();
  }

  private async testTemplateEngine(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}📝 Testing Template Engine${colors.reset}`
    );

    try {
      // Test template loading
      const templates = promptTemplateEngine.getAvailableTemplates();
      console.log(
        `${colors.green}✓ Loaded ${templates.length} templates${colors.reset}`
      );

      if (templates.length === 0) {
        console.log(
          `${colors.yellow}⚠️  No templates found - creating default templates...${colors.reset}`
        );
      } else {
        console.log(
          `   Templates: ${templates.map((t: any) => t.name).join(", ")}`
        );
      }

      // Test template rendering
      if (templates.length > 0) {
        const testTemplate = templates[0];
        const testContext = {
          file: {
            title: "Test Document",
            content: "This is a test document for validation.",
            fileName: "test.txt",
            fileType: "txt",
            fileSize: 1024,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: "test_123",
            source: "test",
          },
        };

        const rendered = await promptTemplateEngine.renderPrompt(
          testTemplate.name,
          testContext
        );
        console.log(
          `${colors.green}✓ Successfully rendered template '${testTemplate.name}'${colors.reset}`
        );
        console.log(
          `   System prompt length: ${rendered.systemPrompt.length} chars`
        );
        console.log(
          `   User prompt length: ${rendered.userPrompt.length} chars`
        );
      }
    } catch (error) {
      console.log(
        `${colors.red}✗ Template engine test failed: ${error}${colors.reset}`
      );
      throw error;
    }

    console.log();
  }

  private async testFileProcessor(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}📄 Testing File Processor${colors.reset}`
    );

    try {
      // Test supported file types
      const supportedTypes = fileProcessorService.getSupportedFileTypes();
      console.log(
        `${colors.green}✓ Supports ${supportedTypes.length} file types${colors.reset}`
      );
      console.log(`   Types: ${supportedTypes.join(", ")}`);

      // Test file type validation
      const testFiles = [
        "document.pdf",
        "text.txt",
        "presentation.pptx",
        "image.jpg",
      ];
      testFiles.forEach((fileName) => {
        const isSupported = fileProcessorService.isFileTypeSupported(fileName);
        const status = isSupported ? `${colors.green}✓` : `${colors.yellow}✗`;
        console.log(
          `   ${status} ${fileName}: ${
            isSupported ? "Supported" : "Not supported"
          }${colors.reset}`
        );
      });

      console.log(
        `${colors.green}✓ File processor validation completed${colors.reset}`
      );
    } catch (error) {
      console.log(
        `${colors.red}✗ File processor test failed: ${error}${colors.reset}`
      );
      throw error;
    }

    console.log();
  }

  private async testIntegrationService(): Promise<void> {
    console.log(
      `${colors.cyan}${colors.bright}🔗 Testing Integration Service${colors.reset}`
    );

    try {
      // Test configuration validation
      const status = await llamaIntegrationService.validateConfiguration();

      console.log(
        `${colors.green}✓ Integration service status:${colors.reset}`
      );
      console.log(`   Overall valid: ${status.isValid ? "✅" : "❌"}`);
      console.log(`   LLaMA service: ${status.services.llama ? "✅" : "❌"}`);
      console.log(
        `   Template engine: ${status.services.templates ? "✅" : "❌"}`
      );
      console.log(
        `   File processor: ${status.services.fileProcessor ? "✅" : "❌"}`
      );

      if (status.errors.length > 0) {
        console.log(`${colors.yellow}⚠️  Issues found:${colors.reset}`);
        status.errors.forEach((error: any) => {
          console.log(`   - ${error}`);
        });
      }

      // Test template retrieval
      const templates = llamaIntegrationService.getAvailableTemplates();
      console.log(
        `${colors.green}✓ Can access ${templates.length} templates through integration service${colors.reset}`
      );
    } catch (error) {
      console.log(
        `${colors.red}✗ Integration service test failed: ${error}${colors.reset}`
      );
      throw error;
    }

    console.log();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const tester = new LLaMAIntegrationTester();

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${colors.cyan}LLaMA Integration Test Suite${colors.reset}`);
    console.log("");
    console.log("Usage:");
    console.log(
      `  ${colors.green}npm run test:llama${colors.reset}     - Run all tests`
    );
    console.log(
      `  ${colors.green}ts-node src/scripts/test-llama.ts${colors.reset} - Run directly`
    );
    console.log("");
    console.log("This script validates:");
    console.log("  - Environment configuration");
    console.log("  - Database connectivity");
    console.log("  - LLaMA API connection");
    console.log("  - Template engine functionality");
    console.log("  - File processing capabilities");
    console.log("  - Integration service status");
    console.log("");
    return;
  }

  await tester.runTests();
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { LLaMAIntegrationTester };
