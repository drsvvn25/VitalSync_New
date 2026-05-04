const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const VitalStat = require('../models/VitalStat');

const calculateRiskPrediction = async (patient_id) => {
    const vitals = await VitalStat.find({ patient_id }).sort({ record_date: 1 }).limit(10);
    if (vitals.length === 0) return { score: 0, level: 'Low Risk', trend: [] };

    let instabilityPoints = 0;
    const trend = [];
    vitals.forEach((v) => {
        let dailyScore = 0;
        if (v.heart_rate > 100 || v.heart_rate < 60) dailyScore += 20;
        if (v.oxygen_level < 95) dailyScore += 30;
        if (v.oxygen_level < 90) dailyScore += 50;
        if (v.temperature > 37.5) dailyScore += 15;
        if (v.sugar_level > 140) dailyScore += 10;
        instabilityPoints += dailyScore;
        trend.push({ date: v.record_date, risk: Math.min(dailyScore, 100) });
    });

    const recent = trend.slice(-3);
    const recentAvg = recent.reduce((sum, t) => sum + t.risk, 0) / (recent.length || 1);
    const finalScore = Math.min(Math.round(recentAvg * 1.5), 100);
    let level = 'Low Risk';
    if (finalScore > 40) level = 'Moderate Risk';
    if (finalScore > 75) level = 'High Risk';
    return { score: finalScore, level, trend };
};

const getMyRisk = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
        const riskData = await calculateRiskPrediction(patient.patient_id);
        res.json({ success: true, ...riskData });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

const getDoctorPatientRisks = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user.id });
        if (!doctor) return res.status(403).json({ success: false });
        const appts = await Appointment.find({ doctor_id: doctor.doctor_id });
        const patientIds = [...new Set(appts.map(a => a.patient_id))];
        const riskArray = [];
        for (const pid of patientIds) {
            const p = await Patient.findOne({ patient_id: pid });
            const u = p ? await User.findOne({ id: p.user_id }) : null;
            const riskData = await calculateRiskPrediction(pid);
            if (riskData.score > 40) riskArray.push({ patient_id: pid, name: u ? u.name : 'Unknown', score: riskData.score, level: riskData.level });
        }
        res.json({ success: true, risks: riskArray });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

module.exports = { getMyRisk, getDoctorPatientRisks, calculateRiskPrediction };
