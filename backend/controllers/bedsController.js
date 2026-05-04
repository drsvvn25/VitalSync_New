const Bed = require('../models/Bed');
const BedAllocation = require('../models/BedAllocation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');

const addBed = async (req, res) => {
    try {
        const { clinic_id, ward_type, bed_number } = req.body;
        const bed = await Bed.create({ clinic_id, ward_type, bed_number });
        res.status(201).json({ success: true, message: 'Bed added securely.', bed_id: bed.bed_id });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Error adding bed.' }); }
};

const autoReserveBed = async (patient_id, clinic_id) => {
    try {
        const wardOrder = ['Emergency', 'ICU', 'General'];
        let bed = null;
        for (const ward of wardOrder) {
            bed = await Bed.findOne({ clinic_id, status: 'available', ward_type: ward });
            if (bed) break;
        }
        if (!bed) bed = await Bed.findOne({ clinic_id, status: 'available' });
        if (!bed) return null;

        await Bed.updateOne({ bed_id: bed.bed_id }, { status: 'occupied' });
        await BedAllocation.create({ patient_id, bed_id: bed.bed_id });
        return bed;
    } catch (err) { console.error('Error auto-reserving bed:', err); return null; }
};

const getClinicBedAllocations = async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user_id: req.user.id });
        if (!doc || !doc.clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const beds = await Bed.find({ clinic_id: doc.clinic_id }).sort({ ward_type: 1, bed_number: 1 });
        const results = [];
        for (const b of beds) {
            const alloc = await BedAllocation.findOne({ bed_id: b.bed_id, discharge_date: null });
            let patient_name = null, patient_phone = null;
            if (alloc) {
                const p = await Patient.findOne({ patient_id: alloc.patient_id });
                if (p) { const u = await User.findOne({ id: p.user_id }); if (u) { patient_name = u.name; patient_phone = u.phone; } }
            }
            results.push({
                allocation_id: alloc ? alloc.allocation_id : null,
                admission_date: alloc ? alloc.admission_date : null,
                discharge_date: alloc ? alloc.discharge_date : null,
                bed_number: b.bed_number, ward_type: b.ward_type, status: b.status,
                patient_name, patient_phone
            });
        }
        res.json({ success: true, beds: results });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

const dischargePatient = async (req, res) => {
    try {
        const { allocation_id } = req.params;
        const alloc = await BedAllocation.findOne({ allocation_id: parseInt(allocation_id), discharge_date: null });
        if (!alloc) return res.status(404).json({ success: false, message: 'Allocation not found or already discharged.' });

        await BedAllocation.updateOne({ allocation_id: parseInt(allocation_id) }, { discharge_date: new Date() });
        await Bed.updateOne({ bed_id: alloc.bed_id }, { status: 'available' });
        res.json({ success: true, message: 'Bed released successfully.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { addBed, autoReserveBed, getClinicBedAllocations, dischargePatient };
