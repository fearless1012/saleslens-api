import { Router, Request, Response } from "express";
import {
  uploadKnowledge,
  uploadCustomer,
  uploadTranscript,
  handleMulterError,
} from "../middleware/fileUpload";
import { DomainKnowledge } from "../models/domainKnowledge";
import { Customer } from "../models/customer";
import { Pitch } from "../models/pitch";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const router = Router();

// Helper to extract text content from files (simplified version)
// In a real app, you would use libraries like pdf-parse, docx, etc.
const extractTextContent = (filePath: string): Promise<string> => {
  return new Promise((resolve) => {
    // This is a placeholder - you'd use appropriate libraries based on file type
    resolve("Text content would be extracted here");
  });
};

/**
 * @route POST /api/upload/knowledge
 * @desc Upload domain knowledge document
 * @access Private (Admin)
 */
router.post(
  "/knowledge",
  uploadKnowledge.single("file"),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const { title, description, category, tags } = req.body;

      // Extract text content for searchability
      const filePath = path.join(__dirname, "../../", file.path);
      const content = await extractTextContent(filePath);

      // Create document in database
      const domainKnowledge = new DomainKnowledge({
        title: title || file.originalname.split(".")[0],
        description:
          description || `Domain knowledge document: ${file.originalname}`,
        fileUrl: `/uploads/knowledge/${path.basename(file.path)}`,
        fileType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
        category: category || "product", // Changed from "other" to "product" for Meta offerings
        tags: tags ? JSON.parse(tags) : [],
        uploadedBy: req.body.userId || new mongoose.Types.ObjectId(), // Temporary fallback
      });

      await domainKnowledge.save();

      res.status(201).json({
        success: true,
        data: domainKnowledge,
        message: "Domain knowledge document uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading domain knowledge:", error);
      res.status(500).json({
        message: "Server error while uploading file",
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/upload/customer
 * @desc Upload customer database
 * @access Private (Admin)
 */
router.post(
  "/customer",
  uploadCustomer.single("file"),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const filePath = file.path;

      // Read and parse the file content
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const customers = parseCustomerData(fileContent, file.originalname);

      // Create customer entries in database
      const createdCustomers = [];
      const errors = [];

      for (const customerData of customers) {
        try {
          const customer = new Customer({
            ...customerData,
            originalData: JSON.stringify(customerData),
            uploadedBy: req.body.userId || new mongoose.Types.ObjectId(),
          });

          await customer.save();
          createdCustomers.push(customer);
        } catch (error: any) {
          errors.push({
            customerName: customerData.name,
            error: error.message,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          totalProcessed: customers.length,
          successfullyCreated: createdCustomers.length,
          errors: errors.length,
          customers: createdCustomers,
          errorDetails: errors,
        },
        message: `Customer database uploaded successfully. Created ${createdCustomers.length} out of ${customers.length} customers.`,
      });
    } catch (error: any) {
      console.error("Error uploading customer database:", error);
      res.status(500).json({
        message: "Server error while uploading file",
        error: error.message,
      });
    }
  }
);

// Helper function to parse customer data from various file formats
function parseCustomerData(content: string, filename: string): any[] {
  const customers = [];
  const lines = content.split("\n").filter((line) => line.trim());

  // Detect file format
  if (filename.toLowerCase().endsWith(".csv")) {
    return parseCSVCustomerData(content);
  } else if (filename.toLowerCase().endsWith(".json")) {
    return parseJSONCustomerData(content);
  } else {
    // Default to text format parsing (like the current llama_customers_data.txt)
    return parseTextCustomerData(content);
  }
}

// Parse CSV format
function parseCSVCustomerData(content: string): any[] {
  const lines = content.split("\n").filter((line) => line.trim());
  const customers = [];

  // Assume first line is header
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const customer: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || "";

      // Map common CSV headers to our schema
      if (header.includes("name")) customer.name = value;
      else if (header.includes("company")) customer.company = value;
      else if (header.includes("industry")) customer.industry = value;
      else if (header.includes("status")) customer.status = value;
      else if (header.includes("revenue")) customer.revenue = value;
      else if (header.includes("email")) customer.email = value;
      else if (header.includes("phone")) customer.phone = value;
      else if (header.includes("position") || header.includes("title"))
        customer.position = value;
      else if (header.includes("source")) customer.acquisitionSource = value;
      else if (header.includes("joined") || header.includes("start"))
        customer.dateJoined = parseDate(value);
      else if (header.includes("leave") || header.includes("end"))
        customer.leaveDate = parseDate(value);
      else if (header.includes("reason")) customer.reasonForLeaving = value;
      else {
        // Store unknown fields in customFields
        if (!customer.customFields) customer.customFields = {};
        customer.customFields[header] = value;
      }
    });

    // Ensure required fields
    if (customer.name) {
      customers.push(customer);
    }
  }

  return customers;
}

