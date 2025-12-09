const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
  regulation: { type: String, required: true }, // '2021' or '2025'
  deptCode: { type: String, required: true },   // '104'
  semester: { type: String, required: true },   // 'I'...'VIII' (uppercase Roman)
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true }
}, { timestamps: true });

SyllabusSchema.index({ regulation: 1, deptCode: 1, semester: 1, courseCode: 1 }, { unique: true });

module.exports = mongoose.model('Syllabus', SyllabusSchema);
