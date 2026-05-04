const express = require('express');
const router = express.Router();
const { getAllClinics, seedClinics, seedClinicsV2, addClinic } = require('../controllers/clinicsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, getAllClinics);
router.post('/add', verifyToken, requireRole('admin'), addClinic);
router.post('/seed', seedClinics);
router.post('/seed2', seedClinicsV2);

module.exports = router;

