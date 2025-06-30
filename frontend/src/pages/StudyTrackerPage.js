import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Modal } from 'react-bootstrap';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function LogSessionForm({ courses, onSessionLogged }) {
    const [courseId, setCourseId] = useState('');
    const [description, setDescription] = useState('');
    const [timerActive, setTimerActive] = useState(false);
    const [timerPaused, setTimerPaused] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [pausedTime, setPausedTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval = null;
        if (timerActive && !timerPaused) {
            interval = setInterval(() => {
                setDuration(Date.now() - startTime - pausedTime);
            }, 1000);
        } else if (!timerActive || timerPaused) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timerActive, timerPaused, startTime, pausedTime]);

    const handleStart = () => {
        if (!courseId) {
            alert('Please select a course first.');
            return;
        }
        setTimerActive(true);
        setStartTime(Date.now());
        setPausedTime(0);
    };

    const handlePause = () => {
        if (timerActive && !timerPaused) {
            setTimerPaused(true);
            setPausedTime(pausedTime + (Date.now() - startTime));
        }
    };

    const handleStop = async () => {
        if (timerActive) {
            setTimerActive(false);
            setTimerPaused(false);
            const totalDuration = Math.floor((Date.now() - startTime - pausedTime) / 1000 / 60);
            const breakDuration = Math.floor(pausedTime / 1000 / 60);
            setDuration(0);

            const course = courses.find(c => c.id === parseInt(courseId));
            if (!course) return alert('Invalid course selected.');

            const studySessionData = {
                course_id: parseInt(courseId),
                duration_minutes: totalDuration,
                break_duration: breakDuration,
                description,
            };

            try {
                const response = await fetch(`http://localhost:5000/api/course/${courseId}/study_sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studySessionData),
                });
                if (response.ok) {
                    setCourseId('');
                    setDescription('');
                    onSessionLogged();
                    alert('Study session logged successfully!');
                } else {
                    const error = await response.json();
                    alert(`Failed to log session: ${error.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error adding study session:', error);
                alert('Failed to log session due to a network error.');
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    console.log('Courses in LogSessionForm:', courses);

    return (
        <Card bg="dark" text="white">
            <Card.Header as="h4">Log New Study Session</Card.Header>
            <Card.Body>
                <Form>
                    <Row>
                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>Course</Form.Label>
                                <Form.Select
                                    value={courseId}
                                    onChange={(e) => setCourseId(e.target.value)}
                                    required
                                    disabled={timerActive}
                                >
                                    <option value="">Select a course...</option>
                                    {courses.length > 0 ? (
                                        courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.code}: {course.name || 'Unnamed Course'}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>No courses available</option>
                                    )}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Description (what did you study?)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="e.g., Worked on Assignment 1, reviewed lecture notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={timerActive}
                        />
                    </Form.Group>
                    <div className="mb-3">
                        <h5>Timer: {formatTime(Math.floor(duration / 1000))}</h5>
                        <Button
                            variant="success"
                            onClick={handleStart}
                            disabled={timerActive}
                            className="me-2"
                        >
                            Start
                        </Button>
                        <Button
                            variant="warning"
                            onClick={handlePause}
                            disabled={!timerActive || timerPaused}
                            className="me-2"
                        >
                            Pause
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleStop}
                            disabled={!timerActive}
                        >
                            Stop
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
}

function StudyTimeChart({ sessions }) {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        if (!sessions || sessions.length === 0) return;

        const timePerCourse = sessions.reduce((acc, session) => {
            const code = session.course_code || "Uncategorized";
            const netTime = session.duration_minutes - (session.break_duration || 0);
            acc[code] = (acc[code] || 0) + netTime;
            return acc;
        }, {});

        const labels = Object.keys(timePerCourse);
        const data = Object.values(timePerCourse);

        setChartData({
            labels: labels,
            datasets: [{
                label: 'Net Study Time (minutes)',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                ],
                borderWidth: 1,
            }]
        });
    }, [sessions]);

    if (!chartData) {
        return <p className="text-center mt-4">Log some study sessions to see your distribution!</p>;
    }

    return (
        <Card bg="dark" text="white" className="mt-4">
            <Card.Header as="h4">Study Time Distribution</Card.Header>
            <Card.Body>
                <Pie 
                    data={chartData} 
                    options={{
                        plugins: {
                            legend: {
                                labels: {
                                    color: 'white'
                                }
                            }
                        }
                    }}
                />
            </Card.Body>
        </Card>
    );
}

