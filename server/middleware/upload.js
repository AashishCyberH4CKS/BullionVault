const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Preserve base name so the importer can correctly extract commodity name
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter check for excel workbooks
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.xlsx') {
    return cb(new Error('Only Excel workbooks (.xlsx) are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
