import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

function DashboardPage() {
  const [gpa, setGpa] = useState(null);
  const [studyTime, setStudyTime] = useState(0);
  const [coursesCompleted, setCoursesCompleted] = useState(0);
  const [totalCourses, setTotalCourses] = useState(32); // Hardcoded to match TOTAL_UNITS_FOR_DEGREE

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GPA summary for completed courses and GPA
        const gpaRes = await fetch('http://localhost:5000/api/gpa_summary');
        if (!gpaRes.ok) throw new Error(`Failed to fetch GPA summary: ${gpaRes.status}`);
        const gpaData = await gpaRes.json();
        console.log('Dashboard GPA summary response:', gpaData);
        setCoursesCompleted(gpaData.completed_units);
        setGpa(gpaData.current_gpa.toFixed(2));

        // Fetch study time from /api/sessions
        const sessionsRes = await fetch('http://localhost:5000/api/sessions');
        if (!sessionsRes.ok) throw new Error(`Failed to fetch sessions: ${sessionsRes.status}`);
        const sessionsData = await sessionsRes.json();
        const totalStudyTime = sessionsData.sessions.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;
        setStudyTime(totalStudyTime);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <Container>
      <h2>Dashboard</h2>
      <Row>
        <Col md={4}>
          <Card bg="dark" text="white" className="mb-4">
            <Card.Header>Current GPA</Card.Header>
            <Card.Body>
              <Card.Title>{gpa !== null ? gpa : 'Loading...'}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card bg="dark" text="white" className="mb-4">
            <Card.Header>Total Study Time</Card.Header>
            <Card.Body>
              <Card.Title>{studyTime} minutes</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card bg="dark" text="white" className="mb-4">
            <Card.Header>Courses Completed</Card.Header>
            <Card.Body>
              <Card.Title>{coursesCompleted} / {totalCourses}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card bg="dark" text="white">
            <Card.Header>Quick Actions</Card.Header>
            <Card.Body>
              <Button href="/gpa" variant="primary" className="me-2">View GPA</Button>
              <Button href="/study" variant="primary" className="me-2">Track Study</Button>
              <Button href="/analytics" variant="primary">View Analytics</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardPage;