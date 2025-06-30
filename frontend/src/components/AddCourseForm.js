// frontend/src/components/AddCourseForm.js
import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

function AddCourseForm({ onCourseAdded }) {
  // --- UPDATED: State for all five fields ---
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [year, setYear] = useState(new Date().getFullYear()); // Default to current year
  const [semester, setSemester] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // --- UPDATED: Send all five fields in the data object ---
    const courseData = { 
      code, 
      name, 
      grade: grade ? parseInt(grade) : null, 
      year: parseInt(year), 
      semester: `Semester ${semester}` 
    };

    try {
      const response = await fetch('/api/add_course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        // Clear all form fields
        setCode('');
        setName('');
        setGrade('');
        setYear(new Date().getFullYear());
        setSemester('');
        onCourseAdded();
      } else {
        console.error('Failed to submit course');
      }
    } catch (error) {
      console.error('Error submitting course:', error);
    }
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h3>Add New Course</h3>
      <Form onSubmit={handleSubmit}>
        <Row className="align-items-end g-2">
          {/* --- UPDATED: New 5-column layout for the form --- */}
          <Col xs={12} md={3}>
            <Form.Group>
              <Form.Label>Unit Code</Form.Label>
              <Form.Control type="text" placeholder="e.g., CAB420" value={code} onChange={(e) => setCode(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={12} md={4}>
            <Form.Group>
              <Form.Label>Unit Name</Form.Label>
              <Form.Control type="text" placeholder="e.g., Machine Learning" value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={4} md={1}>
            <Form.Group>
              <Form.Label>Year</Form.Label>
              <Form.Control type="number" placeholder="2024" value={year} onChange={(e) => setYear(e.target.value)} required />
            </Form.Group>
          </Col>
          <Col xs={4} md={2}>
            <Form.Group>
              <Form.Label>Semester</Form.Label>
              <Form.Control as="select" value={semester} onChange={(e) => setSemester(e.target.value)} required>
                <option value="">Select...</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="Summer">Summer</option>
              </Form.Control>
            </Form.Group>
          </Col>
          <Col xs={4} md={1}>
            <Form.Group>
              <Form.Label>Grade</Form.Label>
              <Form.Control 
                type="number" 
                placeholder="7" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                min="1" 
                max="7" 
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={1}>
            <Button variant="primary" type="submit" className="w-100">Add</Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default AddCourseForm;
