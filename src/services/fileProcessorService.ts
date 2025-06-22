import fs from "fs-extra";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export interface FileContent {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    characterCount: number;
    extractedAt: Date;
    fileType: string;
    fileName: string;
  };
}

export interface ProcessingOptions {
  maxLength?: number;
  preserveFormatting?: boolean;
  includeMetadata?: boolean;
}

export class FileProcessorService {
  /**
   * Process a file and extract its text content
   */
  async processFile(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<FileContent> {
    const {
      maxLength = 50000,
      preserveFormatting = false,
      includeMetadata = true,
    } = options;

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, "..", "..", filePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = await fs.stat(fullPath);
    const fileExtension = path.extname(fullPath).toLowerCase();
    const fileName = path.basename(fullPath);

    let text = "";
    let pageCount: number | undefined;

    try {
      switch (fileExtension) {
        case ".pdf":
          ({ text, pageCount } = await this.processPDF(fullPath));
          break;
        case ".doc":
        case ".docx":
          text = await this.processWord(fullPath);
          break;
        case ".txt":
          text = await this.processText(fullPath);
          break;
        case ".md":
          text = await this.processMarkdown(fullPath);
          break;
        case ".csv":
          text = await this.processCSV(fullPath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Clean and process text
      text = this.cleanText(text, preserveFormatting);

      // Truncate if necessary
      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + "\n\n[Content truncated...]";
      }

      const metadata = {
        pageCount,
        wordCount: this.countWords(text),
        characterCount: text.length,
        extractedAt: new Date(),
        fileType: fileExtension.substring(1),
        fileName,
      };

      return {
        text,
        metadata: includeMetadata
          ? metadata
          : {
              wordCount: metadata.wordCount,
              characterCount: metadata.characterCount,
              extractedAt: metadata.extractedAt,
              fileType: metadata.fileType,
              fileName: metadata.fileName,
            },
      };
    } catch (error: any) {
      throw new Error(`Failed to process file ${fileName}: ${error.message}`);
    }
  }

  /**
   * Process PDF file
   */
  private async processPDF(
    filePath: string
  ): Promise<{ text: string; pageCount: number }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);

      return {
        text: data.text,
        pageCount: data.numpages,
      };
    } catch (error: any) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process Word document
   */
  private async processWord(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      throw new Error(`Word document processing failed: ${error.message}`);
    }
  }

  /**
   * Process plain text file
   */
  private async processText(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error: any) {
      throw new Error(`Text file processing failed: ${error.message}`);
    }
  }

  /**
   * Process Markdown file
   */
  private async processMarkdown(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      // For now, return raw markdown. Could add markdown parser later
      return content;
    } catch (error: any) {
      throw new Error(`Markdown file processing failed: ${error.message}`);
    }
  }

  /**
   * Process CSV file
   */
  private async processCSV(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Convert CSV to readable format
      if (lines.length === 0) return "";

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const result = [`Headers: ${headers.join(", ")}\n`];

      // Add sample rows (first 10)
      const sampleRows = lines.slice(1, 11);
      result.push("Sample Data:");

      sampleRows.forEach((row, index) => {
        if (row.trim()) {
          const values = row.split(",").map((v) => v.trim().replace(/"/g, ""));
          result.push(`Row ${index + 1}: ${values.join(" | ")}`);
        }
      });

      if (lines.length > 11) {
        result.push(`\n... and ${lines.length - 11} more rows`);
      }

      return result.join("\n");
    } catch (error: any) {
      throw new Error(`CSV file processing failed: ${error.message}`);
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string, preserveFormatting: boolean): string {
    if (!text) return "";

    let cleaned = text;

    if (!preserveFormatting) {
      // Remove excessive whitespace
      cleaned = cleaned.replace(/\s+/g, " ");

      // Remove multiple consecutive newlines
      cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n");

      // Trim each line
      cleaned = cleaned
        .split("\n")
        .map((line) => line.trim())
        .join("\n");
    }

    // Remove null characters and other control characters
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Trim overall
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Extract file content from database record
   */
  async extractContentFromFileRecord(fileRecord: any): Promise<FileContent> {
    const { fileUrl, fileName, fileType } = fileRecord;

    // Construct full file path
    const filePath = path.join(__dirname, "..", "..", fileUrl);

    return this.processFile(filePath, {
      maxLength: 10000, // Reasonable limit for AI processing
      preserveFormatting: false,
      includeMetadata: true,
    });
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return [".pdf", ".doc", ".docx", ".txt", ".md", ".csv"];
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return this.getSupportedFileTypes().includes(extension);
  }

  /**
   * Get file size estimate for processing
   */
  async getProcessingEstimate(filePath: string): Promise<{
    fileSize: number;
    estimatedProcessingTime: number; // in seconds
    estimatedTokens: number;
  }> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, "..", "..", filePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = await fs.stat(fullPath);
    const fileSize = fileStats.size;

    // Rough estimates based on file size and type
    const fileExtension = path.extname(fullPath).toLowerCase();

    let processingTimeMultiplier = 1;
    let tokenMultiplier = 0.25; // Rough estimate: 4 characters per token

    switch (fileExtension) {
      case ".pdf":
        processingTimeMultiplier = 2;
        tokenMultiplier = 0.2;
        break;
      case ".doc":
      case ".docx":
        processingTimeMultiplier = 1.5;
        tokenMultiplier = 0.25;
        break;
      case ".txt":
      case ".md":
        processingTimeMultiplier = 0.5;
        tokenMultiplier = 0.25;
        break;
      case ".csv":
        processingTimeMultiplier = 1;
        tokenMultiplier = 0.1; // CSV is more structured, fewer tokens per byte
        break;
    }

    const estimatedProcessingTime = Math.max(
      1,
      (fileSize / (1024 * 1024)) * processingTimeMultiplier
    );
    const estimatedTokens = Math.round(fileSize * tokenMultiplier);

    return {
      fileSize,
      estimatedProcessingTime,
      estimatedTokens: Math.min(estimatedTokens, 100000), // Cap at reasonable limit
    };
  }
}

// Export singleton instance
export const fileProcessorService = new FileProcessorService();
