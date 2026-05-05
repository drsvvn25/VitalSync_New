const Receptionist = require('../models/Receptionist');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Bed = require('../models/Bed');
const BedAllocation = require('../models/BedAllocation');
const MedicalBill = require('../models/MedicalBill');
const PatientWallet = require('../models/PatientWallet');
const Transaction = require('../models/Transaction');

// ── Helper: get receptionist's clinic ─────────────────────
const getClinicId = async (userId) => {
    const rec = await Receptionist.findOne({ user_id: userId });
    if (!rec) return null;
    return rec.clinic_id;
};

// GET /api/reception/profile
const getProfile = async (req, res) => {
    try {
        const rec = await Receptionist.findOne({ user_id: req.user.id });
        if (!rec) return res.status(404).json({ success: false, message: 'Receptionist record not found.' });
        const clinic = await Clinic.findOne({ clinic_id: rec.clinic_id });
        const user = await User.findOne({ id: req.user.id }).select('name email phone');
        res.json({ success: true, receptionist: { ...rec.toObject(), clinic, user } });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/reception/dashboard  – KPI stats
const getDashboard = async (req, res) => {
    try {
        const clinic_id = await getClinicId(req.user.id);
        if (!clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        // Find all doctors at this clinic
        const doctors = await Doctor.find({ clinic_id });
        const doctorIds = doctors.map(d => d.doctor_id);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        // Today's confirmed appointments
        const confirmedToday = await Appointment.countDocuments({
            doctor_id: { $in: doctorIds },
            status: 'confirmed',
            appointment_date: { $gte: today, $lte: todayEnd }
        });

        // Checked-in today (has checkin_time today)
        const checkedInToday = await Appointment.countDocuments({
            doctor_id: { $in: doctorIds },
            checkin_time: { $gte: today, $lte: todayEnd }
        });

        // Pending (awaiting) total
        const pendingTotal = await Appointment.countDocuments({
            doctor_id: { $in: doctorIds },
            status: 'pending'
        });

        // Bed stats
        const totalBeds = await Bed.countDocuments({ clinic_id });
        const availableBeds = await Bed.countDocuments({ clinic_id, status: 'available' });
        const occupiedBeds = totalBeds - availableBeds;

        // Unpaid bills for clinic patients
        const patientIds = [];
        for (const appt of await Appointment.find({ doctor_id: { $in: doctorIds } })) {
            if (!patientIds.includes(appt.patient_id)) patientIds.push(appt.patient_id);
        }
        const unpaidBills = await MedicalBill.countDocuments({ patient_id: { $in: patientIds }, status: 'unpaid' });
        const unpaidAmount = await MedicalBill.aggregate([
            { $match: { patient_id: { $in: patientIds }, status: 'unpaid' } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        res.json({
            success: true,
            stats: {
                confirmed_today: confirmedToday,
                checked_in_today: checkedInToday,
                pending_total: pendingTotal,
                total_beds: totalBeds,
                available_beds: availableBeds,
                occupied_beds: occupiedBeds,
                unpaid_bills: unpaidBills,
                unpaid_amount: unpaidAmount[0]?.total || 0
            }
        });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/reception/patients – all upcoming/today appointments for this clinic
const getPatients = async (req, res) => {
    try {
        const clinic_id = await getClinicId(req.user.id);
        if (!clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const doctors = await Doctor.find({ clinic_id });
        const doctorIds = doctors.map(d => d.doctor_id);

        // Get appointments – last 7 days + next 30 days
        const from = new Date(); from.setDate(from.getDate() - 1);
        const to = new Date(); to.setDate(to.getDate() + 30);

        const appts = await Appointment.find({
            doctor_id: { $in: doctorIds },
            status: { $in: ['pending', 'confirmed', 'completed'] },
            appointment_date: { $gte: from, $lte: to }
        }).sort({ appointment_date: 1 });

        const results = await Promise.all(appts.map(async a => {
            const pat = await Patient.findOne({ patient_id: a.patient_id });
            const patUser = pat ? await User.findOne({ id: pat.user_id }) : null;
            const doc = doctors.find(d => d.doctor_id === a.doctor_id);
            const docUser = doc ? await User.findOne({ id: doc.user_id }) : null;

            // Check if bed allocated
            const bedAlloc = await BedAllocation.findOne({ patient_id: a.patient_id, discharge_date: null });
            let bed_number = null;
            if (bedAlloc) {
                const bed = await Bed.findOne({ bed_id: bedAlloc.bed_id });
                bed_number = bed ? `${bed.ward_type}-${bed.bed_number}` : null;
            }

            // Check unpaid bill
            const bill = await MedicalBill.findOne({ patient_id: a.patient_id, status: 'unpaid' });

            return {
                id: a.id,
                appointment_date: a.appointment_date,
                status: a.status,
                checkin_time: a.checkin_time,
                queue_token: a.queue_token,
                priority: a.priority,
                notes: a.notes,
                patient_id: a.patient_id,
                patient_name: patUser ? patUser.name : 'Unknown',
                patient_phone: patUser ? patUser.phone : null,
                age: pat ? pat.age : null,
                gender: pat ? pat.gender : null,
                blood_group: pat ? pat.blood_group : null,
                doctor_name: docUser ? `Dr. ${docUser.name}` : 'Unknown',
                bed_number,
                has_unpaid_bill: !!bill,
                bill_amount: bill ? bill.total_amount : 0,
                bill_id: bill ? bill.bill_id : null
            };
        }));

        res.json({ success: true, appointments: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/reception/checkin/:appt_id
const checkInPatient = async (req, res) => {
    try {
        const appt_id = parseInt(req.params.appt_id);
        const appt = await Appointment.findOne({ id: appt_id });
        if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
        if (appt.checkin_time) return res.status(400).json({ success: false, message: 'Patient already checked in.' });

        await Appointment.updateOne({ id: appt_id }, { checkin_time: new Date() });

        // Real-time: notify doctor that patient has arrived
        const io = req.app.get('io');
        if (io) {
            const doc = await Doctor.findOne({ doctor_id: appt.doctor_id });
            if (doc) {
                const pat = await Patient.findOne({ patient_id: appt.patient_id });
                const patUser = pat ? await User.findOne({ id: pat.user_id }) : null;
                io.to(`user_${doc.user_id}`).emit('patient_arrived', {
                    patient_name: patUser?.name || 'Patient',
                    appointment_id: appt_id,
                    checkin_time: new Date().toISOString(),
                    message: `${patUser?.name || 'A patient'} has arrived and checked in at reception.`
                });
            }
        }
        res.json({ success: true, message: 'Patient checked in successfully.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/reception/beds – bed grid with occupancy
const getBeds = async (req, res) => {
    try {
        const clinic_id = await getClinicId(req.user.id);
        if (!clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const beds = await Bed.find({ clinic_id }).sort({ ward_type: 1, bed_number: 1 });
        const results = [];
        for (const b of beds) {
            const alloc = await BedAllocation.findOne({ bed_id: b.bed_id, discharge_date: null });
            let patient_name = null, patient_id = null, admission_date = null;
            if (alloc) {
                const p = await Patient.findOne({ patient_id: alloc.patient_id });
                const u = p ? await User.findOne({ id: p.user_id }) : null;
                patient_name = u?.name || 'Unknown';
                patient_id = alloc.patient_id;
                admission_date = alloc.admission_date;
            }
            results.push({
                bed_id: b.bed_id,
                bed_number: b.bed_number,
                ward_type: b.ward_type,
                status: b.status,
                allocation_id: alloc?.allocation_id || null,
                patient_name, patient_id, admission_date
            });
        }
        res.json({ success: true, beds: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/reception/beds/assign  body: { patient_id, bed_id }
const assignBed = async (req, res) => {
    try {
        const { patient_id, bed_id } = req.body;
        if (!patient_id || !bed_id) return res.status(400).json({ success: false, message: 'patient_id and bed_id are required.' });

        const bed = await Bed.findOne({ bed_id: parseInt(bed_id) });
        if (!bed) return res.status(404).json({ success: false, message: 'Bed not found.' });
        if (bed.status === 'occupied') return res.status(400).json({ success: false, message: 'Bed is already occupied.' });

        // Check if patient already has a bed
        const existing = await BedAllocation.findOne({ patient_id: parseInt(patient_id), discharge_date: null });
        if (existing) return res.status(400).json({ success: false, message: 'Patient already has a bed assigned.' });

        await Bed.updateOne({ bed_id: parseInt(bed_id) }, { status: 'occupied' });
        await BedAllocation.create({ patient_id: parseInt(patient_id), bed_id: parseInt(bed_id) });

        res.json({ success: true, message: `Bed ${bed.bed_number} assigned successfully.` });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/reception/beds/discharge/:alloc_id
const dischargePatient = async (req, res) => {
    try {
        const alloc_id = parseInt(req.params.alloc_id);
        const alloc = await BedAllocation.findOne({ allocation_id: alloc_id, discharge_date: null });
        if (!alloc) return res.status(404).json({ success: false, message: 'Allocation not found or already discharged.' });

        await BedAllocation.updateOne({ allocation_id: alloc_id }, { discharge_date: new Date() });
        await Bed.updateOne({ bed_id: alloc.bed_id }, { status: 'available' });

        res.json({ success: true, message: 'Patient discharged and bed freed.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/reception/bills – unpaid bills for this clinic's patients
const getBills = async (req, res) => {
    try {
        const clinic_id = await getClinicId(req.user.id);
        if (!clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const doctors = await Doctor.find({ clinic_id });
        const doctorIds = doctors.map(d => d.doctor_id);

        // Get all patient_ids seen at this clinic
        const appts = await Appointment.find({ doctor_id: { $in: doctorIds } }).distinct('patient_id');

        const bills = await MedicalBill.find({ patient_id: { $in: appts } }).sort({ bill_date: -1 }).limit(60);
        const results = await Promise.all(bills.map(async b => {
            const pat = await Patient.findOne({ patient_id: b.patient_id });
            const patUser = pat ? await User.findOne({ id: pat.user_id }) : null;
            return {
                bill_id: b.bill_id,
                patient_id: b.patient_id,
                patient_name: patUser?.name || 'Unknown',
                patient_phone: patUser?.phone || null,
                consultation_fee: b.consultation_fee,
                medicines_cost: b.medicines_cost,
                total_amount: b.total_amount,
                status: b.status,
                bill_date: b.bill_date
            };
        }));

        res.json({ success: true, bills: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/reception/bills/pay/:bill_id  – mark as paid at desk
const payBillAtDesk = async (req, res) => {
    try {
        const bill_id = parseInt(req.params.bill_id);
        const bill = await MedicalBill.findOne({ bill_id });
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found.' });
        if (bill.status === 'paid') return res.status(400).json({ success: false, message: 'Bill already paid.' });

        const { payment_method = 'cash' } = req.body;

        // Log as a wallet debit transaction (no balance change — cash payment)
        let wallet = await PatientWallet.findOne({ patient_id: bill.patient_id });
        if (!wallet) wallet = await PatientWallet.create({ patient_id: bill.patient_id, balance: 0 });
        await Transaction.create({
            wallet_id: wallet.wallet_id,
            amount: bill.total_amount,
            transaction_type: 'debit',
            description: `Paid at desk (${payment_method}) – Bill #${bill_id}`
        });

        await MedicalBill.updateOne({ bill_id }, { status: 'paid' });

        res.json({ success: true, message: `Bill #${bill_id} marked as paid (${payment_method}).` });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = {
    getProfile, getDashboard, getPatients,
    checkInPatient, getBeds, assignBed,
    dischargePatient, getBills, payBillAtDesk
};
