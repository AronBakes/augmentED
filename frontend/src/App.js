import React from 'react';
import './App.css'; // Keep this line
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';

import DashboardPage from './pages/DashboardPage';
import GpaPage from './pages/GpaPage';
import StudyTrackerPage from './pages/StudyTrackerPage';
import CourseDetailPage from './pages/CourseDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PracticePage from './pages/PracticePage'; // Import the new page

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg" className="Navbar">
          <Container>
            <Navbar.Brand as={Link} to="/">Project AugmentED</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/gpa">GPA Tracker</Nav.Link>
                <Nav.Link as={Link} to="/study">Study Tracker</Nav.Link>
                <Nav.Link as={Link} to="/analytics">Analytics</Nav.Link>
                <Nav.Link as={Link} to="/practice">Practice</Nav.Link> {/* Add Practice link */}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/gpa" element={<GpaPage />} />
            <Route path="/study" element={<StudyTrackerPage />} />
            <Route path="/course/:courseId" element={<CourseDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/practice" element={<PracticePage />} /> {/* Add Practice route */}
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;