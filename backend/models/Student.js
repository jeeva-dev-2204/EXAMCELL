const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  regNo: { type: String, required: true, index: true },
  name: { type: String, required: true },
  batch: { type: String, required: true },  // e.g., '2022-2025'
  deptCode: { type: String, required: true } // e.g., '104'
}, { timestamps: true });

StudentSchema.index({ batch: 1, deptCode: 1, regNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', StudentSchema);
