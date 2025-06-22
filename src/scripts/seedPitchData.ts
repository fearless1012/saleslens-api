import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { Pitch } from "../models/pitch";
import { Customer } from "../models/customer";
import { createDefaultAdminUser } from "../middleware/seedAuth";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface ParsedPitchData {
  date: string;
  customer: string;
  salesRep: string;
  product: string;
  callResult: string;
  context: string;
  transcript: string;
  filename: string;
}

const parsePitchFile = (
  content: string,
  filename: string
): ParsedPitchData | null => {
  try {
    const lines = content.split("\n");
    const data: any = {
      filename,
      transcript: "",
    };

    let inTranscript = false;

    for (const line of lines) {
      const cleanLine = line.trim();

      if (cleanLine.startsWith("Date:")) {
        data.date = cleanLine.replace("Date:", "").trim();
      } else if (cleanLine.startsWith("Customer:")) {
        data.customer = cleanLine.replace("Customer:", "").trim();
      } else if (cleanLine.startsWith("Sales Rep:")) {
        data.salesRep = cleanLine.replace("Sales Rep:", "").trim();
      } else if (cleanLine.startsWith("Product:")) {
        data.product = cleanLine.replace("Product:", "").trim();
      } else if (cleanLine.startsWith("Call Result:")) {
        data.callResult = cleanLine.replace("Call Result:", "").trim();
      } else if (cleanLine.startsWith("Context:")) {
        data.context = cleanLine.replace("Context:", "").trim();
      } else if (cleanLine === "Transcript:") {
        inTranscript = true;
      } else if (inTranscript && cleanLine) {
        data.transcript += line + "\n";
      }
    }

    return data as ParsedPitchData;
  } catch (error) {
    console.error(`Error parsing file ${filename}:`, error);
    return null;
  }
};

const extractIndustryFromCustomer = (customer: string): string => {
  const lowerCustomer = customer.toLowerCase();

  if (lowerCustomer.includes("retail") || lowerCustomer.includes("commerce"))
    return "Retail";
  if (lowerCustomer.includes("tech") || lowerCustomer.includes("software"))
    return "Technology";
  if (lowerCustomer.includes("health") || lowerCustomer.includes("medical"))
    return "Healthcare";
  if (lowerCustomer.includes("finance") || lowerCustomer.includes("bank"))
    return "Financial Services";
  if (
    lowerCustomer.includes("manufacturing") ||
    lowerCustomer.includes("factory")
  )
    return "Manufacturing";
  if (lowerCustomer.includes("logistics") || lowerCustomer.includes("supply"))
    return "Logistics";
  if (
    lowerCustomer.includes("education") ||
    lowerCustomer.includes("university")
  )
    return "Education";
  if (
    lowerCustomer.includes("media") ||
    lowerCustomer.includes("entertainment")
  )
    return "Media & Entertainment";

  return "Technology"; // Default
};

const extractCompanyName = (customer: string): string => {
  const parts = customer.split(" at ");
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return customer.split(",")[0].trim();
};

const extractContactName = (customer: string): string => {
  const parts = customer.split(",");
  return parts[0].trim();
};

const categorizeProduct = (product: string): string => {
  const lowerProduct = product.toLowerCase();

  if (lowerProduct.includes("analytics") || lowerProduct.includes("insight"))
    return "Analytics";
  if (lowerProduct.includes("ai model") || lowerProduct.includes("llama"))
    return "AI Model";
  if (
    lowerProduct.includes("optimization") ||
    lowerProduct.includes("supply chain")
  )
    return "Solution";
  if (lowerProduct.includes("security") || lowerProduct.includes("fraud"))
    return "Security";
  if (lowerProduct.includes("platform") || lowerProduct.includes("suite"))
    return "Platform";

  return "AI Model"; // Default
};

