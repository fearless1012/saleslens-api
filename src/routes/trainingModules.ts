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

export default router;
