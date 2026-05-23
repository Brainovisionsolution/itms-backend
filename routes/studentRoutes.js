const express = require('express');
const {
  getStudentDashboard, updateTaskProgress,
  submitFeedback, getDocuments, getGroupMaterials, getAvailableReviews, getGroupMessages
} = require('../controllers/studentController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../utils/cloudinary');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['STUDENT']));

router.get('/dashboard', getStudentDashboard);
router.post('/task-progress', upload.single('file'), updateTaskProgress);
router.post('/feedback', submitFeedback);
router.get('/review-requests', getAvailableReviews);
router.get('/documents', getDocuments);
router.get('/materials', getGroupMaterials);
router.get('/messages', getGroupMessages);

module.exports = router;

