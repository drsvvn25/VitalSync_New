const Patient = require('../models/Patient');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const VitalStat = require('../models/VitalStat');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const { autoReserveBed } = require('./bedsController');

// ── Critical Health Alert thresholds ─────────────────────────
const CRITICAL = {
    heart_rate: { min: 50, max: 120 },
    oxygen_level: { min: 90 },
    temperature: { max: 39 },
    sugar_level: { max: 250 },
};

function checkCritical(vitals) {
    const issues = [];
    if (vitals.heart_rate != null && (vitals.heart_rate < CRITICAL.heart_rate.min || vitals.heart_rate > CRITICAL.heart_rate.max))
        issues.push({ type: 'Heart Rate', value: `${vitals.heart_rate} bpm`, message: `Heart rate ${vitals.heart_rate} bpm is critical (safe: 50–120 bpm)` });
    if (vitals.oxygen_level != null && vitals.oxygen_level < CRITICAL.oxygen_level.min)
        issues.push({ type: 'Oxygen Level', value: `${vitals.oxygen_level}%`, message: `Oxygen level ${vitals.oxygen_level}% is critically low (safe: ≥90%)` });
    if (vitals.temperature != null && vitals.temperature > CRITICAL.temperature.max)
        issues.push({ type: 'Temperature', value: `${vitals.temperature}°C`, message: `Temperature ${vitals.temperature}°C is critically high (safe: ≤39°C)` });
    if (vitals.sugar_level != null && vitals.sugar_level > CRITICAL.sugar_level.max)
        issues.push({ type: 'Sugar Level', value: `${vitals.sugar_level} mg/dL`, message: `Sugar level ${vitals.sugar_level} mg/dL is critically high (safe: ≤250 mg/dL)` });
    return issues;
}

const NORMAL = {
    heart_rate: { min: 60, max: 100 },
    oxygen_level: { min: 95 },
    temperature: { min: 36.1, max: 37.2 },
};

function checkAbnormal(vitals) {
    const alerts = [];
    if (vitals.heart_rate != null && (vitals.heart_rate < NORMAL.heart_rate.min || vitals.heart_rate > NORMAL.heart_rate.max))
        alerts.push(`Heart rate ${vitals.heart_rate} bpm is outside normal range (60–100 bpm).`);
    if (vitals.oxygen_level != null && vitals.oxygen_level < NORMAL.oxygen_level.min)
        alerts.push(`Oxygen level ${vitals.oxygen_level}% is below normal (≥95%).`);
    if (vitals.temperature != null && (vitals.temperature < NORMAL.temperature.min || vitals.temperature > NORMAL.temperature.max))
        alerts.push(`Temperature ${vitals.temperature}°C is outside normal range (36.1–37.2°C).`);
    return alerts;
}

