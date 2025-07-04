import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner, Alert } from 'react-bootstrap';

function AIAssistedGraderPage() {
  const [rubricFile, setRubricFile] = useState(null);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRubricFileChange = (event) => {
    setRubricFile(event.target.files[0]);
  };

  const handleAssignmentFileChange = (event) => {
    setAssignmentFile(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setGradeResult(null);

    if (!rubricFile || !assignmentFile) {
      setError('Please upload both the rubric and the assignment.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('rubric', rubricFile);
    formData.append('assessment', assignmentFile);

    try {
        const response = await fetch('http://localhost:5000/api/grade_assessment', {
            method: 'POST', body: formData,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setGradeResult(data);
    } catch (e) {
        setError(`Failed to grade assignment: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Container>
      <h2 className="mb-4">AI Assisted Grader</h2>
      <Card bg="dark" text="white" className="mb-4">
        <Card.Header as="h4">Upload Files</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="rubricUpload" className="mb-3">
              <Form.Label>Upload Rubric (PDF)</Form.Label>
              <Form.Control type="file" accept=".pdf" onChange={handleRubricFileChange} />
            </Form.Group>
            <Form.Group controlId="assignmentUpload" className="mb-3">
              <Form.Label>Upload Assignment (PDF)</Form.Label>
              <Form.Control type="file" accept=".pdf" onChange={handleAssignmentFileChange} />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner animation="border" size="sm" className="me-2" /> : ''}
              Grade Assignment
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

      {gradeResult && (
        <Card bg="dark" text="white" className="mt-4">
          <Card.Header as="h4">Grading Results</Card.Header>
          <Card.Body>
            <h5>Overall Score: {gradeResult.overallPoints}</h5>
            <p><strong>Overall Feedback:</strong> {gradeResult.overallFeedback}</p>
            <hr />
            <h6>Marked Rubric Breakdown:</h6>
            {gradeResult.markedRubric && Array.isArray(gradeResult.markedRubric) && gradeResult.markedRubric.map((item, index) => (
              <div key={index} className="mb-3">
                <p><strong>{item.criterion}:</strong> {item.points}</p>
                <p>Feedback: {item.feedback}</p>
                {item.specificExample && <p className="text-warning">Example: {item.specificExample}</p>}
                {item.improvement && <p className="text-info">Improvement: {item.improvement}</p>}
                {item.loss && <p className="text-danger">Lost Marks: {item.loss}</p>}
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default AIAssistedGraderPage;
