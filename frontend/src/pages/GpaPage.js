import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Card, Accordion, Button, Modal, Form } from 'react-bootstrap';
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



function GpaPage() {
  const [courses, setCourses] = useState([]);
  const [groupedCourses, setGroupedCourses] = useState({});
  const [overallGpa, setOverallGpa] = useState(0);
  const [gpaSummary, setGpaSummary] = useState({ current_gpa: 0.0, max_possible_gpa: 0.0, completed_units: 0, attempted_units: 0, remaining_units: 0, total_degree_units: 0, average_simulated_gpa: 0.0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editedCourse, setEditedCourse] = useState(null);

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
      console.log('Parsed GPA summary data (frontend):', data); // Debugging line

      // Fetch courses to calculate Monte Carlo GPA
      const coursesResponse = await fetch('http://localhost:5000/api/courses');
      const coursesData = await coursesResponse.json();
      const courses = coursesData.courses || [];

      let averageSimulatedGpa = 0.0;
      const gradedCourses = courses.filter(c => c.grade != null);
      const attemptedUnits = data.attempted_units || 0;
      const totalDegreeUnits = data.total_degree_units;
      const remainingUnits = totalDegreeUnits - attemptedUnits;

      console.log('Monte Carlo - gradedCourses:', gradedCourses);
      console.log('Monte Carlo - remainingUnits:', remainingUnits);
      if (remainingUnits > 0 && gradedCourses.length > 0) {
        const currentGradeSum = gradedCourses.reduce((sum, course) => sum + course.grade, 0);
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
          const finalGpa = (currentGradeSum + futureGradeSum) / totalDegreeUnits;
          totalSimulatedGpa += finalGpa;
        }
        averageSimulatedGpa = (totalSimulatedGpa / SIMULATION_COUNT).toFixed(3);
        console.log('Monte Carlo - averageSimulatedGpa:', averageSimulatedGpa);
      } else {
        averageSimulatedGpa = data.current_gpa; // Default to current GPA if no forecast can be made
      }

      setGpaSummary({
        current_gpa: data.current_gpa,
        max_possible_gpa: data.max_possible_gpa,
        completed_units: data.completed_units,
        attempted_units: data.attempted_units || 0,
        remaining_units: data.remaining_units,
        total_degree_units: data.total_degree_units,
        average_simulated_gpa: averageSimulatedGpa,
      });
    } catch (error) {
      console.error('Error fetching GPA summary:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchGpaSummary();
  }, []);

  const handleEditClick = (course) => {
    setSelectedCourse(course);
    setEditedCourse({ ...course });
    setShowEditModal(true);
  };

  const handleDeleteClick = (course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedCourse(null);
    setEditedCourse(null);
  };

  const handleSaveChanges = async () => {
    if (!editedCourse) return;
    try {
      const response = await fetch(`http://localhost:5000/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedCourse),
      });
      if (!response.ok) throw new Error('Failed to update course');
      handleCloseModals();
      fetchCourses(); // Refresh course list
      fetchGpaSummary(); // Refresh GPA summary
    } catch (error) {
      console.error("Error updating course:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCourse) return;
    try {
      const response = await fetch(`http://localhost:5000/api/courses/${selectedCourse.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete course');
      handleCloseModals();
      fetchCourses(); // Refresh course list
      fetchGpaSummary(); // Refresh GPA summary
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCourse(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <h2 className="mb-4">GPA Tracker</h2>
          <Accordion defaultActiveKey="0" alwaysOpen>
            {Object.entries(groupedCourses).sort((a, b) => b[0].localeCompare(a[0])).map(([group, courses]) => (
              <Accordion.Item eventKey={group} key={group}>
                <Accordion.Header>{group}</Accordion.Header>
                <Accordion.Body>
                  <Table striped bordered hover variant="dark" responsive>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Grade</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id}>
                          <td>{course.code}</td>
                          <td><a href={`/course/${course.id}`} style={{ color: 'white' }}>{course.name}</a></td>
                          <td>{course.grade || 'N/A'}</td>
                          <td>
                            <Button variant="outline-light" size="sm" onClick={() => handleEditClick(course)}>Edit</Button>
                            <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleDeleteClick(course)}>Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Col>
        <Col md={4}>
          <Card bg="dark" text="white" className="mt-4">
            <Card.Header as="h4">GPA Summary</Card.Header>
            <Card.Body>
              <p>Current GPA: <strong>{gpaSummary.current_gpa}</strong></p>
              <p>Maximum Possible GPA: <strong>{gpaSummary.max_possible_gpa}</strong></p>
              <p>Completed Units (Passed): <strong>{gpaSummary.completed_units}</strong></p>
              <p>Attempted Units (Graded): <strong>{gpaSummary.attempted_units !== undefined ? gpaSummary.attempted_units : 'Loading...'}</strong></p>
              <p>Remaining Units: <strong>{gpaSummary.remaining_units}</strong></p>
              <p>Forecasted Final GPA (Monte Carlo): <strong>{gpaSummary.average_simulated_gpa}</strong></p>
            </Card.Body>
          </Card>
          <Card bg="dark" text="white" className="mt-4">
            <Card.Header as="h4">Grade Distribution</Card.Header>
            <Card.Body>
              <GradeDistribution courses={courses} />
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

      {/* Edit Course Modal */}
      <Modal show={showEditModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Course</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editedCourse && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Course Code</Form.Label>
                <Form.Control type="text" name="code" value={editedCourse.code} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Course Name</Form.Label>
                <Form.Control type="text" name="name" value={editedCourse.name} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Grade</Form.Label>
                <Form.Control type="number" name="grade" value={editedCourse.grade || ''} onChange={handleInputChange} />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModals}>Close</Button>
          <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the course "{selectedCourse?.name}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModals}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default GpaPage;