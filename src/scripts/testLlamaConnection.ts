import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function testLlamaConnection() {
  const apiKey = process.env.LLAMA_API_KEY;
  const baseUrl = process.env.LLAMA_BASE_URL;

  console.log("🦙 Testing LLaMA API connection...");
  console.log("API Key:", apiKey?.substring(0, 10) + "...");
  console.log("Base URL:", baseUrl);

  if (!apiKey || !baseUrl) {
    console.error(
      "❌ Missing LLAMA_API_KEY or LLAMA_BASE_URL in environment variables"
    );
    return;
  }

  try {
    // Test with a simple request
    const requestBody = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: "Hello, can you respond with 'Connection successful'?",
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    };

    console.log("\n🚀 Making test request...");
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await axios.post(baseUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("\n✅ Success! API Response:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("\n❌ Error testing LLaMA API:");
    console.error("Status:", error.response?.status);
    console.error("Status Text:", error.response?.statusText);
    console.error("Response Data:", error.response?.data);
    console.error("Request URL:", error.config?.url);

    if (error.response?.status === 404) {
      console.log("\n🔍 Troubleshooting 404 Error:");
      console.log("1. Check if the base URL is correct");
      console.log("2. Verify the API endpoint supports the model you're using");
      console.log("3. Check if the API key has the correct permissions");

      // Try alternative endpoints
      console.log("\n🧪 Testing alternative endpoints...");

      const alternativeUrls = [
        "https://api.llama-api.com/v1/chat/completions",
        "https://api.llama-api.com/chat",
        "https://api.together.xyz/v1/chat/completions",
        "https://api.deepinfra.com/v1/openai/chat/completions",
      ];

      for (const altUrl of alternativeUrls) {
        try {
          console.log(`\nTrying: ${altUrl}`);
          const testRequestBody = {
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "user",
                content: "Hello, can you respond with 'Connection successful'?",
              },
            ],
            max_tokens: 50,
            temperature: 0.1,
          };

          const testResponse = await axios.post(altUrl, testRequestBody, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          });
          console.log(`✅ ${altUrl} works!`);
          console.log("Update your .env file with: LLAMA_BASE_URL=" + altUrl);
          break;
        } catch (altError: any) {
          console.log(
            `❌ ${altUrl} failed: ${altError.response?.status} - ${altError.response?.statusText}`
          );
        }
      }
    }
  }
}

testLlamaConnection().catch(console.error);