// Parse JSON format
function parseJSONCustomerData(content: string): any[] {
  try {
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      return data.map((item) => normalizeCustomerObject(item));
    } else if (data.customers && Array.isArray(data.customers)) {
      return data.customers.map((item: any) => normalizeCustomerObject(item));
    } else {
      return [normalizeCustomerObject(data)];
    }
  } catch (error) {
    throw new Error("Invalid JSON format");
  }
}

// Parse text format (like the current file)
function parseTextCustomerData(content: string): any[] {
  const lines = content.split("\n").filter((line) => line.trim());
  const customers = [];

  for (const line of lines) {
    // Skip headers and empty lines
    if (
      line.includes("FORMAT:") ||
      line.includes("Total Records:") ||
      line.includes("Generated Date:") ||
      line.includes("Meta LLama") ||
      line.startsWith("SUMMARY") ||
      line.startsWith("ACQUISITION") ||
      line.startsWith("INDUSTRY") ||
      line.startsWith("REASON") ||
      line.startsWith("Data Generation") ||
      !line.includes("|")
    ) {
      continue;
    }

    // Parse line format: "1. Name | Industry | Revenue | Status | Date Joined | Leave Date | Reason | Source"
    const match = line.match(
      /^\d+\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)$/
    );

    if (match) {
      const [
        ,
        name,
        industry,
        revenue,
        status,
        dateJoined,
        leaveDate,
        reason,
        source,
      ] = match;

      const customer: any = {
        name: name.trim(),
        industry: industry.trim(),
        status: status.trim(),
        acquisitionSource: source.trim(),
      };

      // Parse revenue
      if (revenue && revenue !== "N/A") {
        customer.revenue = parseInt(revenue.replace(/[^0-9]/g, ""));
      }

      // Parse dates
      if (dateJoined && dateJoined !== "N/A") {
        customer.dateJoined = parseDate(dateJoined);
      }

      if (leaveDate && leaveDate !== "N/A") {
        customer.leaveDate = parseDate(leaveDate);
      }

      if (reason && reason !== "N/A") {
        customer.reasonForLeaving = reason.trim();
      }

      customers.push(customer);
    }
  }

  return customers;
}

