import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Card, Accordion } from 'react-bootstrap';
import GpaTracker from '../components/GpaTracker.js';
import AddCourseForm from '../components/AddCourseForm.js';
import TranscriptUploader from '../components/TranscriptUploader.js';

// --- Helper component to display the grade distribution ---
function GradeDistribution({ courses }) {
  const [distribution, setDistribution] = useState({});

  useEffect(() => {
    if (!courses || courses.length === 0) {
      setDistribution({});
      return;
    }
    const newDistribution = courses.reduce((acc, course) => {
      const grade = course.grade;
      if (grade) { // Only count courses that have a grade
        acc[grade] = (acc[grade] || 0) + 1;
      }
      return acc;
    }, {});
    setDistribution(newDistribution);
  }, [courses]);

  const gradeMap = { 7: 'High Distinction', 6: 'Distinction', 5: 'Credit', 4: 'Pass', 3: 'Fail', 2: 'Fail', 1: 'Fail' };

  return (
    <div>
      <h4>Grade Distribution</h4>
      <Table striped bordered hover variant="dark" responsive size="sm">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Description</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(distribution).length > 0 ? (
            Object.entries(distribution).sort((a, b) => b[0] - a[0]).map(([grade, count]) => (
              <tr key={grade}>
                <td>{grade}</td>
                <td>{gradeMap[grade] || 'N/A'}</td>
                <td>{count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">No graded courses yet.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

// --- Component for GPA Forecasting and Monte Carlo Simulation ---
function GpaForecast({ courses, gpaSummary }) {
  const [insights, setInsights] = useState(null);
  const TOTAL_UNITS_FOR_DEGREE = 32;

  useEffect(() => {
    if (!gpaSummary || gpaSummary.completed_courses === undefined || !courses || courses.length === 0) {
      setInsights(null);
      return;
    }
    const completedUnits = gpaSummary.completed_courses;
    const remainingUnits = TOTAL_UNITS_FOR_DEGREE - completedUnits;
    if (remainingUnits <= 0) {
      setInsights(null);
      return;
    }

    const gradedCourses = courses.filter(c => c.grade != null);
    if (gradedCourses.length === 0) {
      setInsights(null);
      return;
    }

    const currentGradeSum = gradedCourses.reduce((sum, course) => sum + course.grade, 0);
    const maxFutureGradeSum = remainingUnits * 7;
    const maxPossibleGpa = (currentGradeSum + maxFutureGradeSum) / TOTAL_UNITS_FOR_DEGREE;

    const gradeCounts = gradedCourses.reduce((acc, course) => {
      acc[course.grade] = (acc[course.grade] || 0) + 1;
      return acc;
    }, {});

    const gradeProbabilities = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade: parseInt(grade),
      probability: count / gradedCourses.length,
    }));
    let cumulativeProbability = 0;
    const cumulativeDistribution = gradeProbabilities
      .sort((a, b) => a.grade - b.grade)
      .map(item => {
        cumulativeProbability += item.probability;
        return { ...item, cumulative: cumulativeProbability };
      });
    const runSimulation = () => {
      const rand = Math.random();
      for (const item of cumulativeDistribution) {
        if (rand <= item.cumulative) return item.grade;
      }
      return cumulativeDistribution[cumulativeDistribution.length - 1].grade;
    };
    const SIMULATION_COUNT = 5000;
    let totalSimulatedGpa = 0;
    for (let i = 0; i < SIMULATION_COUNT; i++) {
      let futureGradeSum = 0;
      for (let j = 0; j < remainingUnits; j++) {
        futureGradeSum += runSimulation();
      }
      const finalGpa = (currentGradeSum + futureGradeSum) / TOTAL_UNITS_FOR_DEGREE;
      totalSimulatedGpa += finalGpa;
    }
    const averageSimulatedGpa = totalSimulatedGpa / SIMULATION_COUNT;
    setInsights({
      remainingUnits,
      maxPossibleGpa: maxPossibleGpa.toFixed(3),
      averageSimulatedGpa: averageSimulatedGpa.toFixed(3),
    });
  }, [gpaSummary, courses]);

  if (!insights || insights.remainingUnits <= 0) {
    return null;
  }

  return (
    <Card bg="dark" text="white" className="mt-4">
      <Card.Header as="h4">Future GPA Forecast</Card.Header>
      <Card.Body>
        <p>You have <strong>{insights.remainingUnits}</strong> units remaining in your degree.</p>
        <ul>
          <li>Your maximum possible GPA is <strong>{insights.maxPossibleGpa}</strong> (if you get all 7s).</li>
          <li>Based on a Monte Carlo simulation, your average forecasted GPA is <strong>~{insights.averageSimulatedGpa}</strong>.</li>
        </ul>
        <Card.Text className="text-muted" style={{ fontSize: '0.8rem' }}>
          (Monte Carlo simulation based on 5000 runs using your historical grade distribution.)
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

function GpaPage() {
  const [courses, setCourses] = useState([]);
  const [groupedCourses, setGroupedCourses] = useState({});
  const [overallGpa, setOverallGpa] = useState(0);
  const [gpaSummary, setGpaSummary] = useState({ completed_courses: 0, total_courses: 32, gpa: 0.0 }); // Hardcoded total to 32

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/courses');
      console.log('Courses fetch response:', await response.clone().text()); // Log raw response
      if (!response.ok) throw new Error(`Failed to fetch courses: ${response.status}`);
      const data = await response.json();
      console.log('Parsed courses data:', data);
      setCourses(data.courses);

      const gradedCourses = data.courses.filter(c => c.grade != null);
      if (gradedCourses.length > 0) {
        const totalGrade = gradedCourses.reduce((sum, c) => sum + c.grade, 0);
        setOverallGpa((totalGrade / gradedCourses.length).toFixed(3));
      } else {
        setOverallGpa(0);
      }
      
      const groups = data.courses.reduce((acc, course) => {
        const key = (course.year && course.semester) ? `${course.year} - ${course.semester}` : 'Uncategorized';
        if (!acc[key]) { acc[key] = []; }
        acc[key].push(course);
        return acc;
      }, {});
      setGroupedCourses(groups);

    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchGpaSummary = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/gpa_summary');
      console.log('GPA summary fetch response:', await response.clone().text()); // Log raw response
      if (!response.ok) throw new Error(`Failed to fetch GPA summary: ${response.status}`);
      const data = await response.json();
      console.log('Parsed GPA summary data:', data);
      setGpaSummary({
        completed_courses: data.completed_courses,
        total_courses: data.total_courses,
        gpa: data.gpa
      });
    } catch (error) {
      console.error('Error fetching GPA summary:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchGpaSummary();
  }, []);

  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Your GPA Tracker</h2>
            <h3>Overall GPA: {gpaSummary.gpa}</h3>
          </div>
          <Accordion defaultActiveKey="0" alwaysOpen>
            {Object.entries(groupedCourses).sort((a, b) => b[0].localeCompare(a[0])).map(([key, courses], i) => (
              <Accordion.Item eventKey={i.toString()} key={key}>
                <Accordion.Header>{key}</Accordion.Header>
                <Accordion.Body>
                  <GpaTracker courses={courses} refreshCourses={fetchCourses} />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Col>
        <Col md={4}>
          <GradeDistribution courses={courses} />
          <GpaForecast courses={courses} gpaSummary={gpaSummary} /> {/* Pass both props */}
          <Card bg="dark" text="white" className="mt-4">
            <Card.Header as="h4">Completion Summary</Card.Header>
            <Card.Body>
              <p>Completed: {gpaSummary.completed_courses}/{gpaSummary.total_courses} courses</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <hr style={{ width: '100%', margin: '40px auto' }} />
      <Row>
        <Col>
          <AddCourseForm onCourseAdded={fetchCourses} />
          <TranscriptUploader onUploadComplete={fetchCourses} />
        </Col>
      </Row>
    </Container>
  );
}

export default GpaPage;