const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const VitalStat = require('../models/VitalStat');
const Transaction = require('../models/Transaction');
const MedicalRecord = require('../models/MedicalRecord');
const PatientWallet = require('../models/PatientWallet');
const bcrypt = require('bcryptjs');

const getSystemStats = async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments();
        const totalDoctors = await Doctor.countDocuments();
        const totalAppointments = await Appointment.countDocuments();
        const totalVitals = await VitalStat.countDocuments();
        const txs = await Transaction.find({ transaction_type: 'debit' });
        const totalRevenue = txs.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalTransactions = await Transaction.countDocuments();
        res.json({ success: true, stats: { totalPatients, totalDoctors, totalAppointments, totalRevenue, totalTransactions } });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        const results = [];
        for (const d of doctors) {
            const u = await User.findOne({ id: d.user_id });
            if (!u) continue;
            const c = d.clinic_id ? await Clinic.findOne({ clinic_id: d.clinic_id }) : null;
            results.push({ id: u.id, name: u.name, email: u.email, phone: u.phone, specialization: d.specialization, experience: d.experience, clinic_name: c ? c.name : null });
        }
        res.json({ success: true, doctors: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const addDoctor = async (req, res) => {
    const { name, email, password, phone, specialization, experience, clinic_id } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already exists.' });
        const hashedPassword = await bcrypt.hash(password || 'Doctor@123', 12);
        const user = await User.create({ name, email, password: hashedPassword, role: 'doctor', phone });
        await Doctor.create({ user_id: user.id, specialization, experience: experience || 0, clinic_id: clinic_id || null });
        res.status(201).json({ success: true, message: 'Doctor added successfully.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const deleteUser = async (req, res) => {
    try {
        await User.deleteOne({ id: parseInt(req.params.id) });
        res.json({ success: true, message: 'User removed.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.find();
        const results = [];
        for (const p of patients) {
            const u = await User.findOne({ id: p.user_id, role: 'patient' });
            if (!u) continue;
            results.push({ id: u.id, name: u.name, email: u.email, phone: u.phone, age: p.age, gender: p.gender, blood_group: p.blood_group, address: p.address });
        }
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ success: true, patients: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAllAppointments = async (req, res) => {
    try {
        const appts = await Appointment.find().sort({ appointment_date: -1 }).limit(50);
        const results = [];
        for (const a of appts) {
            const p = await Patient.findOne({ patient_id: a.patient_id });
            const pu = p ? await User.findOne({ id: p.user_id }) : null;
            const d = await Doctor.findOne({ doctor_id: a.doctor_id });
            const du = d ? await User.findOne({ id: d.user_id }) : null;
            results.push({ id: a.id, appointment_date: a.appointment_date, status: a.status, patient_name: pu ? pu.name : null, doctor_name: du ? du.name : null });
        }
        res.json({ success: true, appointments: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAllTransactions = async (req, res) => {
    try {
        const txs = await Transaction.find().sort({ transaction_date: -1 }).limit(50);
        const results = [];
        for (const t of txs) {
            const w = await PatientWallet.findOne({ wallet_id: t.wallet_id });
            let patient_name = null;
            if (w) { const p = await Patient.findOne({ patient_id: w.patient_id }); const u = p ? await User.findOne({ id: p.user_id }) : null; patient_name = u ? u.name : null; }
            results.push({ ...t.toObject(), patient_name });
        }
        res.json({ success: true, transactions: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getAllMedicalRecords = async (req, res) => {
    try {
        const records = await MedicalRecord.find().sort({ date: -1 });
        const results = [];
        for (const mr of records) {
            const p = await Patient.findOne({ patient_id: mr.patient_id });
            const pu = p ? await User.findOne({ id: p.user_id }) : null;
            const d = await Doctor.findOne({ doctor_id: mr.doctor_id });
            const du = d ? await User.findOne({ id: d.user_id }) : null;
            results.push({ id: mr.id, diagnosis: mr.diagnosis, prescription: mr.prescription, notes: mr.notes, date: mr.date, patient_name: pu ? pu.name : null, patient_id: mr.patient_id, doctor_name: du ? du.name : null, specialization: d ? d.specialization : null });
        }
        res.json({ success: true, records: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getSystemStats, getAllDoctors, addDoctor, deleteUser, getAllPatients, getAllAppointments, getAllTransactions, getAllMedicalRecords };
