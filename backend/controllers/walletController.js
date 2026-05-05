const Patient = require('../models/Patient');
const PatientWallet = require('../models/PatientWallet');
const Transaction = require('../models/Transaction');
const MedicalBill = require('../models/MedicalBill');

const getWallet = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const patient_id = patient.patient_id;

        let wallet = await PatientWallet.findOne({ patient_id });
        if (!wallet) wallet = await PatientWallet.create({ patient_id, balance: 0 });

        const transactions = await Transaction.find({ wallet_id: wallet.wallet_id }).sort({ transaction_date: -1 }).limit(50);
        const bills = await MedicalBill.find({ patient_id }).sort({ bill_date: -1 }).limit(50);

        res.json({ success: true, wallet, transactions, bills });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount.' });

        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });

        let wallet = await PatientWallet.findOne({ patient_id: patient.patient_id });
        if (!wallet) wallet = await PatientWallet.create({ patient_id: patient.patient_id, balance: 0 });

        await PatientWallet.updateOne({ wallet_id: wallet.wallet_id }, { $inc: { balance: Number(amount) } });
        await Transaction.create({ wallet_id: wallet.wallet_id, amount: Number(amount), transaction_type: 'credit', description: 'Funds added via Dashboard' });

        const updated = await PatientWallet.findOne({ wallet_id: wallet.wallet_id });
        res.json({ success: true, message: `₹${amount} added to your wallet successfully.`, new_balance: updated.balance });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const autoGenerateBill = async (patient_id, record_id, consultation_fee, medicines_cost) => {
    try {
        const total = consultation_fee + medicines_cost;
        const bill = await MedicalBill.create({ patient_id, record_id, consultation_fee, medicines_cost, total_amount: total, status: 'unpaid' });
        const bill_id = bill.bill_id;

        let wallet = await PatientWallet.findOne({ patient_id });
        if (!wallet) wallet = await PatientWallet.create({ patient_id, balance: 0 });

        if (wallet.balance >= total) {
            await PatientWallet.updateOne({ wallet_id: wallet.wallet_id }, { $inc: { balance: -total } });
            await Transaction.create({ wallet_id: wallet.wallet_id, amount: total, transaction_type: 'debit', description: `Auto-payment for Bill #${bill_id}` });
            await MedicalBill.updateOne({ bill_id }, { status: 'paid' });
            return { billed: true, auto_paid: true, total };
        }
        return { billed: true, auto_paid: false, total, reason: 'Insufficient wallet balance.' };
    } catch (err) { console.error('Error auto-generating bill:', err); return { billed: false, error: err.message }; }
};

const payBill = async (req, res) => {
    try {
        const { bill_id } = req.body;
        if (!bill_id) return res.status(400).json({ success: false, message: 'Bill ID is required.' });

        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const bill = await MedicalBill.findOne({ bill_id: parseInt(bill_id), patient_id: patient.patient_id });
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found.' });
        if (bill.status === 'paid') return res.status(400).json({ success: false, message: 'Bill is already paid.' });

        let wallet = await PatientWallet.findOne({ patient_id: patient.patient_id });
        if (!wallet) wallet = await PatientWallet.create({ patient_id: patient.patient_id, balance: 0 });

        if (wallet.balance < bill.total_amount)
            return res.status(400).json({ success: false, message: `Insufficient balance. Need ₹${bill.total_amount}, have ₹${wallet.balance.toFixed(2)}.` });

        await PatientWallet.updateOne({ wallet_id: wallet.wallet_id }, { $inc: { balance: -bill.total_amount } });
        await Transaction.create({ wallet_id: wallet.wallet_id, amount: bill.total_amount, transaction_type: 'debit', description: `Manual payment for Bill #${bill_id}` });
        await MedicalBill.updateOne({ bill_id: parseInt(bill_id) }, { status: 'paid' });

        const updated = await PatientWallet.findOne({ wallet_id: wallet.wallet_id });
        res.json({ success: true, message: `Bill #${bill_id} paid. New balance: ₹${updated.balance.toFixed(2)}` });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.', error: err.message }); }
};

module.exports = { getWallet, addFunds, autoGenerateBill, payBill };
