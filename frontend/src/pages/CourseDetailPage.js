// frontend/src/pages/CourseDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Table, Button, Card, Form, Row, Col } from 'react-bootstrap';
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

function CourseDetailPage() {
  const [assessments, setAssessments] = useState([]);
  const [course, setCourse] = useState(null);
  const { courseId } = useParams();

  // --- NEW: State for editing assessments ---
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', weight: '', score: '' });

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
    } catch (error) {
      console.error("Error fetching course data:", error);
    }
  };

  useEffect(() => { fetchCourseData(); }, [courseId]);

  // --- NEW: Handlers for Editing and Deleting Assessments ---
  const handleEditClick = (assessment) => {
    setEditingAssessmentId(assessment.id);
    setEditFormData({ name: assessment.name, weight: assessment.weight, score: assessment.score || '' });
  };

  const handleCancelClick = () => {
    setEditingAssessmentId(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async (assessmentId) => {
    const dataToSend = {
      name: editFormData.name,
      weight: parseFloat(editFormData.weight),
      score: editFormData.score ? parseFloat(editFormData.score) : null
    };
    const response = await fetch(`/api/assessment/${assessmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });
    if (response.ok) {
      setEditingAssessmentId(null);
      fetchCourseData();
    } else {
      alert("Failed to update assessment.");
      console.error('PATCH response:', await response.text()); // Debug
    }
  };

  const handleDeleteClick = async (assessmentId) => {
    if (window.confirm("Are you sure you want to delete this assessment?")) {
      const response = await fetch(`/api/assessment/${assessmentId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchCourseData();
      } else {
        alert("Failed to delete assessment.");
        console.error('DELETE response:', await response.text()); // Debug
      }
    }
  };

  if (!course) { return <div>Loading...</div>; }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{course.code}: {course.name}</h2>
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
                    <Button variant="primary" size="sm" onClick={() => handleEditClick(assessment)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteClick(assessment.id)} className="ms-2">Delete</Button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {assessments.length === 0 && (
            <tr><td colSpan="5" className="text-center">No assessments logged for this course yet.</td></tr>
          )}
        </tbody>
      </Table>
      
      <ForecastDisplay assessments={assessments} />
      <hr style={{borderColor: 'white', margin: '40px 0'}}/>
      <AddAssessmentForm courseId={courseId} onAssessmentAdded={fetchCourseData} />
    </Container>
  );
}

export default CourseDetailPage;