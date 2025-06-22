#!/usr/bin/env node

/**
 * Diagnostic script to test LLAMA API connectivity and identify issues
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function diagnoseLlamaAPI() {
  console.log("🔍 LLAMA API Diagnostic Script");
  console.log("=".repeat(50));

  // Check environment variables
  const apiKey = process.env.LLAMA_API_KEY;
  const baseURL = process.env.LLAMA_BASE_URL;

  console.log("\n📋 Environment Configuration:");
  console.log(
    `   LLAMA_API_KEY: ${
      apiKey ? `${apiKey.substring(0, 10)}...` : "❌ Not set"
    }`
  );
  console.log(`   LLAMA_BASE_URL: ${baseURL || "❌ Not set"}`);

  if (!apiKey) {
    console.log("\n❌ LLAMA_API_KEY is not configured!");
    console.log("💡 Please set your LLAMA API key in the .env file");
    return;
  }

  // Test different API endpoints and configurations
  const testConfigurations = [
    {
      name: "Official Meta Llama API",
      url: "https://api.llama.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
    {
      name: "Official Meta API",
      url: "https://api.llama.meta.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
    {
      name: "Current Configuration",
      url: baseURL || "https://api.llama-api.com/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
    {
      name: "Alternative Endpoint #1",
      url: "https://api.llama-api.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
    {
      name: "Alternative Headers Format",
      url: baseURL || "https://api.llama-api.com/chat/completions",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    },
  ];

  const testPayload = {
    model: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "Say 'Hello World' in a friendly way.",
      },
    ],
    max_tokens: 50,
    temperature: 0.7,
  };

  for (let i = 0; i < testConfigurations.length; i++) {
    const config = testConfigurations[i];
    console.log(`\n🧪 Test ${i + 1}: ${config.name}`);
    console.log(`   URL: ${config.url}`);

    try {
      const response = await axios.post(config.url, testPayload, {
        headers: config.headers,
        timeout: 10000,
      });

      console.log(`   ✅ Success! Status: ${response.status}`);
      console.log(
        `   📝 Response: ${JSON.stringify(response.data, null, 2).substring(
          0,
          200
        )}...`
      );

      // If this test succeeds, we found the working configuration
      console.log(`\n🎉 Found working configuration: ${config.name}`);
      console.log(`   Use this URL: ${config.url}`);
      console.log(`   Use these headers:`, config.headers);
      break;
    } catch (error: any) {
      if (error.response) {
        console.log(
          `   ❌ HTTP Error: ${error.response.status} - ${error.response.statusText}`
        );
        console.log(`   📝 Error details:`, error.response.data);
      } else if (error.request) {
        console.log(`   ❌ Network Error: No response received`);
        console.log(`   📝 Request details:`, error.code || error.message);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  // Test alternative models if available
  console.log("\n🔄 Testing alternative models...");
  const altModels = [
    "Llama-4-Maverick-17B-128E-Instruct-FP8",
    "llama-3.3-70b-instruct",
    "llama-3.1-70b-instruct",
    "llama-3-70b-instruct",
  ];

  for (const model of altModels) {
    console.log(`\n🧪 Testing model: ${model}`);
    try {
      const testPayloadAlt = { ...testPayload, model };
      const response = await axios.post(
        baseURL || "https://api.llama-api.com/chat/completions",
        testPayloadAlt,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`   ✅ Model ${model} works!`);
      break;
    } catch (error: any) {
      console.log(
        `   ❌ Model ${model} failed: ${
          error.response?.status || error.message
        }`
      );
    }
  }

  console.log("\n📊 Diagnostic Summary:");
  console.log("   • Check the working configuration above");
  console.log("   • Verify your API key is valid and has sufficient credits");
  console.log("   • Try different model names if the current one fails");
  console.log("   • Check LLAMA API documentation for latest endpoints");

  console.log("\n💡 Possible Solutions:");
  console.log("   1. Update LLAMA_BASE_URL in .env file to working endpoint");
  console.log("   2. Verify API key format and permissions");
  console.log("   3. Check if LLAMA API service is operational");
  console.log("   4. Consider using mock service for development");
}

// Run diagnostics
if (require.main === module) {
  diagnoseLlamaAPI().finally(() => {
    console.log("\n🔧 Diagnostic completed");
    process.exit(0);
  });
}

export default diagnoseLlamaAPI;
