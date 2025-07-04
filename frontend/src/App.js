import React, { useState } from 'react';
import './App.css'; // Keep this line
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import Sidebar from './components/Sidebar'; // Import the new Sidebar component

import DashboardPage from './pages/DashboardPage';
import GpaPage from './pages/GpaPage';
import StudyTrackerPage from './pages/StudyTrackerPage';
import CourseDetailPage from './pages/CourseDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PracticePage from './pages/PracticePage';
import SavedQuestionsPage from './pages/SavedQuestionsPage';
import AIAssistedGraderPage from './pages/AIAssistedGraderPage'; // Import the new page
import SettingsPage from './pages/SettingsPage';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <Router>
      <div className="App" style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <button className="hamburger-button" onClick={toggleSidebar}>
            ☰
          </button>
          <h3>AugmentED</h3>
          <Sidebar isCollapsed={isSidebarCollapsed} />
        </div>

        {/* Main Content Area */}
        <div className="main-content" style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/gpa" element={<GpaPage />} />
            <Route path="/study" element={<StudyTrackerPage />} />
            <Route path="/course/:courseId" element={<CourseDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/saved-questions" element={<SavedQuestionsPage />} />
            <Route path="/grader" element={<AIAssistedGraderPage />} /> {/* Add AI Assisted Grader route */}
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;