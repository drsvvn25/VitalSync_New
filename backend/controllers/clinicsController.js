const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');

// GET /api/clinics
const getAllClinics = async (req, res) => {
    try {
        const clinics = await Clinic.find().sort({ name: 1 });
        const rows = clinics.map(c => ({
            clinic_id: c.clinic_id, name: c.name, address: c.address,
            latitude: c.latitude, longitude: c.longitude, city: c.city,
            district: c.district, contact: c.contact, type: c.type || 'clinic'
        }));
        res.json({ success: true, clinics: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error retrieving clinics.' });
    }
};

const ACCURATE_CLINICS = [
    { name: 'Anand General Hospital', address: 'Town Hall Road, Anand, Gujarat 388001', latitude: 22.5629, longitude: 72.9282, city: 'Anand', district: 'Anand', contact: '02692-242200', type: 'hospital' },
    { name: 'Zydus Hospital Anand', address: 'NH-8, Anand-Vidyanagar Road, Anand 388120', latitude: 22.5472, longitude: 72.9507, city: 'Anand', district: 'Anand', contact: '02692-660000', type: 'hospital' },
    { name: 'Shree Krishna Hospital', address: 'Karamsad Road, Anand, Gujarat 388001', latitude: 22.5598, longitude: 72.9352, city: 'Anand', district: 'Anand', contact: '02692-244500', type: 'hospital' },
    { name: 'Pramukh Swami Medical College', address: 'Karamsad, Anand, Gujarat 388325', latitude: 22.5339, longitude: 72.9057, city: 'Karamsad', district: 'Anand', contact: '02692-229323', type: 'hospital' },
    { name: 'Suryapur Maternity & Surgical', address: 'GIDC, Vitthal Udyognagar, Gujarat 388121', latitude: 22.5536, longitude: 72.9591, city: 'Anand', district: 'Anand', contact: '02692-236100', type: 'hospital' },
    { name: 'Sai Eye Care Clinic', address: 'Anand-Sojitra Road, Near Bus Stand, Anand 388001', latitude: 22.5609, longitude: 72.9241, city: 'Anand', district: 'Anand', contact: '02692-241100', type: 'clinic' },
    { name: 'Dr. Shah Dental Clinic', address: 'Near Clock Tower, Station Road, Anand 388001', latitude: 22.5614, longitude: 72.9268, city: 'Anand', district: 'Anand', contact: '98250-11111', type: 'clinic' },
    { name: 'Sanjivani Polyclinic', address: 'Near Railway Station, Anand, Gujarat 388001', latitude: 22.5636, longitude: 72.9310, city: 'Anand', district: 'Anand', contact: '02692-255200', type: 'clinic' },
    { name: 'Navjivan Child & Maternity Clinic', address: 'Vallabh Vidyanagar, Anand, Gujarat 388120', latitude: 22.5425, longitude: 72.9238, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '02692-232000', type: 'clinic' },
    { name: 'Anand Orthopaedic Centre', address: 'Triveni Road, Anand, Gujarat 388001', latitude: 22.5651, longitude: 72.9333, city: 'Anand', district: 'Anand', contact: '02692-248000', type: 'clinic' },
    { name: 'Apollo Pharmacy - Anand', address: 'MG Road, Near Town Hall, Anand 388001', latitude: 22.5622, longitude: 72.9298, city: 'Anand', district: 'Anand', contact: '1800-180-1061', type: 'pharmacy' },
    { name: 'MedPlus - Vallabh Vidyanagar', address: 'VV Nagar Main Road, Vallabh Vidyanagar 388120', latitude: 22.5438, longitude: 72.9230, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '040-67006700', type: 'pharmacy' },
    { name: 'Wellness Forever Pharmacy', address: 'Karamsad Chokdi, Anand-Karamsad Road 388325', latitude: 22.5473, longitude: 72.9219, city: 'Anand', district: 'Anand', contact: '02692-260000', type: 'pharmacy' },
];

const NEW_DOCTORS = [
    { email: 'doctor3@vitalsync.com', name: 'Dr. Nisha Patel', specialization: 'Gynaecologist', experience: 12, clinicName: 'Shree Krishna Hospital' },
    { email: 'doctor4@vitalsync.com', name: 'Dr. Amit Desai', specialization: 'Orthopaedic Surgeon', experience: 9, clinicName: 'Anand Orthopaedic Centre' },
    { email: 'doctor5@vitalsync.com', name: 'Dr. Ravi Shah', specialization: 'Ophthalmologist', experience: 8, clinicName: 'Sai Eye Care Clinic' },
    { email: 'doctor6@vitalsync.com', name: 'Dr. Pooja Mehta', specialization: 'Paediatrician', experience: 6, clinicName: 'Navjivan Child & Maternity Clinic' },
    { email: 'doctor7@vitalsync.com', name: 'Dr. Suresh Kumar', specialization: 'Internal Medicine', experience: 15, clinicName: 'Sanjivani Polyclinic' },
    { email: 'doctor8@vitalsync.com', name: 'Dr. Anjali Verma', specialization: 'Dentist', experience: 7, clinicName: 'Dr. Shah Dental Clinic' },
    { email: 'doctor9@vitalsync.com', name: 'Dr. Vikram Joshi', specialization: 'General Surgeon', experience: 11, clinicName: 'Suryapur Maternity & Surgical' },
    { email: 'doctor10@vitalsync.com', name: 'Dr. Meera Iyer', specialization: 'General Physician', experience: 5, clinicName: 'Pramukh Swami Medical College' },
];

// POST /api/clinics/seed2
const seedClinicsV2 = async (req, res) => {
    try {
        const results = [];
        for (const c of ACCURATE_CLINICS) {
            const ex = await Clinic.findOne({ name: c.name });
            if (!ex) {
                await Clinic.create(c);
                results.push(`✅ Inserted: ${c.name}`);
            } else {
                await Clinic.updateOne({ name: c.name }, c);
                results.push(`🔄 Updated: ${c.name}`);
            }
        }

        const pwHash = await bcrypt.hash('Password@123', 12);
        for (const d of NEW_DOCTORS) {
            let user = await User.findOne({ email: d.email });
            if (!user) {
                user = await User.create({ name: d.name, email: d.email, password: pwHash, role: 'doctor', phone: '9000000000' });
                results.push(`✅ User created: ${d.name}`);
            } else { results.push(`ℹ️  User exists: ${d.name}`); }

            const clinic = await Clinic.findOne({ name: d.clinicName });
            const clinicId = clinic ? clinic.clinic_id : null;

            const docEx = await Doctor.findOne({ user_id: user.id });
            if (!docEx) {
                await Doctor.create({ user_id: user.id, clinic_id: clinicId, specialization: d.specialization, experience: d.experience });
                results.push(`✅ Doctor profile: ${d.name} → ${d.clinicName}`);
            } else {
                await Doctor.updateOne({ user_id: user.id }, { clinic_id: clinicId, specialization: d.specialization, experience: d.experience });
                results.push(`🔄 Doctor updated: ${d.name}`);
            }
        }

        const totalClinics = await Clinic.countDocuments();
        const totalDoctors = await Doctor.countDocuments();
        res.json({ success: true, totalClinics, totalDoctors, results });
    } catch (err) {
        console.error('seedClinicsV2 error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const seedClinics = seedClinicsV2;

const addClinic = async (req, res) => {
    try {
        const { name, address, latitude, longitude, contact, type } = req.body;
        if (!name || !address) {
            return res.status(400).json({ success: false, message: 'Name and address are required' });
        }
        
        const clinic = await Clinic.create({
            name,
            address,
            latitude: latitude || null,
            longitude: longitude || null,
            contact: contact || null,
            type: type || 'clinic'
        });
        
        res.status(201).json({ success: true, message: 'Clinic added successfully', clinic });
    } catch (err) {
        console.error('Error adding clinic:', err);
        res.status(500).json({ success: false, message: 'Server error adding clinic' });
    }
};

module.exports = { getAllClinics, seedClinics, seedClinicsV2, addClinic };
