import multer from 'multer';

// Configure multer for memory storage (files stored as buffers)
// We'll store the content in the database, not on disk
const storage = multer.memoryStorage();

// File filter - only allow certain file types
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed file types for documentation
  const allowedTypes = [
    'application/pdf',
    'application/json',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Ugyldig filtype. Kun PDF, JSON, TXT, MD, HTML og DOCX filer er tilladt.'));
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});