// Normalize customer object from any format
function normalizeCustomerObject(obj: any): any {
  const customer: any = {};

  // Handle various field name variations
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("name") && !customer.name) customer.name = value;
    else if (lowerKey.includes("company") && !customer.company)
      customer.company = value;
    else if (lowerKey.includes("industry") && !customer.industry)
      customer.industry = value;
    else if (lowerKey.includes("status") && !customer.status)
      customer.status = value;
    else if (lowerKey.includes("revenue") && !customer.revenue)
      customer.revenue = value;
    else if (lowerKey.includes("email") && !customer.email)
      customer.email = value;
    else if (lowerKey.includes("phone") && !customer.phone)
      customer.phone = value;
    else if (
      (lowerKey.includes("position") || lowerKey.includes("title")) &&
      !customer.position
    )
      customer.position = value;
    else if (lowerKey.includes("source") && !customer.acquisitionSource)
      customer.acquisitionSource = value;
    else if (
      (lowerKey.includes("joined") || lowerKey.includes("start")) &&
      !customer.dateJoined
    )
      customer.dateJoined = parseDate(String(value));
    else if (
      (lowerKey.includes("leave") || lowerKey.includes("end")) &&
      !customer.leaveDate
    )
      customer.leaveDate = parseDate(String(value));
    else if (lowerKey.includes("reason") && !customer.reasonForLeaving)
      customer.reasonForLeaving = value;
    else {
      // Store unknown fields in customFields
      if (!customer.customFields) customer.customFields = {};
      customer.customFields[key] = value;
    }
  }

  return customer;
}

// Helper function to parse various date formats
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr || dateStr === "N/A" || dateStr === "") return undefined;

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * @route POST /api/upload/transcript
 * @desc Upload sales pitch transcript
 * @access Private (Admin)
 */
router.post(
  "/transcript",
  uploadTranscript.single("file"),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const {
        title,
        description,
        customerId,
        industry,
        successRate,
        category,
        feedbackNotes,
        tags,
      } = req.body;

      // Parse transcript content if it's a text file
      let transcriptData: any = {};
      if (file.mimetype === "text/plain") {
        try {
          const filePath = path.join(__dirname, "../../", file.path);
          const fileContent = await fs.promises.readFile(filePath, "utf-8");
          transcriptData = parseTranscriptData(fileContent);
        } catch (parseError) {
          console.log("Could not parse transcript data, using defaults");
        }
      }

      // Create pitch entry in database
      const pitch = new Pitch({
        title: title || transcriptData.title || file.originalname.split(".")[0],
        description:
          description ||
          transcriptData.description ||
          `Sales pitch content: ${file.originalname}`,
        fileUrl: `/uploads/transcripts/${path.basename(file.path)}`,
        fileType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
        customer: customerId || new mongoose.Types.ObjectId(), // Temporary fallback
        industry: industry || transcriptData.industry || "General",
        successRate: successRate || transcriptData.successRate || 0,
        status: transcriptData.status || "Draft", // Use normalized default status
        category: category || transcriptData.category || "Solution", // Updated default category
        feedbackNotes:
          feedbackNotes ||
          transcriptData.feedbackNotes ||
          "Uploaded via dashboard",
        tags: tags ? JSON.parse(tags) : transcriptData.tags || [],
        callResult: transcriptData.callResult,
        salesRep: transcriptData.salesRep,
        customFields: transcriptData.customFields || {},
        originalData: JSON.stringify(transcriptData),
        uploadedBy: req.body.userId || new mongoose.Types.ObjectId(),
      });

      await pitch.save();

      res.status(201).json({
        success: true,
        data: pitch,
        message: "Sales pitch transcript uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading sales pitch transcript:", error);
      res.status(500).json({
        message: "Server error while uploading file",
        error: error.message,
      });
    }
  }
);