// POST /api/vitals/add
const addVitals = async (req, res) => {
    const { heart_rate, blood_pressure, oxygen_level, temperature, sugar_level } = req.body;
    const io = req.app.get('io');

    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const patientUser = await User.findOne({ id: req.user.id });
        const patient_id = patient.patient_id;
        const patient_name = patientUser.name;

        const vital = await VitalStat.create({
            patient_id, heart_rate, blood_pressure, oxygen_level, temperature,
            sugar_level: sugar_level || null
        });

        const alerts = checkAbnormal({ heart_rate, oxygen_level, temperature });
        const criticalIssues = checkCritical({ heart_rate, oxygen_level, temperature, sugar_level });

        // Find assigned doctors
        const appointments = await Appointment.find({ patient_id });
        const doctorIds = [...new Set(appointments.map(a => a.doctor_id))].slice(0, 5);
        const doctorRows = [];
        for (const did of doctorIds) {
            const d = await Doctor.findOne({ doctor_id: did });
            if (!d) continue;
            const u = await User.findOne({ id: d.user_id });
            if (!u) continue;
            doctorRows.push({ doctor_id: d.doctor_id, doctor_user_id: d.user_id, doctor_name: u.name, doctor_phone: u.phone, clinic_id: d.clinic_id });
        }

        if (criticalIssues.length > 0) {
            for (const issue of criticalIssues) {
                const msg = `🚨 Critical health alert for patient ${patient_name}: ${issue.message}`;
                for (const doc of doctorRows) {
                    const notif = await Notification.create({
                        recipient_id: doc.doctor_user_id, patient_id,
                        type: 'critical', vital_type: issue.type, value: issue.value, message: msg
                    });
                    if (io) {
                        io.to(`user_${doc.doctor_user_id}`).emit('critical_alert', {
                            id: notif.id, patient_name, patient_id,
                            vital_type: issue.type, value: issue.value, message: msg,
                            timestamp: new Date().toISOString(),
                        });
                    }
                    console.log(`\n📱 Mobile notification sent to doctor ${doc.doctor_name} (${doc.doctor_phone})`);
                    console.log(`   📋 Alert: ${msg}\n`);
                }
            }

            // Auto-book emergency appointments
            for (const doc of doctorRows) {
                const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
                const count = await Appointment.countDocuments({ doctor_id: doc.doctor_id, appointment_date: { $gte: todayStart, $lte: todayEnd } });
                const queuePosition = count + 1;
                const dDate = new Date();
                const dateStr = `${dDate.getFullYear()}${String(dDate.getMonth() + 1).padStart(2, '0')}${String(dDate.getDate()).padStart(2, '0')}`;
                const queueToken = `VS-${dateStr}-${String(queuePosition).padStart(3, '0')}`;
                const triageResult = 'Emergency (Critical Vitals)';

                await Appointment.create({
                    patient_id, doctor_id: doc.doctor_id, appointment_date: new Date(),
                    status: 'pending', notes: 'Automated Emergency Appointment due to critical vitals log.',
                    priority: 'high', queue_token: queueToken, queue_position: queuePosition, triage_result: triageResult
                });

                let bedMessage = '';
                if (doc.clinic_id) {
                    const bed = await autoReserveBed(patient_id, doc.clinic_id);
                    if (bed) bedMessage = ` A ${bed.ward_type} bed (${bed.bed_number}) has been auto-reserved at your clinic.`;
                }

                if (io) {
                    io.to('doctors').emit('emergency_appointment', {
                        patient_name, patient_id, doctor_name: doc.doctor_name,
                        queue_token: queueToken, triage_result: triageResult,
                        appointment_date: new Date().toISOString(),
                        message: 'Automated Emergency Booking.' + bedMessage,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        }

        res.status(201).json({
            success: true, message: 'Vital stats recorded successfully.',
            id: vital.id,
            alerts: alerts.length > 0 ? alerts : null,
            critical: criticalIssues.length > 0 ? criticalIssues : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/:patientId
const getVitals = async (req, res) => {
    try {
        const vitals = await VitalStat.find({ patient_id: parseInt(req.params.patientId) }).sort({ record_date: -1 }).limit(50);
        const patient = await Patient.findOne({ patient_id: parseInt(req.params.patientId) });
        let patient_name = null;
        if (patient) {
            const u = await User.findOne({ id: patient.user_id });
            if (u) patient_name = u.name;
        }
        const rows = vitals.map(v => ({ ...v.toObject(), patient_name }));
        res.json({ success: true, vitals: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/my/all
const getMyVitals = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const vitals = await VitalStat.find({ patient_id: patient.patient_id }).sort({ record_date: -1 }).limit(30);
        res.json({ success: true, vitals, patient_id: patient.patient_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/my/latest-single
const getLatestVital = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const vital = await VitalStat.findOne({ patient_id: patient.patient_id }).sort({ record_date: -1 });
        res.json({ success: true, vital: vital || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE /api/vitals/delete/:id
const deleteVital = async (req, res) => {
    try {
        const vital = await VitalStat.findOne({ id: parseInt(req.params.id) });
        if (!vital) return res.status(404).json({ success: false, message: 'Vital record not found.' });

        await VitalStat.deleteOne({ id: parseInt(req.params.id) });
        res.json({ success: true, message: 'Vital record deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { addVitals, getVitals, getMyVitals, getLatestVital, deleteVital };
