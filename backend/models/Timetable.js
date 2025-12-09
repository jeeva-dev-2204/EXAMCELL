const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  date: { type: String, required: true },         // 'YYYY-MM-DD'
  session: { type: String, required: true },      // 'FN' | 'AN'
  deptCode: { type: String, required: true },     // '103', '104', ...
  semester: { type: String, required: true },     // 'I'...'VIII'
  regulation: { type: String, required: true },   // e.g., '2021' or '2025' (choose default if unknown)
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true }
}, { timestamps: true });

TimetableSchema.index({ date: 1, session: 1, deptCode: 1, courseCode: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
