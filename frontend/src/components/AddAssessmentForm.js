// frontend/src/components/AddAssessmentForm.js
import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

// It receives the courseId and a function to refresh the data as props
function AddAssessmentForm({ courseId, onAssessmentAdded }) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [score, setScore] = useState(''); // Score is optional

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare the data, only include score if it's entered
    const assessmentData = {
      name,
      weight: parseFloat(weight),
      ...(score && { score: parseFloat(score) })
    };

    try {
      const response = await fetch(`/api/course/${courseId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData),
      });

      if (response.ok) {
        // Clear the form and refresh the assessment list
        setName('');
        setWeight('');
        setScore('');
        onAssessmentAdded();
      } else {
        console.error('Failed to add assessment');
        alert('Failed to add assessment. Please check the values.');
      }
    } catch (error) {
      console.error('Error adding assessment:', error);
    }
  };

  return (
    <div className="mt-5">
      <h4>Add New Assessment</h4>
      <Form onSubmit={handleSubmit}>
        <Row className="align-items-end g-2">
          <Col sm={5}>
            <Form.Group>
              <Form.Label>Assessment Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., Exam"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </Form.Group>
          </Col>
          <Col sm={3}>
            <Form.Group>
              <Form.Label>Weight (%)</Form.Label>
              <Form.Control 
                type="number"
                step="0.01" // Allows for decimals
                placeholder="e.g., 40.00"
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                required 
              />
            </Form.Group>
          </Col>
          <Col sm={2}>
            <Form.Group>
              <Form.Label>Score (%)</Form.Label>
              <Form.Control 
                type="number" 
                step="0.01"
                placeholder="(Optional)"
                value={score} 
                onChange={(e) => setScore(e.target.value)} 
              />
            </Form.Group>
          </Col>
          <Col sm={2}>
            <Button variant="primary" type="submit" className="w-100">
              Add
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default AddAssessmentForm;