const normalizeCallResult = (callResult: string): string => {
  const lower = callResult.toLowerCase();

  if (lower.includes("successful") || lower.includes("success"))
    return "Successful";
  if (lower.includes("failed") || lower.includes("unsuccessful"))
    return "Failed";
  if (lower.includes("pending") || lower.includes("follow")) return "Pending";

  return callResult;
};

const seedPitchData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/saleslens"
    );
    console.log("Connected to MongoDB");

    // Find or create a default user for seeding
    const defaultUser = await createDefaultAdminUser();

    // Clear existing pitch data
    await Pitch.deleteMany({});
    console.log("Cleared existing pitch data");

    // Read pitch files from synthetic data directory
    const pitchDataDir = path.join(
      __dirname,
      "../../../saleslens/sythetic-data/former-sales-pitches"
    );
    const files = fs
      .readdirSync(pitchDataDir)
      .filter((file) => file.endsWith(".txt") && file !== "starter.txt");

    console.log(`Found ${files.length} pitch files to process`);

    const pitchesToCreate = [];
    const customersToCreate = new Map();

    for (const file of files) {
      const filePath = path.join(pitchDataDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsedData = parsePitchFile(content, file);

      if (parsedData) {
        const companyName = extractCompanyName(parsedData.customer);
        const contactName = extractContactName(parsedData.customer);
        const industry = extractIndustryFromCustomer(parsedData.customer);

        // Create or get customer
        if (!customersToCreate.has(companyName)) {
          customersToCreate.set(companyName, {
            name: contactName,
            company: companyName,
            industry: industry,
            status: "Active",
            uploadedBy: defaultUser._id,
          });
        }

        // Create pitch
        const pitch = {
          title: `${companyName} - ${categorizeProduct(parsedData.product)}`,
          description: parsedData.context,
          fileUrl: `/uploads/pitches/${file}`, // Virtual file path
          fileType: "txt",
          fileName: file,
          fileSize: Buffer.byteLength(content, "utf8"),
          industry: industry,
          successRate:
            normalizeCallResult(parsedData.callResult) === "Successful"
              ? 85
              : normalizeCallResult(parsedData.callResult) === "Failed"
              ? 15
              : 50,
          status:
            normalizeCallResult(parsedData.callResult) === "Successful"
              ? "Successful"
              : normalizeCallResult(parsedData.callResult) === "Failed"
              ? "Failed"
              : "Pending",
          category: categorizeProduct(parsedData.product),
          feedbackNotes: `Call with ${parsedData.customer} regarding ${parsedData.product}`,
          tags: [
            industry,
            categorizeProduct(parsedData.product),
            normalizeCallResult(parsedData.callResult),
          ],
          callResult: normalizeCallResult(parsedData.callResult),
          salesRep: parsedData.salesRep,
          customFields: {
            date: parsedData.date,
            customer: parsedData.customer,
            product: parsedData.product,
            transcript: parsedData.transcript,
            context: parsedData.context,
          },
          originalData: content,
          uploadedBy: defaultUser._id,
        };

        pitchesToCreate.push({
          ...pitch,
          customerCompany: companyName,
        });
      }
    }

    // Create customers first
    const createdCustomers = new Map();
    for (const [companyName, customerData] of customersToCreate) {
      const customer = new Customer(customerData);
      await customer.save();
      createdCustomers.set(companyName, customer._id);
      console.log(`Created customer: ${companyName}`);
    }

    // Create pitches with customer references
    for (const pitchData of pitchesToCreate) {
      const { customerCompany, ...pitchFields } = pitchData;
      const customerId = createdCustomers.get(customerCompany);

      const pitch = new Pitch({
        ...pitchFields,
        customer: customerId,
      });

      await pitch.save();
      console.log(`Created pitch: ${pitch.title}`);
    }

    console.log(
      `Successfully seeded ${pitchesToCreate.length} pitches and ${customersToCreate.size} customers`
    );
  } catch (error) {
    console.error("Error seeding pitch data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seeding script
if (require.main === module) {
  seedPitchData();
}

export { seedPitchData };
