const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');
const { checkDocumentOwnership } = require('../middleware/roleCheck');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', protect, upload.single('file'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('documentType').notEmpty().withMessage('Document type is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const documentData = {
      ...req.body,
      uploadedBy: req.user._id,
    };

    if (req.file) {
      documentData.filePath = req.file.path;
      documentData.fileName = req.file.originalname;
      documentData.fileSize = req.file.size;
    }

    const document = await Document.create(documentData);
    await document.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error creating document',
      error: error.message,
    });
  }
});

// @route   GET /api/documents
// @desc    Get all documents with filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, documentType, search, sortBy = '-expiryDate', page = 1, limit = 10 } = req.query;

    const query = {};

    // Non-admin users can only see their own documents
    if (req.user.role !== 'admin') {
      query.uploadedBy = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (documentType) {
      query.documentType = documentType;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { documentNumber: { $regex: search, $options: 'i' } },
        { issuer: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email department')
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      count: documents.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message,
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get single document
// @access  Private
router.get('/:id', protect, checkDocumentOwnership, async (req, res) => {
  try {
    await req.document.populate('uploadedBy', 'name email department');
    
    res.json({
      success: true,
      document: req.document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      error: error.message,
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document
// @access  Private
router.put('/:id', protect, checkDocumentOwnership, upload.single('file'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      // Delete old file if exists
      if (req.document.filePath && fs.existsSync(req.document.filePath)) {
        fs.unlinkSync(req.document.filePath);
      }
      updateData.filePath = req.file.path;
      updateData.fileName = req.file.originalname;
      updateData.fileSize = req.file.size;
    }

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name email department');

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error updating document',
      error: error.message,
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/:id', protect, checkDocumentOwnership, async (req, res) => {
  try {
    // Delete file if exists
    if (req.document.filePath && fs.existsSync(req.document.filePath)) {
      fs.unlinkSync(req.document.filePath);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message,
    });
  }
});

// @route   GET /api/documents/download/:id
// @desc    Download document file
// @access  Private
router.get('/download/:id', protect, checkDocumentOwnership, async (req, res) => {
  try {
    if (!req.document.filePath || !fs.existsSync(req.document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    res.download(req.document.filePath, req.document.fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message,
    });
  }
});

module.exports = router;