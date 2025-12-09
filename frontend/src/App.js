import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import StudentDetails from './components/StudentDetails';
import ExamRegistration from './components/ExamRegistration';
import Attendance from './components/Attendance';
import './styles.css';

function App() {
  return (
    <Router>
      <header className="header-bar">
        <img className="logo" alt="SSCE Logo" src="C:\Users\Monika\SSCEEXAMCELL\frontend\src\ssce.png" />
        <div style={{ textAlign: "center", marginTop: "10px",marginLeft:"300px", fontFamily:"Times New Roman', Times, serif" }}>
      <h1 style={{ marginBottom: "5px" }}>
        SREE SOWDAMBIKA COLLEGE OF ENGINEERING
      </h1>
      <h3 style={{ margin: "5px 0" }}>AUTONOMOUS</h3>
      <h3 style={{ marginTop: "5px", color: "#ffffffff" }}>
        WELCOME TO THE CONTROLLER OF THE EXAMINATION
      </h3>
    </div>
      </header>

      <nav className="navbar">
        <ul className="nav-links">
          <li><NavLink className="nav-item" to="/">HOME</NavLink></li>
          <li><NavLink className="nav-item" to="/students">STUDENT DETAILS</NavLink></li>
          <li><NavLink className="nav-item" to="/students">FACULTY DETAILS</NavLink></li>
          <li><NavLink className="nav-item" to="/exams">EXAMINATION</NavLink></li>
          <li><NavLink className="nav-item" to="/attendance">ATTENDANCE ENTRY</NavLink></li>
          <li><NavLink className="nav-item" to="/students">ADMIN UTILITY</NavLink></li>
          <li><NavLink className="nav-item" to="/students">REPORTS</NavLink></li>
          <li><NavLink className="nav-item" to="/students">LOGOUT</NavLink></li>
        </ul>
        <div className="nav-timestamp">{new Date().toLocaleString('en-IN')}</div>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentDetails />} />
          <Route path="/exams" element={<ExamRegistration />} />
          <Route path="/attendance" element={<Attendance />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
