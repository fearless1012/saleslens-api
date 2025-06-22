import axios from "axios";
import fs from "fs/promises";
import path from "path";

export interface StableDiffusionRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_images_per_prompt?: number;
  seed?: number;
}

export interface StableDiffusionVideoRequest extends StableDiffusionRequest {
  num_frames?: number;
  fps?: number;
  motion_bucket_id?: number;
  noise_aug_strength?: number;
}

export class StableDiffusionService {
  private huggingFaceToken: string;
  private localAPIUrl: string;
  private outputDir: string;

  constructor() {
    this.huggingFaceToken = process.env.HUGGING_FACE_TOKEN || "";
    this.localAPIUrl =
      process.env.STABLE_DIFFUSION_LOCAL_URL || "http://localhost:7860";
    this.outputDir = path.join(process.cwd(), "media_output", "images");
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating output directory:", error);
    }
  }

  /**
   * Generate images using Stable Diffusion via Hugging Face API
   */
  async generateImage(request: StableDiffusionRequest): Promise<string> {
    console.log("🎨 Generating image with Stable Diffusion...");
    console.log("📝 Prompt:", request.prompt);

    try {
      // Try Hugging Face API first
      if (this.huggingFaceToken) {
        return await this.generateViaHuggingFace(request);
      }

      // Fallback to local API
      return await this.generateViaLocalAPI(request);
    } catch (error) {
      console.error("❌ Image generation failed:", error);
      // Return a placeholder image path for testing
      return await this.generatePlaceholderImage(request.prompt);
    }
  }

  /**
   * Generate video using Stable Video Diffusion
   */
  async generateVideo(request: StableDiffusionVideoRequest): Promise<string> {
    console.log("🎬 Generating video with Stable Video Diffusion...");
    console.log("📝 Prompt:", request.prompt);
    console.log(
      "⚙️ Available methods:",
      this.getAvailableVideoMethods().join(", ")
    );

    // Validate request
    if (!this.validateVideoRequest(request)) {
      return await this.generatePlaceholderVideo(request.prompt);
    }

    try {
      if (this.huggingFaceToken) {
        console.log("🌐 Attempting HuggingFace video generation...");
        return await this.generateVideoViaHuggingFace(request);
      }

      console.log("🏠 Attempting local video generation...");
      return await this.generateVideoViaLocalAPI(request);
    } catch (error) {
      console.error("❌ Video generation failed:", error);
      return await this.generatePlaceholderVideo(request.prompt);
    }
  }

  /**
   * Generate multiple images for a training module
   */
  async generateTrainingImages(
    lessonTitles: string[],
    basePrompt: string = "professional training presentation slide"
  ): Promise<Array<{ title: string; imagePath: string }>> {
    console.log(
      "🖼️ Generating training images for",
      lessonTitles.length,
      "lessons..."
    );

    const results: Array<{ title: string; imagePath: string }> = [];

    for (const [index, title] of lessonTitles.entries()) {
      try {
        console.log(
          `🎨 Generating image ${index + 1}/${lessonTitles.length}: ${title}`
        );

        const prompt = `${basePrompt}, "${title}", clean modern design, professional graphics, educational content, high quality, detailed illustration`;

        const imagePath = await this.generateImage({
          prompt,
          negative_prompt:
            "blurry, low quality, text, watermark, logo, signature",
          width: 1024,
          height: 768,
          num_inference_steps: 20,
          guidance_scale: 7.5,
        });

        results.push({
          title,
          imagePath,
        });

        // Small delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        console.error(`❌ Failed to generate image for "${title}":`, error);

        // Add placeholder for failed generation
        const placeholderPath = await this.generatePlaceholderImage(title);
        results.push({
          title,
          imagePath: placeholderPath,
        });
      }
    }

    console.log("✅ Training images generation completed!");
    return results;
  }

  private async generateViaHuggingFace(
    request: StableDiffusionRequest
  ): Promise<string> {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        inputs: request.prompt,
        parameters: {
          negative_prompt: request.negative_prompt,
          width: request.width || 512,
          height: request.height || 512,
          num_inference_steps: request.num_inference_steps || 20,
          guidance_scale: request.guidance_scale || 7.5,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.huggingFaceToken}`,
          "Content-Type": "application/json",
        },
        responseType: "blob",
      }
    );

    const imageBuffer = Buffer.from(await response.data.arrayBuffer());
    const imagePath = path.join(this.outputDir, `sd_image_${Date.now()}.png`);
    await fs.writeFile(imagePath, imageBuffer);

    console.log("✅ Image saved to:", imagePath);
    return imagePath;
  }

  private async generateVideoViaHuggingFace(
    request: StableDiffusionVideoRequest
  ): Promise<string> {
    console.log("🌐 Generating video via HuggingFace API...");

    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt",
        {
          inputs: request.prompt,
          parameters: {
            num_frames: request.num_frames || 14,
            fps: request.fps || 6,
            motion_bucket_id: request.motion_bucket_id || 127,
            noise_aug_strength: request.noise_aug_strength || 0.02,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.huggingFaceToken}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
          timeout: 60000, // 60 second timeout for video generation
        }
      );

      const videoBuffer = Buffer.from(await response.data.arrayBuffer());
      const videoPath = path.join(
        this.outputDir,
        "../videos",
        `sd_video_${Date.now()}.mp4`
      );

      await fs.mkdir(path.dirname(videoPath), { recursive: true });
      await fs.writeFile(videoPath, videoBuffer);

      console.log("✅ HuggingFace video saved to:", videoPath);
      return videoPath;
    } catch (error: any) {
      console.error("❌ HuggingFace video generation failed:", error.message);

      // Provide specific error details
      if (error.response) {
        console.error("   Status:", error.response.status);
        console.error("   Status Text:", error.response.statusText);

        if (error.response.status === 401) {
          console.error(
            "   🔑 Authentication Error: Invalid or expired HuggingFace token"
          );
          console.error(
            "   💡 Solution: Check HUGGING_FACE_TOKEN in .env file"
          );
        } else if (error.response.status === 403) {
          console.error(
            "   🚫 Access Denied: Token doesn't have access to this model"
          );
          console.error(
            "   💡 Solution: Verify model permissions or upgrade HuggingFace plan"
          );
        } else if (error.response.status === 503) {
          console.log(
            "   ⏳ Model is loading, creating enhanced placeholder..."
          );
          return await this.generateEnhancedVideoPlaceholder(request.prompt);
        } else if (error.response.status === 429) {
          console.error("   ⏱️ Rate Limited: Too many requests");
          console.error(
            "   💡 Solution: Wait before retrying or upgrade HuggingFace plan"
          );
        }
      } else if (error.code === "ECONNREFUSED") {
        console.error("   🌐 Network Error: Cannot connect to HuggingFace API");
      } else if (error.code === "ETIMEDOUT") {
        console.error("   ⏰ Timeout: Request took too long");
      }

      // For authentication errors, skip to image sequence instead of basic placeholder
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log("   🔄 Trying image sequence video as fallback...");
        return await this.createImageSequenceVideo(request);
      }

      // For other errors, create placeholder
      return await this.generatePlaceholderVideo(request.prompt);
    }
  }

  private async generateViaLocalAPI(
    request: StableDiffusionRequest
  ): Promise<string> {
    const response = await axios.post(`${this.localAPIUrl}/sdapi/v1/txt2img`, {
      prompt: request.prompt,
      negative_prompt: request.negative_prompt || "",
      width: request.width || 512,
      height: request.height || 512,
      steps: request.num_inference_steps || 20,
      cfg_scale: request.guidance_scale || 7.5,
      batch_size: 1,
      seed: request.seed || -1,
    });

    // Decode base64 image
    const imageData = response.data.images[0];
    const imageBuffer = Buffer.from(imageData, "base64");
    const imagePath = path.join(this.outputDir, `sd_local_${Date.now()}.png`);
    await fs.writeFile(imagePath, imageBuffer);

    console.log("✅ Local image saved to:", imagePath);
    return imagePath;
  }

  private async generateVideoViaLocalAPI(
    request: StableDiffusionVideoRequest
  ): Promise<string> {
    console.log("🏠 Attempting local video generation...");

    try {
      // First, try to check if local Stable Diffusion API is available
      const healthCheck = await axios.get(`${this.localAPIUrl}/`, {
        timeout: 5000,
      });

      if (healthCheck.status === 200) {
        console.log(
          "✅ Local API is available, attempting video generation..."
        );

        // Try video generation via local API (if supported)
        const response = await axios.post(
          `${this.localAPIUrl}/sdapi/v1/txt2vid`,
          {
            prompt: request.prompt,
            width: request.width || 512,
            height: request.height || 512,
            num_frames: request.num_frames || 14,
            fps: request.fps || 6,
            steps: request.num_inference_steps || 20,
            cfg_scale: request.guidance_scale || 7.5,
          },
          { timeout: 120000 }
        ); // 2 minute timeout for video

        if (response.data && response.data.video) {
          const videoBuffer = Buffer.from(response.data.video, "base64");
          const videoPath = path.join(
            this.outputDir,
            "../videos",
            `local_video_${Date.now()}.mp4`
          );
          await fs.mkdir(path.dirname(videoPath), { recursive: true });
          await fs.writeFile(videoPath, videoBuffer);

          console.log("✅ Local video generated:", videoPath);
          return videoPath;
        }
      }
    } catch (error: any) {
      console.log("⚠️ Local video API not available or failed:", error.message);
    }

    // If local API fails, try to create a simple image sequence as video alternative
    console.log("🔄 Creating image-based video alternative...");
    return await this.createImageSequenceVideo(request);
  }

  /**
   * Create a video alternative by generating a sequence of images
   */
  private async createImageSequenceVideo(
    request: StableDiffusionVideoRequest
  ): Promise<string> {
    console.log("🖼️ Creating image sequence as video alternative...");

    try {
      // Generate a few variations of the same prompt for pseudo-animation
      const imagePrompts = [
        `${request.prompt} - opening scene`,
        `${request.prompt} - main content`,
        `${request.prompt} - conclusion scene`,
      ];

      const imagePaths: string[] = [];

      for (const [index, prompt] of imagePrompts.entries()) {
        console.log(`📸 Generating image ${index + 1}/3 for video sequence...`);

        try {
          const imagePath = await this.generateImage({
            prompt: prompt,
            width: request.width || 1024,
            height: request.height || 576,
            num_inference_steps: 20,
          });
          imagePaths.push(imagePath);
        } catch (error) {
          console.log(
            `⚠️ Failed to generate image ${index + 1}, continuing...`
          );
        }
      }

      if (imagePaths.length > 0) {
        // Create a metadata file describing the image sequence "video"
        const videoMetadataPath = path.join(
          this.outputDir,
          "../videos",
          `image_sequence_video_${Date.now()}.json`
        );

        const videoMetadata = {
          type: "image_sequence_video",
          images: imagePaths,
          metadata: {
            generatedAt: new Date().toISOString(),
            prompt: request.prompt,
            imageCount: imagePaths.length,
            suggestedDuration: imagePaths.length * 3, // 3 seconds per image
            format: "image_sequence",
            description: "Series of images representing video content",
          },
        };

        await fs.mkdir(path.dirname(videoMetadataPath), { recursive: true });
        await fs.writeFile(
          videoMetadataPath,
          JSON.stringify(videoMetadata, null, 2)
        );

        console.log("✅ Image sequence video created:", videoMetadataPath);
        return videoMetadataPath;
      }
    } catch (error) {
      console.error("❌ Failed to create image sequence video:", error);
    }

    // Final fallback
    return await this.generatePlaceholderVideo(request.prompt);
  }

  private async generatePlaceholderImage(prompt: string): Promise<string> {
    console.log("🖼️ Generating placeholder image...");

    // Create a simple placeholder image with the prompt text
    const placeholderPath = path.join(
      this.outputDir,
      `placeholder_${Date.now()}.txt`
    );
    const placeholderContent = `Placeholder Image\n\nPrompt: ${prompt}\n\nGenerated at: ${new Date().toISOString()}`;

    await fs.writeFile(placeholderPath, placeholderContent);

    console.log("📄 Placeholder saved to:", placeholderPath);
    return placeholderPath;
  }

  private async generatePlaceholderVideo(prompt: string): Promise<string> {
    console.log("🎬 Generating placeholder video...");

    const placeholderPath = path.join(
      this.outputDir,
      "../videos",
      `placeholder_video_${Date.now()}.txt`
    );
    await fs.mkdir(path.dirname(placeholderPath), { recursive: true });

    const placeholderContent = `Placeholder Video\n\nPrompt: ${prompt}\n\nGenerated at: ${new Date().toISOString()}`;

    await fs.writeFile(placeholderPath, placeholderContent);

    console.log("📄 Video placeholder saved to:", placeholderPath);
    return placeholderPath;
  }

  private async generateEnhancedVideoPlaceholder(
    prompt: string
  ): Promise<string> {
    console.log(
      "🎬 Generating enhanced video placeholder with detailed metadata..."
    );

    const placeholderPath = path.join(
      this.outputDir,
      "../videos",
      `enhanced_placeholder_video_${Date.now()}.json`
    );
    await fs.mkdir(path.dirname(placeholderPath), { recursive: true });

    const enhancedPlaceholder = {
      type: "video_placeholder",
      status: "model_loading",
      prompt: prompt,
      metadata: {
        generatedAt: new Date().toISOString(),
        reason: "HuggingFace model loading or temporarily unavailable",
        expectedDuration: "10-15 seconds",
        resolution: "1024x576",
        format: "mp4",
        description:
          "Training video placeholder with detailed content information",
      },
      content: {
        title: prompt.split('"')[1] || "Training Video",
        description: `This would be a professional training video based on: ${prompt}`,
        keyPoints: [
          "Professional presentation format",
          "Educational content delivery",
          "Visual learning enhancement",
          "Engagement optimization",
        ],
      },
      technicalSpecs: {
        frames: 14,
        fps: 6,
        codec: "H.264",
        bitrate: "2000 kbps",
      },
    };

    await fs.writeFile(
      placeholderPath,
      JSON.stringify(enhancedPlaceholder, null, 2)
    );

    console.log("📄 Enhanced video placeholder saved to:", placeholderPath);
    return placeholderPath;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old generated files
   */
  async cleanupOldFiles(olderThanHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.outputDir);
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          console.log("🗑️ Cleaned up old file:", file);
        }
      }
    } catch (error) {
      console.error("Error cleaning up files:", error);
    }
  }

  /**
   * Get available video generation methods
   */
  getAvailableVideoMethods(): string[] {
    const methods = [];

    if (this.huggingFaceToken) {
      methods.push("huggingface");
    }

    methods.push("local_api");
    methods.push("image_sequence");
    methods.push("placeholder");

    return methods;
  }

  /**
   * Validate video generation request
   */
  private validateVideoRequest(request: StableDiffusionVideoRequest): boolean {
    if (!request.prompt || request.prompt.trim().length === 0) {
      console.error("❌ Video request missing prompt");
      return false;
    }

    if (
      request.num_frames &&
      (request.num_frames < 1 || request.num_frames > 100)
    ) {
      console.warn("⚠️ Unusual frame count, adjusting to safe range");
      request.num_frames = Math.max(1, Math.min(100, request.num_frames));
    }

    return true;
  }

  /**
   * Validate HuggingFace token and API access
   */
  async validateHuggingFaceAccess(): Promise<{
    valid: boolean;
    hasImageAccess: boolean;
    hasVideoAccess: boolean;
    error?: string;
  }> {
    if (!this.huggingFaceToken) {
      return {
        valid: false,
        hasImageAccess: false,
        hasVideoAccess: false,
        error: "No HuggingFace token provided",
      };
    }

    try {
      // Test basic image generation access
      console.log("🔍 Testing HuggingFace image model access...");
      const imageResponse = await axios.get(
        "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
        {
          headers: {
            Authorization: `Bearer ${this.huggingFaceToken}`,
          },
          timeout: 10000,
        }
      );

      const hasImageAccess = imageResponse.status === 200;

      // Test video generation access
      console.log("🔍 Testing HuggingFace video model access...");
      let hasVideoAccess = false;
      try {
        const videoResponse = await axios.get(
          "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt",
          {
            headers: {
              Authorization: `Bearer ${this.huggingFaceToken}`,
            },
            timeout: 10000,
          }
        );
        hasVideoAccess = videoResponse.status === 200;
      } catch (videoError: any) {
        console.log(
          "⚠️ Video model access failed:",
          videoError.response?.status || videoError.message
        );
      }

      return {
        valid: hasImageAccess,
        hasImageAccess,
        hasVideoAccess,
      };
    } catch (error: any) {
      let errorMessage = "Unknown error";

      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = "Invalid or expired HuggingFace token";
            break;
          case 403:
            errorMessage = "Token doesn't have required permissions";
            break;
          case 429:
            errorMessage = "Rate limited - too many requests";
            break;
          default:
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.code === "ECONNREFUSED") {
        errorMessage = "Cannot connect to HuggingFace API";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage = "Request timeout";
      }

      return {
        valid: false,
        hasImageAccess: false,
        hasVideoAccess: false,
        error: errorMessage,
      };
    }
  }
}
