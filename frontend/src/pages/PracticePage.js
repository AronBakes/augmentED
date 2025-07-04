import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Table, Alert } from 'react-bootstrap';

function PracticePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [practiceType, setPracticeType] = useState('exam');
  const [questionType, setQuestionType] = useState('free_text'); // New state for question type
  const [numItems, setNumItems] = useState(5);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // New loading state

  useEffect(() => {
    fetch('http://localhost:5000/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data.courses))
      .catch(err => console.error('Error fetching courses:', err));
  }, []);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    if (uploadedFile) {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      try {
        const response = await fetch('http://localhost:5000/api/extract_text_from_pdf', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to extract text from PDF');
        const data = await response.json();
        setContent(data.text);
      } catch (err) {
        setError(err.message);
        setContent('');
      }
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setItems([]);
    setLoading(true); // Set loading to true
    try {
      const response = await fetch('http://localhost:5000/api/generate_practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: selectedCourseId, type: practiceType, num_items: numItems, content, question_type: questionType }),
      });
      if (!response.ok) throw new Error('Failed to generate practice');
      const data = await response.json();
      if (data.items[0].error) setError(data.items[0].error);
      else setItems(data.items.map(item => ({ ...item, userAnswer: '', showAnswer: false, isCorrect: null, feedback: '' })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Set loading to false regardless of success or failure
    }
  };

  const handleAnswerChange = (index, value) => {
    const newItems = [...items];
    newItems[index].userAnswer = value;
    setItems(newItems);
  };

  const handleCheckAnswer = (index) => {
    const newItems = [...items];
    const item = newItems[index];
    let correct = false;
    let feedback = '';

    if (practiceType === 'exam') {
      if (questionType === 'free_text') {
        correct = item.userAnswer.toLowerCase().trim() === item.answer.toLowerCase().trim();
        feedback = correct ? 'Correct!' : 'Incorrect.';
      } else if (questionType === 'multiple_choice') {
        correct = item.userAnswer === item.answer;
        feedback = correct ? 'Correct!' : 'Incorrect.';
      } else if (questionType === 'numerical') {
        const userAnswerNum = parseFloat(item.userAnswer);
        const numericalAnswerNum = parseFloat(item.numerical_answer);
        const tolerance = parseFloat(item.tolerance || 0);
        correct = !isNaN(userAnswerNum) && Math.abs(userAnswerNum - numericalAnswerNum) <= tolerance;
        feedback = correct ? 'Correct!' : 'Incorrect.';
      }
    } else if (practiceType === 'flashcard') {
      // For flashcards, we just show the back, no "correct" check
      correct = true; // Always true for flashcards as it's just revealing
      feedback = 'Answer revealed.';
    }

    item.isCorrect = correct;
    item.feedback = feedback;
    item.showAnswer = true; // Always show answer after checking
    setItems(newItems);

    // Save user answer to backend
    if (item.id) { // Only save if question has been saved to DB
      fetch('http://localhost:5000/api/save_user_answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: item. id,
          user_input: item.userAnswer,
          is_correct: correct,
        }),
      })
      .then(response => response.json())
      .then(data => console.log('User answer saved:', data))
      .catch(err => console.error('Error saving user answer:', err));
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
              <Form.Label>Question Type</Form.Label>
              <Form.Select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                <option value="free_text">Free Text</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="numerical">Numerical</option>
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
              <Form.Label>Upload PDF for Content</Form.Label>
              <Form.Control type="file" accept=".pdf" onChange={handleFileUpload} />
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
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </Form>
      {loading && <p>Loading...</p>}
      {error && <Alert variant="danger" className="mt-3">Error: {error}</Alert>}
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
                    <td>
                      {practiceType === 'exam' ? (
                        <>
                          {questionType === 'free_text' && (
                            <Form.Control
                              type="text"
                              value={item.userAnswer}
                              onChange={(e) => handleAnswerChange(index, e.target.value)}
                              isInvalid={item.isCorrect === false}
                              isValid={item.isCorrect === true}
                            />
                          )}
                          {questionType === 'multiple_choice' && (
                            <div className="mt-2">
                              {item.choices && item.choices.map((choice, choiceIndex) => (
                                <Form.Check
                                  key={choiceIndex}
                                  type="radio"
                                  id={`choice-${index}-${choiceIndex}`}
                                  label={choice}
                                  name={`question-${index}`}
                                  value={choice}
                                  checked={item.userAnswer === choice}
                                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                                  isInvalid={item.isCorrect === false && item.userAnswer === choice}
                                  isValid={item.isCorrect === true && item.userAnswer === choice}
                                />
                              ))}
                            </div>
                          )}
                          {questionType === 'numerical' && (
                            <Form.Control
                              type="number"
                              value={item.userAnswer}
                              onChange={(e) => handleAnswerChange(index, e.target.value)}
                              isInvalid={item.isCorrect === false}
                              isValid={item.isCorrect === true}
                            />
                          )}
                          <Button
                            variant="primary"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleCheckAnswer(index)}
                            disabled={item.userAnswer.trim() === '' || item.showAnswer} // Disable if no answer or already shown
                          >
                            Check Answer
                          </Button>
                          {item.feedback && (
                            <p className={`mt-2 ${item.isCorrect ? 'text-success' : 'text-danger'}`}>
                              {item.feedback} {item.isCorrect ? '✅' : '❌'}
                            </p>
                          )}
                        </>
                      ) : (
                        // Flashcard
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].showAnswer = !newItems[index].showAnswer;
                            setItems(newItems);
                          }}
                        >
                          {item.showAnswer ? 'Hide Answer' : 'Show Answer'}
                        </Button>
                      )}

                      {item.showAnswer && (
                        <div className="mt-2">
                          <p><strong>Correct Answer:</strong> {item.answer || item.back}</p>
                          {item.working && <p><strong>Working:</strong> {item.working}</p>}
                        </div>
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

export default PracticePage;