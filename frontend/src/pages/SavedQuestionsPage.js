import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Card, Table } from 'react-bootstrap';

function SavedQuestionsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch courses
    fetch('http://localhost:5000/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data.courses))
      .catch(err => console.error('Error fetching courses:', err));
  }, []);

  useEffect(() => {
    // Fetch saved questions whenever selectedCourseId changes
    const fetchSavedQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = selectedCourseId 
          ? `http://localhost:5000/api/get_saved_questions?course_id=${selectedCourseId}`
          : 'http://localhost:5000/api/get_saved_questions';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch saved questions');
        const data = await response.json();
        setSavedQuestions(data.saved_questions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedQuestions();
  }, [selectedCourseId]);

  return (
    <Container>
      <h2>Saved Questions and Answers</h2>
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Filter by Course</Form.Label>
            <Form.Select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.code}: {course.name || 'Unnamed Course'}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {loading && <p>Loading saved questions...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && savedQuestions.length === 0 && (
        <p>No saved questions found.</p>
      )}

      {!loading && savedQuestions.length > 0 && (
        <Card className="mt-4">
          <Card.Header>Questions</Card.Header>
          <Card.Body>
            <Table striped bordered hover variant="dark">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Question Type</th>
                  <th>Question</th>
                  <th>Correct Answer</th>
                  <th>Working</th>
                  <th>Your Answers</th>
                </tr>
              </thead>
              <tbody>
                {savedQuestions.map((q, index) => (
                  <tr key={index}>
                    <td>{q.course_code} - {q.course_name}</td>
                    <td>{q.question_type}</td>
                    <td>{q.question_text}</td>
                    <td>
                      {q.correct_answer}
                      {q.choices && (
                        <ul>
                          {q.choices.map((choice, i) => (
                            <li key={i}>{choice}</li>
                          ))}
                        </ul>
                      )}
                      {q.numerical_answer !== null && (
                        <p>Numerical: {q.numerical_answer} (Tolerance: {q.tolerance})</p>
                      )}
                    </td>
                    <td>{q.working}</td>
                    <td>
                      {q.user_answers.length > 0 ? (
                        <ul>
                          {q.user_answers.map((ua, uaIndex) => (
                            <li key={uaIndex}>
                              {ua.user_input} ({ua.is_correct ? 'Correct' : 'Incorrect'})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'N/A'
                      )}
                    </td>
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

export default SavedQuestionsPage;