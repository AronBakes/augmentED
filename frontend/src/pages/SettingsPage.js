import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';

function SettingsPage() {
  const [primaryColor, setPrimaryColor] = useState('#FF6384'); // Default red
  const [secondaryColor, setSecondaryColor] = useState('#36A2EB'); // Default blue
  const [defaultGpaScale, setDefaultGpaScale] = useState('7-point');
  const [defaultUnits, setDefaultUnits] = useState(3);
  const [defaultAssessmentWeight, setDefaultAssessmentWeight] = useState(20);
  const [studyRemindersEnabled, setStudyRemindersEnabled] = useState(false);
  const [assessmentAlertsEnabled, setAssessmentAlertsEnabled] = useState(false);
  const [gpaDropAlertEnabled, setGpaDropAlertEnabled] = useState(false);

  useEffect(() => {
    const savedPrimaryColor = localStorage.getItem('primaryColor');
    const savedSecondaryColor = localStorage.getItem('secondaryColor');
    if (savedPrimaryColor) {
      setPrimaryColor(savedPrimaryColor);
    }
    if (savedSecondaryColor) {
      setSecondaryColor(savedSecondaryColor);
    }

    const savedDefaultGpaScale = localStorage.getItem('defaultGpaScale');
    if (savedDefaultGpaScale) {
      setDefaultGpaScale(savedDefaultGpaScale);
    }

    const savedDefaultUnits = localStorage.getItem('defaultUnits');
    if (savedDefaultUnits) {
      setDefaultUnits(parseInt(savedDefaultUnits));
    }

    const savedDefaultAssessmentWeight = localStorage.getItem('defaultAssessmentWeight');
    if (savedDefaultAssessmentWeight) {
      setDefaultAssessmentWeight(parseInt(savedDefaultAssessmentWeight));
    }

    const savedStudyRemindersEnabled = localStorage.getItem('studyRemindersEnabled');
    if (savedStudyRemindersEnabled) {
      setStudyRemindersEnabled(JSON.parse(savedStudyRemindersEnabled));
    }

    const savedAssessmentAlertsEnabled = localStorage.getItem('assessmentAlertsEnabled');
    if (savedAssessmentAlertsEnabled) {
      setAssessmentAlertsEnabled(JSON.parse(savedAssessmentAlertsEnabled));
    }

    const savedGpaDropAlertEnabled = localStorage.getItem('gpaDropAlertEnabled');
    if (savedGpaDropAlertEnabled) {
      setGpaDropAlertEnabled(JSON.parse(savedGpaDropAlertEnabled));
    }
  }, []);

  const handleSaveColors = () => {
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    alert('Colors saved successfully!');
  };

  const handleSaveGeneralSettings = () => {
    localStorage.setItem('defaultGpaScale', defaultGpaScale);
    localStorage.setItem('defaultUnits', defaultUnits);
    localStorage.setItem('defaultAssessmentWeight', defaultAssessmentWeight);
    alert('General settings saved successfully!');
  };

  const handleSaveNotificationsSettings = () => {
    localStorage.setItem('studyRemindersEnabled', JSON.stringify(studyRemindersEnabled));
    localStorage.setItem('assessmentAlertsEnabled', JSON.stringify(assessmentAlertsEnabled));
    localStorage.setItem('gpaDropAlertEnabled', JSON.stringify(gpaDropAlertEnabled));
    alert('Notification settings saved successfully!');
  };

  const handleExportData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'augmentED_settings_backup.json';
    link.click();
    alert('Settings exported successfully!');
  };

  const handleImportData = () => {
    alert('Import Data functionality is coming soon!');
    // Future implementation would involve a file input and parsing the JSON
  };

  const handleResetAllData = () => {
    if (window.confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
      localStorage.clear();
      alert('All settings have been reset!');
      // Optionally, reload the page to reflect default settings
      window.location.reload();
    }
  };

  return (
    <Container>
      <Row>
        <Col>
          <h2 className="mb-4">Settings</h2>
          <Card bg="dark" text="white" className="mb-4">
            <Card.Header as="h4">Appearance</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label htmlFor="primaryColorInput">Primary Color (Analytics)</Form.Label>
                <Form.Control
                  type="color"
                  id="primaryColorInput"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  title="Choose your primary color"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label htmlFor="secondaryColorInput">Secondary Color (Analytics)</Form.Label>
                <Form.Control
                  type="color"
                  id="secondaryColorInput"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  title="Choose your secondary color"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleSaveColors}>Save Colors</Button>
              <hr className="my-4" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              <p>Light/Dark Mode (Coming Soon)</p>
              <p>Font Size (Coming Soon)</p>
            </Card.Body>
          </Card>

          <Card bg="dark" text="white" className="mb-4">
            <Card.Header as="h4">General</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Default GPA Scale</Form.Label>
                <Form.Control
                  as="select"
                  value={defaultGpaScale}
                  onChange={(e) => setDefaultGpaScale(e.target.value)}
                >
                  <option value="7-point">7-point (e.g., UQ, ANU)</option>
                  <option value="4.0">4.0 (e.g., US System)</option>
                  <option value="100-point">100-point (e.g., some European systems)</option>
                </Form.Control>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Default Units for New Courses</Form.Label>
                <Form.Control
                  type="number"
                  value={defaultUnits}
                  onChange={(e) => setDefaultUnits(parseInt(e.target.value))}
                  min="0"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Default Assessment Weight (%)</Form.Label>
                <Form.Control
                  type="number"
                  value={defaultAssessmentWeight}
                  onChange={(e) => setDefaultAssessmentWeight(parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleSaveGeneralSettings}>Save General Settings</Button>
            </Card.Body>
          </Card>

          <Card bg="dark" text="white" className="mb-4">
            <Card.Header as="h4">Notifications</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="studyRemindersSwitch"
                  label="Enable Study Reminders"
                  checked={studyRemindersEnabled}
                  onChange={(e) => setStudyRemindersEnabled(e.target.checked)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="assessmentAlertsSwitch"
                  label="Enable Assessment Due Date Alerts"
                  checked={assessmentAlertsEnabled}
                  onChange={(e) => setAssessmentAlertsEnabled(e.target.checked)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="gpaDropAlertSwitch"
                  label="Enable GPA Drop Alert"
                  checked={gpaDropAlertEnabled}
                  onChange={(e) => setGpaDropAlertEnabled(e.target.checked)}
                />
              </Form.Group>
              <Button variant="primary" onClick={handleSaveNotificationsSettings}>Save Notification Settings</Button>
            </Card.Body>
          </Card>

          <Card bg="dark" text="white" className="mb-4">
            <Card.Header as="h4">Data Management</Card.Header>
            <Card.Body>
              <Button variant="primary" onClick={handleExportData} className="mb-2">Export Data</Button>
              <br />
              <Button variant="secondary" onClick={handleImportData} className="mb-2">Import Data</Button>
              <br />
              <Button variant="danger" onClick={handleResetAllData}>Reset All Data</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default SettingsPage;
