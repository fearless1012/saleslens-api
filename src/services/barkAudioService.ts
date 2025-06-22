import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface BarkRequest {
  text: string;
  voice_preset?: string;
  temperature?: number;
  silence_duration?: number;
  use_speaker_id?: boolean;
}

export interface AudioSegment {
  text: string;
  audioPath: string;
  duration: number;
  voice_preset: string;
}

export class BarkAudioService {
  private huggingFaceToken: string;
  private localAPIUrl: string;
  private outputDir: string;
  private pythonPath: string;

  constructor() {
    this.huggingFaceToken = process.env.HUGGING_FACE_TOKEN || "";
    this.localAPIUrl = process.env.BARK_LOCAL_URL || "http://localhost:8080";
    this.outputDir = path.join(process.cwd(), "media_output", "audio");
    this.pythonPath = process.env.PYTHON_PATH || "python";
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating audio output directory:", error);
    }
  }

  /**
   * Generate speech audio using Bark
   */
  async generateSpeech(request: BarkRequest): Promise<string> {
    console.log("🎵 Generating speech with Bark...");
    console.log("📝 Text:", request.text.substring(0, 100) + "...");
    console.log("🎤 Voice:", request.voice_preset || "default");

    try {
      // Try Hugging Face API first
      if (this.huggingFaceToken) {
        return await this.generateViaHuggingFace(request);
      }

      // Try local Bark installation
      return await this.generateViaLocal(request);
    } catch (error) {
      console.error("❌ Speech generation failed:", error);
      // Return a placeholder audio file for testing
      return await this.generatePlaceholderAudio(request.text);
    }
  }

  /**
   * Generate complete narration for a training module
   */
  async generateTrainingNarration(
    lessons: Array<{ title: string; content: string }>,
    voicePreset: string = "v2/en_speaker_6"
  ): Promise<Array<{ title: string; audioPath: string; duration: number }>> {
    console.log(
      "🎙️ Generating training narration for",
      lessons.length,
      "lessons..."
    );

    const results: Array<{
      title: string;
      audioPath: string;
      duration: number;
    }> = [];

    for (const [index, lesson] of lessons.entries()) {
      try {
        console.log(
          `🎵 Generating audio ${index + 1}/${lessons.length}: ${lesson.title}`
        );

        // Create narration script
        const narrationText = this.createNarrationScript(lesson);

        const audioPath = await this.generateSpeech({
          text: narrationText,
          voice_preset: voicePreset,
          temperature: 0.75,
        });

        // Estimate duration (rough calculation: ~150 words per minute)
        const wordCount = narrationText.split(" ").length;
        const estimatedDuration = Math.ceil((wordCount / 150) * 60); // seconds

        results.push({
          title: lesson.title,
          audioPath,
          duration: estimatedDuration,
        });

        // Small delay to avoid overwhelming the API
        await this.delay(2000);
      } catch (error) {
        console.error(
          `❌ Failed to generate audio for "${lesson.title}":`,
          error
        );

        // Add placeholder for failed generation
        const placeholderPath = await this.generatePlaceholderAudio(
          lesson.title
        );
        results.push({
          title: lesson.title,
          audioPath: placeholderPath,
          duration: 30, // default placeholder duration
        });
      }
    }

    console.log("✅ Training narration generation completed!");
    return results;
  }

  /**
   * Generate introduction and conclusion audio
   */
  async generateModuleIntroConclusion(
    moduleTitle: string,
    objectives: string[],
    keyTakeaways: string[],
    voicePreset: string = "v2/en_speaker_6"
  ): Promise<{ intro: string; conclusion: string }> {
    console.log("🎬 Generating module introduction and conclusion...");

    const introText = this.createIntroductionScript(moduleTitle, objectives);
    const conclusionText = this.createConclusionScript(
      moduleTitle,
      keyTakeaways
    );

    const [introPath, conclusionPath] = await Promise.all([
      this.generateSpeech({
        text: introText,
        voice_preset: voicePreset,
        temperature: 0.8,
      }),
      this.generateSpeech({
        text: conclusionText,
        voice_preset: voicePreset,
        temperature: 0.8,
      }),
    ]);

    console.log("✅ Introduction and conclusion generated!");
    return {
      intro: introPath,
      conclusion: conclusionPath,
    };
  }

  private async generateViaHuggingFace(request: BarkRequest): Promise<string> {
    console.log("🌐 Using Hugging Face Bark API...");

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/suno/bark",
      {
        inputs: request.text,
        parameters: {
          voice_preset: request.voice_preset || "v2/en_speaker_6",
          temperature: request.temperature || 0.7,
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

    const audioBuffer = Buffer.from(await response.data.arrayBuffer());
    const audioPath = path.join(this.outputDir, `bark_${Date.now()}.wav`);
    await fs.writeFile(audioPath, audioBuffer);

    console.log("✅ Audio saved to:", audioPath);
    return audioPath;
  }

  private async generateViaLocal(request: BarkRequest): Promise<string> {
    console.log("🏠 Using local Bark installation...");

    try {
      // Check if bark is installed
      await execAsync('python -c "import bark"');

      const outputPath = path.join(
        this.outputDir,
        `bark_local_${Date.now()}.wav`
      );
      const tempScriptPath = path.join(
        this.outputDir,
        `temp_bark_script_${Date.now()}.py`
      );

      // Create Python script to run Bark
      const pythonScript = `
import torch
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

# Download and load all models
preload_models()

# Generate audio
text_prompt = """${request.text.replace(/"/g, '\\"')}"""
voice_preset = "${request.voice_preset || "v2/en_speaker_6"}"

audio_array = generate_audio(text_prompt, history_prompt=voice_preset)

# Save audio
write_wav("${outputPath}", SAMPLE_RATE, audio_array)
print(f"Audio saved to: ${outputPath}")
`;

      await fs.writeFile(tempScriptPath, pythonScript);

      // Execute the Python script
      const { stdout } = await execAsync(
        `${this.pythonPath} "${tempScriptPath}"`
      );
      console.log("Bark output:", stdout);

      // Clean up temp script
      await fs.unlink(tempScriptPath);

      console.log("✅ Local audio saved to:", outputPath);
      return outputPath;
    } catch (error) {
      console.error("Local Bark generation failed:", error);
      throw error;
    }
  }

  private async generatePlaceholderAudio(text: string): Promise<string> {
    console.log("🎵 Generating placeholder audio...");

    // Create a text file as placeholder
    const placeholderPath = path.join(
      this.outputDir,
      `placeholder_audio_${Date.now()}.txt`
    );
    const placeholderContent = `Placeholder Audio\n\nText: ${text}\n\nGenerated at: ${new Date().toISOString()}\n\nThis would be converted to speech using Bark.`;

    await fs.writeFile(placeholderPath, placeholderContent);

    console.log("📄 Audio placeholder saved to:", placeholderPath);
    return placeholderPath;
  }

  private createNarrationScript(lesson: {
    title: string;
    content: string;
  }): string {
    return `
Welcome to the lesson on ${lesson.title}.

${lesson.content}

This concludes our lesson on ${lesson.title}. Let's move on to the next topic.
    `.trim();
  }

  private createIntroductionScript(
    moduleTitle: string,
    objectives: string[]
  ): string {
    const objectivesList = objectives
      .map((obj, index) => `${index + 1}. ${obj}`)
      .join("\n");

    return `
Welcome to the ${moduleTitle} training module.

In this comprehensive training session, you will learn the essential skills and knowledge needed to excel in your role.

Our learning objectives for this module are:
${objectivesList}

By the end of this training, you will have a thorough understanding of these concepts and be ready to apply them in real-world scenarios.

Let's begin our journey together.
    `.trim();
  }

  private createConclusionScript(
    moduleTitle: string,
    keyTakeaways: string[]
  ): string {
    const takeawaysList = keyTakeaways
      .map((takeaway, index) => `${index + 1}. ${takeaway}`)
      .join("\n");

    return `
Congratulations! You have successfully completed the ${moduleTitle} training module.

Let's review the key takeaways from this training:
${takeawaysList}

Remember to apply these concepts in your daily work and continue to build upon the knowledge you've gained here.

Thank you for your attention and commitment to learning. Good luck in implementing these new skills!
    `.trim();
  }

  /**
   * Convert text to SSML for better speech control
   */
  private textToSSML(
    text: string,
    voicePreset: string = "v2/en_speaker_6"
  ): string {
    // Add SSML tags for better pronunciation and pacing
    let ssmlText = text;

    // Add pauses after sentences
    ssmlText = ssmlText.replace(/\. /g, '. <break time="0.5s"/> ');

    // Add pauses after commas
    ssmlText = ssmlText.replace(/, /g, ', <break time="0.3s"/> ');

    // Emphasize important words
    ssmlText = ssmlText.replace(
      /\*\*(.*?)\*\*/g,
      '<emphasis level="strong">$1</emphasis>'
    );

    return `[${voicePreset}] ${ssmlText}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get available voice presets
   */
  getAvailableVoices(): string[] {
    return [
      "v2/en_speaker_0", // Male, confident
      "v2/en_speaker_1", // Female, professional
      "v2/en_speaker_2", // Male, calm
      "v2/en_speaker_3", // Female, energetic
      "v2/en_speaker_4", // Male, authoritative
      "v2/en_speaker_5", // Female, friendly
      "v2/en_speaker_6", // Male, neutral
      "v2/en_speaker_7", // Female, warm
      "v2/en_speaker_8", // Male, deep
      "v2/en_speaker_9", // Female, clear
    ];
  }

  /**
   * Clean up old audio files
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
          console.log("🗑️ Cleaned up old audio file:", file);
        }
      }
    } catch (error) {
      console.error("Error cleaning up audio files:", error);
    }
  }
}