// Helper function to parse transcript data from text files
function parseTranscriptData(content: string): any {
  const lines = content.split("\n").filter((line) => line.trim());
  const data: any = {
    customFields: {},
    tags: [],
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse structured data at the beginning
    if (
      trimmed.includes(":") &&
      !trimmed.startsWith("Alex:") &&
      !trimmed.startsWith("Sarah:") &&
      !trimmed.startsWith("David:") &&
      !trimmed.startsWith("Emma:") &&
      !trimmed.startsWith("Michael:") &&
      !trimmed.startsWith("Jennifer:") &&
      !trimmed.startsWith("Marcus:") &&
      !trimmed.startsWith("Dr.") &&
      !trimmed.startsWith("Kevin:") &&
      !trimmed.startsWith("Lisa:")
    ) {
      const [key, ...valueParts] = trimmed.split(":");
      const value = valueParts.join(":").trim();

      if (key.toLowerCase().includes("date")) {
        data.customFields.date = value;
      } else if (key.toLowerCase().includes("customer")) {
        data.customFields.customerInfo = value;
        // Extract industry from customer info if possible
        if (
          value.includes("CTO") ||
          value.includes("VP") ||
          value.includes("Director")
        ) {
          const industryMatch = value.match(/at\s+([^,]+)/);
          if (industryMatch) {
            data.industry = industryMatch[1].trim();
          }
        }
      } else if (key.toLowerCase().includes("sales rep")) {
        data.salesRep = value;
      } else if (key.toLowerCase().includes("product")) {
        data.title = value;
        data.description = `Sales pitch for ${value}`;

        // Determine category based on product
        if (value.toLowerCase().includes("analytics")) {
          data.category = "Analytics";
        } else if (
          value.toLowerCase().includes("ai model") ||
          value.toLowerCase().includes("llama")
        ) {
          data.category = "AI Model";
        } else if (
          value.toLowerCase().includes("platform") ||
          value.toLowerCase().includes("suite")
        ) {
          data.category = "Platform";
        } else if (
          value.toLowerCase().includes("detection") ||
          value.toLowerCase().includes("security")
        ) {
          data.category = "Security";
        } else {
          data.category = "Solution";
        }
      } else if (key.toLowerCase().includes("call result")) {
        data.callResult = value;

        // Set status based on call result
        if (value.toLowerCase().includes("successful")) {
          data.status = "Successful";
          data.successRate = 100;
        } else if (value.toLowerCase().includes("failed")) {
          data.status = "Failed";
          data.successRate = 0;
        } else {
          data.status = "Presented";
        }
      } else if (key.toLowerCase().includes("context")) {
        data.feedbackNotes = value;
      } else {
        // Store other fields in customFields
        data.customFields[key.toLowerCase().replace(/\s+/g, "_")] = value;
      }
    }
  }

  // Extract tags from content
  if (data.title) {
    if (data.title.toLowerCase().includes("llama")) data.tags.push("Llama AI");
    if (data.title.toLowerCase().includes("analytics"))
      data.tags.push("Analytics");
    if (data.title.toLowerCase().includes("customer"))
      data.tags.push("Customer Focus");
    if (data.title.toLowerCase().includes("supply"))
      data.tags.push("Supply Chain");
    if (data.title.toLowerCase().includes("clinical"))
      data.tags.push("Healthcare");
    if (data.title.toLowerCase().includes("fraud")) data.tags.push("Security");
  }

  return data;
}

/**
 * @route DELETE /api/upload/knowledge/:id
 * @desc Delete a domain knowledge document
 * @access Private (Admin)
 */
router.delete("/knowledge/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the document
    const document = await DomainKnowledge.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Get file path
    const filePath = path.join(__dirname, "../..", document.fileUrl);

    // Delete file from disk if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database
    await DomainKnowledge.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Domain knowledge document deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting domain knowledge:", error);
    res.status(500).json({
      message: "Server error while deleting file",
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/upload/customer/:id
 * @desc Delete a customer document
 * @access Private (Admin)
 */
router.delete("/customer/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the document
    const document = await Customer.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Delete document from database
    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      message: "Server error while deleting customer",
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/upload/transcript/:id
 * @desc Delete a pitch transcript
 * @access Private (Admin)
 */
router.delete("/transcript/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the document
    const document = await Pitch.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Pitch transcript not found" });
    }

    // Get file path
    const filePath = path.join(__dirname, "../..", document.fileUrl);

    // Delete file from disk if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database
    await Pitch.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Pitch transcript deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting pitch transcript:", error);
    res.status(500).json({
      message: "Server error while deleting file",
      error: error.message,
    });
  }
});

export default router;