function StudyTrackerPage() {
    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [editSession, setEditSession] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [assessments, setAssessments] = useState([]);

    const fetchData = async () => {
        try {
            const coursesRes = await fetch('http://localhost:5000/api/courses');
            console.log('Courses fetch status:', coursesRes.status);
            if (!coursesRes.ok) throw new Error(`Failed to fetch courses: ${coursesRes.status}`);
            const coursesData = await coursesRes.json();
            console.log('Fetched courses response:', JSON.stringify(coursesData, null, 2));
            const parsedCourses = coursesData.courses || (Array.isArray(coursesData) ? coursesData : []);
            console.log('Parsed courses:', parsedCourses);
            if (parsedCourses.length === 0) console.warn('No courses fetched');
            setCourses(parsedCourses);

            const sessionsRes = await fetch('http://localhost:5000/api/sessions');
            console.log('Sessions fetch status:', sessionsRes.status);
            if (!sessionsRes.ok) {
                console.warn(`Sessions fetch failed: ${sessionsRes.status}, ${await sessionsRes.text()}`);
                setSessions([]);
            } else {
                const sessionsData = await sessionsRes.json();
                console.log('Fetched sessions response:', JSON.stringify(sessionsData, null, 2));
                const parsedSessions = sessionsData.sessions || [];
                console.log('Parsed sessions:', parsedSessions);
                if (parsedSessions.length === 0) console.warn('No sessions fetched');
                setSessions(parsedSessions);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setCourses([]);
            setSessions([]);
        }
    };

    const fetchAssessments = async (courseId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/course/${courseId}/assessments`);
            console.log('Assessments fetch status:', response.status);
            if (!response.ok) throw new Error(`Failed to fetch assessments: ${response.status}`);
            const data = await response.json();
            console.log('Fetched assessments response:', JSON.stringify(data, null, 2));
            const parsedAssessments = data.assessments || [];
            console.log('Parsed assessments:', parsedAssessments);
            setAssessments(parsedAssessments);
        } catch (error) {
            console.error('Error fetching assessments:', error);
            setAssessments([]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCourseClick = (courseId) => {
        setSelectedCourseId(courseId);
        fetchAssessments(courseId);
    };

    const handleEdit = (session) => {
        setEditSession(session);
    };

    const handleSaveEdit = async () => {
        if (!editSession) return;
        try {
            const response = await fetch(`http://localhost:5000/api/session/${editSession.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration_minutes: editSession.duration_minutes,
                    break_duration: editSession.break_duration,
                    description: editSession.description,
                }),
            });
            if (response.ok) {
                setEditSession(null);
                fetchData();
                alert('Session updated!');
            } else {
                alert('Failed to update session.');
            }
        } catch (error) {
            console.error('Error updating session:', error);
            alert('Error updating session.');
        }
    };

    const handleDelete = async (sessionId) => {
        if (window.confirm('Are you sure you want to delete this session?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/session/${sessionId}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    fetchData();
                    alert('Session deleted!');
                } else {
                    alert('Failed to delete session.');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('Error deleting session.');
            }
        }
    };

    return (
        <Container>
            <Row>
                <Col md={5}>
                    <LogSessionForm courses={courses} onSessionLogged={fetchData} />
                    <StudyTimeChart sessions={sessions} />
                    {selectedCourseId && (
                        <Card bg="dark" text="white" className="mt-4">
                            <Card.Header as="h4">Course Breakdown for {courses.find(c => c.id === selectedCourseId)?.code}</Card.Header>
                            <Card.Body>
                                <Table striped bordered hover variant="dark" responsive>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Weight</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assessments.length > 0 ? (
                                            assessments.map(assessment => (
                                                <tr key={assessment.id}>
                                                    <td>{assessment.name}</td>
                                                    <td>{assessment.weight}%</td>
                                                    <td>{assessment.score !== null ? `${assessment.score}%` : 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center">No assessments available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
                <Col md={7}>
                    <h4>Study Log</h4>
                    <Table striped bordered hover variant="dark" responsive>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Course</th>
                                <th>Duration</th>
                                <th>Break Duration</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(session => (
                                <tr key={session.id}>
                                    <td>{new Date(session.date_logged).toLocaleDateString()}</td>
                                    <td>{session.course_code}</td>
                                    <td>{session.duration_minutes} min</td>
                                    <td>{session.break_duration || 0} min</td>
                                    <td>{session.description}</td>
                                    <td>
                                        <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={() => handleEdit(session)}
                                            className="me-2"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDelete(session.id)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center">No study sessions logged yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                    <Modal show={!!editSession} onHide={() => setEditSession(null)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Edit Study Session</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Duration (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={editSession?.duration_minutes || 0}
                                        onChange={(e) => setEditSession({ ...editSession, duration_minutes: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Break Duration (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={editSession?.break_duration || 0}
                                        onChange={(e) => setEditSession({ ...editSession, break_duration: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={editSession?.description || ''}
                                        onChange={(e) => setEditSession({ ...editSession, description: e.target.value })}
                                    />
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setEditSession(null)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSaveEdit}>
                                Save Changes
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
}

export default StudyTrackerPage;