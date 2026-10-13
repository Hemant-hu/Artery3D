import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Services from './pages/Services';
import About from './pages/About';
import Contact from './pages/Contact';
import NewPatient from './pages/NewPatient';
import Report from './pages/Report';
import './index.css';

/**
 * ProtectedRoute component:
 * Guarantees that sensitive patient records, 3D anatomical models,
 * and clinical consultation reports are strictly gated behind authenticated clinician login.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: 'Clinician authentication required. Please sign in to access patient records and clinical reports.'
        }}
      />
    );
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Hospital Portal Routes - Website starts on Home */}
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Physician Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Patient Data & Clinical Diagnostics Routes (Login Required) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-patient"
          element={
            <ProtectedRoute>
              <NewPatient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:id"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />

        {/* Default Catch-All: Always redirect unknown routes to the Home page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
