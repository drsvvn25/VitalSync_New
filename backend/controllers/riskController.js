const Patient = require('../models/Patient');
const VitalStat = require('../models/VitalStat');

const scoreVitals = (v) => {
    let score = 0;
    const breakdown = [];
    if (v.heart_rate != null && v.heart_rate > 110) { score += 2; breakdown.push({ factor: 'Heart Rate', value: `${v.heart_rate} bpm`, points: 2, reason: 'HR > 110 bpm' }); }
    if (v.oxygen_level != null && v.oxygen_level < 92) { score += 3; breakdown.push({ factor: 'Oxygen Level', value: `${v.oxygen_level}%`, points: 3, reason: 'O₂ < 92%' }); }
    if (v.sugar_level != null && v.sugar_level > 200) { score += 2; breakdown.push({ factor: 'Sugar Level', value: `${v.sugar_level} mg/dL`, points: 2, reason: 'Sugar > 200 mg/dL' }); }
    if (v.temperature != null && v.temperature > 38) { score += 2; breakdown.push({ factor: 'Temperature', value: `${v.temperature}°C`, points: 2, reason: 'Temp > 38°C' }); }
    let level = 'Low', color = '#22c55e';
    if (score >= 6) { level = 'High'; color = '#ef4444'; }
    else if (score >= 3) { level = 'Medium'; color = '#f59e0b'; }
    return { score, level, color, breakdown };
};

const getMyRisk = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user_id: req.user.id });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const rows = await VitalStat.find({ patient_id: patient.patient_id }).sort({ record_date: -1 }).limit(7);
        if (rows.length === 0) return res.json({ success: true, score: 0, level: 'Low', color: '#22c55e', breakdown: [], trend: [] });
        const latest = rows[0];
        const { score, level, color, breakdown } = scoreVitals(latest);
        const trend = [...rows].reverse().map(v => ({ date: v.record_date, score: scoreVitals(v).score, level: scoreVitals(v).level }));
        res.json({ success: true, score, level, color, breakdown, trend, latest });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getPatientRisk = async (req, res) => {
    try {
        const rows = await VitalStat.find({ patient_id: parseInt(req.params.patientId) }).sort({ record_date: -1 }).limit(7);
        if (rows.length === 0) return res.json({ success: true, score: 0, level: 'Low', color: '#22c55e', breakdown: [], trend: [] });
        const latest = rows[0];
        const { score, level, color, breakdown } = scoreVitals(latest);
        const trend = [...rows].reverse().map(v => ({ date: v.record_date, score: scoreVitals(v).score, level: scoreVitals(v).level }));
        res.json({ success: true, score, level, color, breakdown, trend, latest });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getMyRisk, getPatientRisk };
