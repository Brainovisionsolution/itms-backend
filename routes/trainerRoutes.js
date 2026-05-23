const express = require('express');
const { getTrainerDashboard } = require('../controllers/trainerController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['TRAINER']));

router.get('/dashboard', getTrainerDashboard);

module.exports = router;
