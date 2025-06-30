import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Table } from 'react-bootstrap';

function PracticePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [practiceType, setPracticeType] = useState('exam');
  const [numItems, setNumItems] = useState(5);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data.courses))
      .catch(err => console.error('Error fetching courses:', err));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setItems([]);
    try {
      const response = await fetch('http://localhost:5000/api/generate_practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: selectedCourseId, type: practiceType, num_items: numItems, content }),
      });
      if (!response.ok) throw new Error('Failed to generate practice');
      const data = await response.json();
      if (data.items[0].error) setError(data.items[0].error);
      else setItems(data.items);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container>
      <h2>Practice Generator</h2>
      <Form onSubmit={handleGenerate}>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Course</Form.Label>
              <Form.Select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} required>
                <option value="">Select a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.code}: {course.name || 'Unnamed Course'}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={practiceType} onChange={(e) => setPracticeType(e.target.value)}>
                <option value="exam">Exam Questions</option>
                <option value="flashcard">Flashcards</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Number of Items</Form.Label>
              <Form.Control type="number" value={numItems} onChange={(e) => setNumItems(e.target.value)} min="1" max="10" />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group className="mb-3">
              <Form.Label>Additional Content (e.g., PDF text)</Form.Label>
              <Form.Control as="textarea" rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste extracted text or leave blank" />
            </Form.Group>
          </Col>
        </Row>
        <Button variant="primary" type="submit">Generate</Button>
      </Form>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {items.length > 0 && (
        <Card className="mt-4">
          <Card.Header>{practiceType === 'exam' ? 'Exam Questions' : 'Flashcards'}</Card.Header>
          <Card.Body>
            <Table striped bordered hover variant="dark">
              <thead>
                <tr>
                  <th>{practiceType === 'exam' ? 'Question' : 'Front'}</th>
                  <th>{practiceType === 'exam' ? 'Answer' : 'Back'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.question || item.front}</td>
                    <td>{item.answer || item.back}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default PracticePage;