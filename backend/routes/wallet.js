const express = require('express');
const router = express.Router();
const { getWallet, addFunds, payBill } = require('../controllers/walletController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my',       verifyToken, requireRole('patient'), getWallet);
router.post('/add',     verifyToken, requireRole('patient'), addFunds);
router.post('/pay-bill',verifyToken, requireRole('patient'), payBill);

module.exports = router;
