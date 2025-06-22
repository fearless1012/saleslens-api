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

export default router;
