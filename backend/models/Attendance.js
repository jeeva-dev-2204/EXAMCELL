const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  examDetails: {
    date: { type: String, required: true },
    session: { type: String, required: true },
    courseCode: { type: String, required: true },
    courseName: { type: String },
    semester: { type: String, required: true },
    deptCode: { type: String, required: true },
    regulation: { type: String }
  },
  entries: [
    {
      regNo: { type: String, required: true },
      status: { type: String, enum: ['PRESENT', 'ABSENT'], default: 'PRESENT' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
