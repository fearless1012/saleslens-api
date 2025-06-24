import express, { Router } from "express";
import { auth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { Customer } from "../models/customer";
import { Activity } from "../models/activity";
import Joi from "joi";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import * as csv from "fast-csv";

const router: Router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/customers");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Check file type - only allow CSV for bulk customer imports
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed!"));
    }
  },
});

// Validation schemas
const customerSchema = Joi.object({
  name: Joi.string().max(100).required(),
  company: Joi.string().max(100).required(),
  industry: Joi.string().required(),
  position: Joi.string().required(),
  email: Joi.string().email().allow(""),
  phone: Joi.string().allow(""),
  contacts: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      position: Joi.string().required(),
      email: Joi.string().email().allow(""),
      phone: Joi.string().allow(""),
    })
  ),
  notes: Joi.string().allow(""),
  requirements: Joi.string().allow(""),
  status: Joi.string().valid(
    "lead",
    "prospect",
    "qualified",
    "customer",
    "churned"
  ),
  tags: Joi.array().items(Joi.string()),
});

/**
 * @route   GET api/customers
 * @desc    Get all customers
 * @access  Private
 */
router.get("/", auth, async (req, res) => {
  try {
    const customers = await Customer.find()
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email");

    res.status(200).json({
      status: "success",
      data: customers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   GET api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate(
      "uploadedBy",
      "name email"
    );

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    // Create activity log for view
    const activity = new Activity({
      action: "view",
      entityType: "customer",
      entityId: customer._id,
      description: `Viewed customer: ${customer.name} (${customer.company})`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   POST api/customers
 * @desc    Create a new customer
 * @access  Private
 */
router.post("/", auth, validateRequest(customerSchema), async (req, res) => {
  try {
    // Create customer record
    const customer = new Customer({
      name: req.body.name,
      company: req.body.company,
      industry: req.body.industry,
      position: req.body.position,
      email: req.body.email,
      phone: req.body.phone,
      contacts: req.body.contacts || [],
      notes: req.body.notes,
      requirements: req.body.requirements,
      status: req.body.status || "lead",
      tags: req.body.tags || [],
      uploadedBy: req.user.id,
    });

    await customer.save();

    // Create activity log
    const activity = new Activity({
      action: "create",
      entityType: "customer",
      entityId: customer._id,
      description: `Created new customer: ${customer.name} (${customer.company})`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(201).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   POST api/customers/import
 * @desc    Import customers from CSV file
 * @access  Private
 */
router.post("/import", auth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a file",
      });
    }

    const customers: any[] = [];
    const filePath = path.join(
      __dirname,
      "../../uploads/customers",
      file.filename
    );

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => {
        throw error;
      })
      .on("data", (row) => {
        customers.push({
          name: row.name,
          company: row.company,
          industry: row.industry,
          position: row.position,
          email: row.email || "",
          phone: row.phone || "",
          notes: row.notes || "",
          requirements: row.requirements || "",
          status: row.status || "lead",
          tags: row.tags
            ? row.tags.split(",").map((tag: string) => tag.trim())
            : [],
          uploadedBy: req.user.id,
        });
      })
      .on("end", async () => {
        // Insert all customers
        const result = await Customer.insertMany(customers);

        // Create activity log
        const activity = new Activity({
          action: "create",
          entityType: "customer",
          entityId: req.user.id, // Using user ID as this is a bulk operation
          description: `Imported ${result.length} customers from CSV`,
          userId: req.user.id,
        });
        await activity.save();

        // Delete the file after processing
        fs.unlinkSync(filePath);

        res.status(201).json({
          status: "success",
          message: `${result.length} customers imported successfully`,
          data: result,
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   PUT api/customers/:id
 * @desc    Update a customer
 * @access  Private
 */
router.put("/:id", auth, validateRequest(customerSchema), async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    // Check if the user is the uploader or an admin
    if (
      customer.uploadedBy.toString() !== req.user.id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to update this customer",
      });
    }

    customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        company: req.body.company,
        industry: req.body.industry,
        position: req.body.position,
        email: req.body.email,
        phone: req.body.phone,
        contacts: req.body.contacts || [],
        notes: req.body.notes,
        requirements: req.body.requirements,
        status: req.body.status || "lead",
        tags: req.body.tags || [],
      },
      { new: true }
    );

    // Create activity log
    const activity = new Activity({
      action: "update",
      entityType: "customer",
      entityId: customer?._id,
      description: `Updated customer: ${customer?.name} (${customer?.company})`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   DELETE api/customers/:id
 * @desc    Delete a customer
 * @access  Private
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    // Check if the user is the uploader or an admin
    if (
      customer.uploadedBy.toString() !== req.user.id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to delete this customer",
      });
    }

    // Delete customer from database
    await Customer.findByIdAndDelete(req.params.id);

    // Create activity log
    const activity = new Activity({
      action: "delete",
      entityType: "customer",
      entityId: customer._id,
      description: `Deleted customer: ${customer.name} (${customer.company})`,
      userId: req.user.id,
    });
    await activity.save();

    res.status(200).json({
      status: "success",
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   GET api/customers/search/:query
 * @desc    Search customers
 * @access  Private
 */
router.get("/search/:query", auth, async (req, res) => {
  try {
    const searchQuery = req.params.query;

    const customers = await Customer.find(
      { $text: { $search: searchQuery } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate("uploadedBy", "name email");

    res.status(200).json({
      status: "success",
      data: customers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

/**
 * @route   POST api/customers/generate-profiles
 * @desc    Generate customer profiles using LLaMA AI
 * @access  Private
 */
router.post("/generate-profiles", auth, async (req, res) => {
  try {
    const {
      count = 3,
      industries = ["Technology", "Healthcare", "Finance"],
      focusAreas = ["Startups", "Enterprise", "SMB"],
      analysisDepth = "detailed",
    } = req.body;

    // Import the llamaIntegrationService
    const { llamaIntegrationService } = await import(
      "../services/llamaIntegrationService"
    );

    // Get existing customer data for context
    const existingCustomers = await Customer.find()
      .limit(10)
      .select("company industry position requirements status tags")
      .lean();

    // Prepare the context for LLaMA
    const context = {
      existingCustomers: existingCustomers.map((customer) => ({
        company: customer.company,
        industry: customer.industry,
        position: customer.position,
        requirements: customer.requirements,
        status: customer.status,
        tags: customer.tags,
      })),
      requestedCount: count,
      targetIndustries: industries,
      focusAreas: focusAreas,
      analysisDepth: analysisDepth,
    };

    // Create a prompt for generating customer profiles
    const systemPrompt = `You are an AI sales expert that analyzes customer databases and generates realistic customer profiles. Based on the existing customer data patterns, create new customer profiles that match the sales context and industry patterns.`;

    const userPrompt = `Based on the following customer database analysis, generate ${count} new customer profiles that would be valuable for sales training and practice scenarios.

Existing Customer Patterns:
${JSON.stringify(context.existingCustomers, null, 2)}

Requirements:
- Generate ${count} diverse customer profiles
- Focus on industries: ${industries.join(", ")}
- Target areas: ${focusAreas.join(", ")}
- Analysis depth: ${analysisDepth}

For each customer profile, provide:
1. Company name and industry
2. Customer stage (Early-Stage Startups, Growth Companies, Enterprise, etc.)
3. Key traits (4-5 behavioral characteristics)
4. Value proposition points (4-5 items)
5. Common pain points (3-4 items)
6. Typical objections (3-4 items)
7. Position/role title
8. Brief description

Format the response as a JSON array with the following structure:
[
  {
    "company": "Company Name",
    "industry": "Industry Type",
    "stage": "Customer Stage",
    "description": "Brief description of the customer segment",
    "position": "Decision Maker Role",
    "keyTraits": ["trait1", "trait2", "trait3", "trait4"],
    "valueProposition": ["value1", "value2", "value3", "value4"],
    "painPoints": ["pain1", "pain2", "pain3"],
    "objections": ["objection1", "objection2", "objection3"],
    "status": "prospect",
    "tags": ["tag1", "tag2"]
  }
]

Ensure the profiles are realistic, diverse, and suitable for sales training scenarios.`;

    // Use the existing LLaMA service to generate profiles
    const { llamaService } = await import("../services/llamaService");

    const response = await llamaService.generateText(userPrompt, {
      systemPrompt,
      model: "llama-3.3-70b-instruct",
      maxTokens: 2000,
      temperature: 0.8,
    });

    // Parse the response to extract customer profiles
    let generatedProfiles;
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedProfiles = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing LLaMA response:", parseError);

      // Fallback: generate default profiles
      generatedProfiles = [
        {
          company: "AI-Generated Startup",
          industry: "Technology",
          stage: "Early-Stage Startup",
          description:
            "Fast-growing technology startup focused on digital transformation",
          position: "Chief Technology Officer",
          keyTraits: [
            "Data-driven decision making",
            "Values rapid implementation",
            "Budget-conscious but ROI-focused",
            "Prefers modern, scalable solutions",
          ],
          valueProposition: [
            "Reduce development time by 40%",
            "Seamless API integrations",
            "Scalable architecture support",
            "Cost-effective implementation",
          ],
          painPoints: [
            "Limited technical resources",
            "Tight budget constraints",
            "Need for quick deployment",
          ],
          objections: [
            "Already have in-house solution",
            "Concerned about integration complexity",
            "Budget approval needed",
          ],
          status: "prospect",
          tags: ["startup", "technology", "ai-generated"],
        },
      ];
    }

    res.status(200).json({
      status: "success",
      data: {
        profiles: generatedProfiles,
        metadata: {
          generatedAt: new Date().toISOString(),
          count: generatedProfiles.length,
          source: "llama-ai-generation",
          requestParams: {
            count,
            industries,
            focusAreas,
            analysisDepth,
          },
        },
      },
    });
  } catch (error: any) {
    console.error("Error generating customer profiles:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate customer profiles",
      details: error?.message || "Unknown error occurred",
    });
  }
});

export default router;
