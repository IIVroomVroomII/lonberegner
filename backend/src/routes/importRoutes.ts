import { Router } from 'express';
import multer from 'multer';
import { importEmployees, downloadTemplate } from '../controllers/importController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Kun CSV filer er tilladt'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// POST /api/v1/import/employees - Import employees from CSV
router.post('/employees', upload.single('file'), importEmployees);

// GET /api/v1/import/template - Download CSV template
router.get('/template', downloadTemplate);

export default router;
