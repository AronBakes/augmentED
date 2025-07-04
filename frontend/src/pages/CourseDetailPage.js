// frontend/src/pages/CourseDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Table, Button, Card, Form, Row, Col, Modal } from 'react-bootstrap';
import AddAssessmentForm from '../components/AddAssessmentForm';

// --- Helper component for the forecast results ---
function ForecastDisplay({ assessments }) {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    if (!assessments || assessments.length === 0) {
      setForecast(null);
      return;
    }

    const completedWeight = assessments.reduce((sum, a) => sum + (a.score != null ? a.weight : 0), 0);
    const currentWeightedScore = assessments.reduce((sum, a) => sum + (a.score != null ? a.weight * (a.score / 100) : 0), 0);
    const remainingWeight = 100 - completedWeight;

    if (remainingWeight <= 0.01) {
      setForecast(null);
      return;
    }

    const targetGrades = [
      { name: 'Pass (4)', threshold: 50 },
      { name: 'Credit (5)', threshold: 65 },
      { name: 'Distinction (6)', threshold: 75 },
      { name: 'High Distinction (7)', threshold: 85 },
    ];

    const requiredScores = targetGrades.map(target => {
      const scoreNeeded = target.threshold - currentWeightedScore;
      const percentageRequired = (scoreNeeded / remainingWeight) * 100;
      return { grade: target.name, scoreRequired: percentageRequired };
    });

    setForecast({
      currentScore: currentWeightedScore.toFixed(2),
      remainingWeight: remainingWeight.toFixed(2),
      requiredScores: requiredScores,
    });
  }, [assessments]);

  if (!forecast) {
    return null;
  }

  return (
    <Card bg="secondary" text="white" className="mt-5">
      <Card.Header as="h4">Final Assessment Forecast</Card.Header>
      <Card.Body>
        <p>Your current weighted score is <strong>{forecast.currentScore}%</strong>. You have <strong>{forecast.remainingWeight}%</strong> of assessment remaining.</p>
        <p>To achieve the following final grades, you need this score on your remaining assessment(s):</p>
        <Table striped bordered hover variant="dark" size="sm">
          <thead>
            <tr>
              <th>Target Grade</th>
              <th>Required Score</th>
            </tr>
          </thead>
          <tbody>
            {forecast.requiredScores.map(req => (
              <tr key={req.grade} className={req.scoreRequired > 100 ? 'text-danger' : req.scoreRequired < 0 ? 'text-success' : ''}>
                <td>{req.grade}</td>
                <td>
                  {req.scoreRequired > 100 ? "Impossible" : 
                   req.scoreRequired < 0 ? "Already Achieved" : 
                   `${req.scoreRequired.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

function getGradeFromScore(score) {
  if (score >= 85) return '7 High Distinction';
  if (score >= 75) return '6 Distinction';
  if (score >= 65) return '5 Credit';
  if (score >= 50) return '4 Pass';
  if (score >= 40) return '3 Marginal Fail';
  if (score >= 25) return '2 Fail';
  return '1 Low Fail';
}

function CourseDetailPage() {
  const [assessments, setAssessments] = useState([]);
  const [course, setCourse] = useState(null);
  const [allCourses, setAllCourses] = useState([]); // New state for all courses
  const { courseId } = useParams();
  const navigate = useNavigate(); // Initialize useNavigate

  // --- NEW: State for editing assessments ---
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', weight: '', score: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const fetchCourseData = async () => {
    try {
      const courseRes = await fetch(`/api/course/${courseId}`);
      if (!courseRes.ok) throw new Error(`Failed to fetch course details: ${courseRes.status}`);
      const courseData = await courseRes.json();
      setCourse(courseData);

      const assessmentRes = await fetch(`/api/course/${courseId}/assessments`);
      if (!assessmentRes.ok) throw new Error(`Failed to fetch assessments: ${assessmentRes.status}`);
      const assessmentData = await assessmentRes.json();
      console.log('Assessments response:', assessmentData); // Debug log
      setAssessments(assessmentData.assessments || []);

      // Fetch all courses for the dropdown
      const allCoursesRes = await fetch('/api/courses');
      if (!allCoursesRes.ok) throw new Error(`Failed to fetch all courses: ${allCoursesRes.status}`);
      const allCoursesData = await allCoursesRes.json();
      setAllCourses(allCoursesData.courses);

    } catch (error) {
      console.error("Error fetching course data:", error);
    }
  };

  const handleCourseChange = (e) => {
    const newCourseId = e.target.value;
    if (newCourseId) {
      navigate(`/course/${newCourseId}`);
    }
  };

  useEffect(() => { fetchCourseData(); }, [courseId]);

  const handleEditClick = (assessment) => {
    setSelectedAssessment(assessment);
    setEditFormData({ name: assessment.name, weight: assessment.weight, score: assessment.score || '' });
    setShowEditModal(true);
  };

  const handleDeleteClick = (assessment) => {
    setSelectedAssessment(assessment);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedAssessment(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelClick = () => {
    setEditingAssessmentId(null);
  };

  const handleSaveClick = async () => {
    if (!selectedAssessment) return;
    const dataToSend = {
      name: editFormData.name,
      weight: parseFloat(editFormData.weight),
      score: editFormData.score ? parseFloat(editFormData.score) : null
    };
    const response = await fetch(`/api/assessment/${selectedAssessment.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });
    if (response.ok) {
      handleCloseModals();
      fetchCourseData();
    } else {
      alert("Failed to update assessment.");
      console.error('PATCH response:', await response.text()); // Debug
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAssessment) return;
    const response = await fetch(`/api/assessment/${selectedAssessment.id}`, { method: 'DELETE' });
    if (response.ok) {
      handleCloseModals();
      fetchCourseData();
    } else {
      alert("Failed to delete assessment.");
      console.error('DELETE response:', await response.text()); // Debug
    }
  };

  if (!course) { return <div>Loading...</div>; }

  const totalWeightedScore = assessments.reduce((sum, assessment) => {
    if (assessment.score != null) {
      return sum + (assessment.weight * (assessment.score / 100));
    }
    return sum;
  }, 0);

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{course.code}: {course.name}</h2>
        <Form.Group controlId="courseSelector">
          <Form.Select onChange={handleCourseChange} value={courseId}>
            {allCourses.map(c => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.name || 'Unnamed Course'}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Button as={Link} to="/gpa" variant="secondary">Back to GPA Tracker</Button>
      </div>

      <h4>Assessment Breakdown</h4>
      <Table striped bordered hover variant="dark" responsive>
        <thead>
          <tr>
            <th>Assessment Name</th>
            <th>Weight (%)</th>
            <th>Score (%)</th>
            <th>Weighted Score (%)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map(assessment => (
            <tr key={assessment.id}>
              {editingAssessmentId === assessment.id ? (
                <>
                  <td><Form.Control type="text" name="name" value={editFormData.name} onChange={handleEditFormChange} /></td>
                  <td><Form.Control type="number" step="0.01" name="weight" value={editFormData.weight} onChange={handleEditFormChange} /></td>
                  <td><Form.Control type="number" step="0.01" name="score" value={editFormData.score} onChange={handleEditFormChange} placeholder="Not Graded" /></td>
                  <td>N/A</td>
                  <td>
                    <Button variant="success" size="sm" onClick={() => handleSaveClick(assessment.id)}>Save</Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelClick} className="ms-2">Cancel</Button>
                  </td>
                </>
              ) : (
                <>
                  <td>{assessment.name}</td>
                  <td>{assessment.weight ? assessment.weight.toFixed(2) : 'N/A'}</td>
                  <td>{assessment.score != null ? assessment.score.toFixed(2) : 'Not Graded'}</td>
                  <td>{assessment.score != null ? (assessment.weight * (assessment.score / 100)).toFixed(2) : 'N/A'}</td>
                  <td>
                    <Button variant="outline-light" size="sm" onClick={() => handleEditClick(assessment)}>Edit</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(assessment)} className="ms-2">Delete</Button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {assessments.length === 0 && (
            <tr><td colSpan="5" className="text-center">No assessments logged for this course yet.</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3" className="text-end"><strong>Total Weighted Score:</strong></td>
            <td><strong>{totalWeightedScore.toFixed(2)}%</strong></td>
            <td><strong>{getGradeFromScore(totalWeightedScore)}</strong></td>
          </tr>
        </tfoot>
      </Table>
      
      <ForecastDisplay assessments={assessments} />
      <hr style={{borderColor: 'white', margin: '40px 0'}}/>
      <AddAssessmentForm courseId={courseId} onAssessmentAdded={fetchCourseData} />

      {/* Edit Assessment Modal */}
      <Modal show={showEditModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Assessment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editFormData && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Assessment Name</Form.Label>
                <Form.Control type="text" name="name" value={editFormData.name} onChange={handleEditFormChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Weight (%)</Form.Label>
                <Form.Control type="number" step="0.01" name="weight" value={editFormData.weight} onChange={handleEditFormChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Score (%)</Form.Label>
                <Form.Control type="number" step="0.01" name="score" value={editFormData.score} onChange={handleEditFormChange} placeholder="Not Graded" />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModals}>Close</Button>
          <Button variant="primary" onClick={handleSaveClick}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseModals} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the assessment "{selectedAssessment?.name}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModals}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CourseDetailPage;