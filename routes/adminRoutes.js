const express = require('express');
const {
  createDomain, getDomains, createGroup, getGroups, deleteGroup,
  getInterns, createIntern, updateIntern, deleteIntern,
  createTask, getTasks, deleteTask, markAttendance, updatePayment,
  generateReport, uploadExcel, bulkApproveUsers, getTaskResponses,
  getAllUsers, getFeedbacks, uploadStudyMaterial, getStudyMaterials, deleteStudyMaterial,
  updateUserRole, approveUser, createReviewRequest, getReviewRequests,
  evaluateTask, reassignTask, sendGroupMessage, getGroupMessages, getStats, bulkImportInterns, updateGroup, getAttendanceHistory
} = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../utils/cloudinary');
const multer = require('multer');
const localUpload = multer({ dest: 'uploads/' });

const router = express.Router();

router.use(authMiddleware);

// ADMIN only routes
const adminOnly = roleMiddleware(['ADMIN']);
const adminOrTrainer = roleMiddleware(['ADMIN', 'TRAINER']);

router.post('/domains', adminOrTrainer, createDomain);
router.get('/domains', adminOrTrainer, getDomains);
router.post('/groups', adminOrTrainer, createGroup);
router.get('/groups', adminOrTrainer, getGroups);
router.put('/groups/:id', adminOrTrainer, updateGroup);
router.delete('/groups/:id', adminOrTrainer, deleteGroup);

router.get('/interns', adminOrTrainer, getInterns);
router.post('/interns', adminOnly, createIntern);
router.put('/interns/:id', adminOnly, updateIntern);
router.delete('/interns/:id', adminOnly, deleteIntern);

router.post('/tasks', adminOrTrainer, createTask);
router.get('/tasks', adminOrTrainer, getTasks);
router.delete('/tasks/:id', adminOrTrainer, deleteTask);
router.get('/tasks/:id/responses', adminOrTrainer, getTaskResponses);
router.post('/tasks/evaluate', adminOrTrainer, evaluateTask);
router.post('/tasks/reassign', adminOrTrainer, reassignTask);

router.post('/attendance', adminOrTrainer, markAttendance);
router.get('/attendance', adminOrTrainer, getAttendanceHistory);
router.put('/payments/:userId', adminOnly, updatePayment);

router.get('/reports', adminOnly, generateReport);
router.post('/upload-excel', adminOnly, localUpload.single('file'), uploadExcel);

router.get('/users', adminOnly, getAllUsers);
router.put('/users/:id/role', adminOnly, updateUserRole); 
router.post('/users/bulk-approve', adminOnly, bulkApproveUsers);
router.put('/users/:id/approve', adminOnly, approveUser);
router.delete('/users/:id', adminOnly, deleteIntern);

router.get('/reviews', adminOrTrainer, getFeedbacks);
router.post('/review-requests', adminOrTrainer, createReviewRequest);
router.get('/review-requests', adminOrTrainer, getReviewRequests);

router.post('/materials', adminOrTrainer, upload.single('file'), uploadStudyMaterial);
router.get('/materials', adminOrTrainer, getStudyMaterials);
router.delete('/materials/:id', adminOrTrainer, deleteStudyMaterial);

router.post('/groups/:id/messages', adminOrTrainer, sendGroupMessage);
router.get('/groups/:id/messages', adminOrTrainer, getGroupMessages);
router.get('/stats', adminOrTrainer, getStats);
router.post('/bulk-interns', adminOnly, bulkImportInterns);

module.exports = router;
