const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    department: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    password: { type: String, required: true },
});

module.exports = mongoose.model('Employee', EmployeeSchema);