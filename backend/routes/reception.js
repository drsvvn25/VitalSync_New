const express = require('express');
const router = express.Router();
const {
    getProfile, getDashboard, getPatients,
    checkInPatient, getBeds, assignBed,
    dischargePatient, getBills, payBillAtDesk
} = require('../controllers/receptionController');
const { verifyToken, requireRole } = require('../middleware/auth');

const guard = [verifyToken, requireRole('receptionist')];

router.get('/profile',                  ...guard, getProfile);
router.get('/dashboard',                ...guard, getDashboard);
router.get('/patients',                 ...guard, getPatients);
router.post('/checkin/:appt_id',        ...guard, checkInPatient);
router.get('/beds',                     ...guard, getBeds);
router.post('/beds/assign',             ...guard, assignBed);
router.post('/beds/discharge/:alloc_id',...guard, dischargePatient);
router.get('/bills',                    ...guard, getBills);
router.post('/bills/pay/:bill_id',      ...guard, payBillAtDesk);

module.exports = router;
