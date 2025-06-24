import express, { Router } from "express";
import { auth } from "../middleware/auth";
import TrainingModuleGeneratorService from "../services/trainingModuleGeneratorService";
import MockTrainingModuleGeneratorService from "../services/mockTrainingModuleGeneratorService";

const router: Router = express.Router();

/**
 * @route   POST api/training-modules/generate
 * @desc    Generate training modules from domain knowledge using LLAMA (or mock service)
 * @access  Private
 */
router.post("/generate", auth, async (req, res) => {
  try {
    console.log(
      "🚀 Training module generation requested by user:",
      req.body.user?.id
    );

    let allModules = [];
    let usedMockService = false;

    try {
      // Try real LLAMA service first
      const generatorService = new TrainingModuleGeneratorService();
      const modulesFromDB =
        await generatorService.generateTrainingModulesFromDomainKnowledge();
      const modulesFromSynthetic =
        await generatorService.generateFromSyntheticData();
      allModules = [...modulesFromDB, ...modulesFromSynthetic];
    } catch (llamaError) {
      console.log(
        "⚠️  LLAMA service unavailable, using mock service for demonstration"
      );
      usedMockService = true;

      // Fallback to mock service
      const mockService = new MockTrainingModuleGeneratorService();
      const modulesFromDB =
        await mockService.generateTrainingModulesFromDomainKnowledge();
      const modulesFromSynthetic =
        await mockService.generateFromSyntheticData();
      allModules = [...modulesFromDB, ...modulesFromSynthetic];
    }

    // Save to database if requested and user has permission
    if (req.body.saveToDatabase && allModules.length > 0) {
      try {
        const realService = new TrainingModuleGeneratorService();
        await realService.saveTrainingModulesToDatabase(
          allModules,
          req.body.user.id
        );
      } catch (saveError) {
        console.warn("⚠️  Could not save to database:", saveError);
      }
    }

    res.status(200).json({
      status: "success",
      message: usedMockService
        ? "Training modules generated successfully (using demo mode)"
        : "Training modules generated successfully",
      data: {
        totalModules: allModules.length,
        modules: allModules,
        demoMode: usedMockService,
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating training modules:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate training modules",
      error: error.message,
    });
  }
});

/**
 * @route   POST api/training-modules/generate-from-synthetic
 * @desc    Generate training modules specifically from synthetic data
 * @access  Private
 */
router.post("/generate-from-synthetic", auth, async (req, res) => {
  try {
    console.log("🔄 Synthetic data training module generation requested");

    const generatorService = new TrainingModuleGeneratorService();
    const modules = await generatorService.generateFromSyntheticData();

    res.status(200).json({
      status: "success",
      message: "Training modules generated from synthetic data",
      data: {
        totalModules: modules.length,
        modules,
      },
    });
  } catch (error: any) {
    console.error(
      "❌ Error generating training modules from synthetic data:",
      error
    );
    res.status(500).json({
      status: "error",
      message: "Failed to generate training modules from synthetic data",
      error: error.message,
    });
  }
});

/**
 * @route   POST api/training-modules/demo
 * @desc    Generate demo training modules using mock service
 * @access  Private
 */
router.post("/demo", auth, async (req, res) => {
  try {
    console.log("🎯 Demo training module generation requested");

    const mockService = new MockTrainingModuleGeneratorService();
    const modulesFromDB =
      await mockService.generateTrainingModulesFromDomainKnowledge();
    const modulesFromSynthetic = await mockService.generateFromSyntheticData();
    const allModules = [...modulesFromDB, ...modulesFromSynthetic];

    res.status(200).json({
      status: "success",
      message: "Demo training modules generated successfully",
      data: {
        totalModules: allModules.length,
        modules: allModules,
        demoMode: true,
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating demo training modules:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate demo training modules",
      error: error.message,
    });
  }
});

/**
 * @route   GET api/training-modules/test-llama
 * @desc    Test LLAMA integration
 * @access  Private
 */
router.get("/test-llama", auth, async (req, res) => {
  try {
    console.log("🧪 Testing LLAMA integration...");

    const generatorService = new TrainingModuleGeneratorService();

    // Test with simple content
    const testModule = await (
      generatorService as any
    ).generateTrainingModuleFromContent(
      "Test Module",
      "A test module for LLAMA integration",
      "product",
      "This is test content about Meta Llama models and their sales applications."
    );

    if (testModule) {
      console.log("✅ LLAMA integration test successful");
      (generatorService as any).printTrainingModule(testModule);
    }

    res.status(200).json({
      status: "success",
      message: "LLAMA integration test completed",
      data: {
        testModule,
        llamaWorking: !!testModule,
      },
    });
  } catch (error: any) {
    console.error("❌ LLAMA integration test failed:", error);
    res.status(500).json({
      status: "error",
      message: "LLAMA integration test failed",
      error: error.message,
    });
  }
});

/**
 * @route   POST api/training-modules/generate-slides
 * @desc    Generate presentation slides using SlidesGPT API
 * @access  Private
 */
router.post("/generate-slides", auth, async (req, res) => {
  try {
    console.log("🎨 Slides generation requested by user:", req.body.user?.id);

    const { prompt } = req.body;
    const slideApiKey = process.env.slideapi;

    if (!slideApiKey) {
      return res.status(500).json({
        status: "error",
        message: "Slides API key not configured",
      });
    }

    if (!prompt) {
      return res.status(400).json({
        status: "error",
        message: "Prompt is required",
      });
    }

    // Default prompt if none provided
    const finalPrompt =
      prompt ||
      "Create a comprehensive training module about Meta offerings including Meta Ads, AR/VR solutions, and AI API tools. Include best practices, key metrics like ROAS, CTR, CPA, campaign objectives, and practical implementation strategies for performance marketing.";

    console.log("🔄 Generating presentation with SlidesGPT...");

    const response = await fetch(
      "https://api.slidesgpt.com/v1/presentations/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slideApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: finalPrompt }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ SlidesGPT API Error:", errorText);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Slides generated successfully:", result);

    res.json({
      status: "success",
      message: "Presentation generated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Slides generation failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate presentation",
      error: error.message,
    });
  }
});

/**
 * @route   GET api/training-modules/download-slides/:id
 * @desc    Download presentation slides as PPTX
 * @access  Private
 */
router.get("/download-slides/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const slideApiKey = process.env.slideapi;

    if (!slideApiKey) {
      return res.status(500).json({
        status: "error",
        message: "Slides API key not configured",
      });
    }

    console.log("📥 Downloading presentation:", id);

    const response = await fetch(
      `https://api.slidesgpt.com/v1/presentations/${id}/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${slideApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Download failed:", errorText);
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`
      );
    }

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="training-module-${id}.pptx"`
    );

    // Get the buffer and send it
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("❌ Slides download failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to download presentation",
      error: error.message,
    });
  }
});

export default router;
