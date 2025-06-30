// frontend/src/components/GpaTracker.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function GpaTracker({ courses, refreshCourses }) {
  const [semesterGpa, setSemesterGpa] = useState("N/A");
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editFormData, setEditFormData] = useState({ code: '', name: '', grade: '' });

  useEffect(() => {
    // --- UPDATED: Filters out courses without a grade before calculating ---
    const gradedCourses = courses.filter(c => c.grade != null);
    if (gradedCourses.length === 0) { 
      setSemesterGpa("N/A"); 
      return; 
    }
    const totalGrade = gradedCourses.reduce((sum, c) => sum + c.grade, 0);
    setSemesterGpa((totalGrade / gradedCourses.length).toFixed(3));
  }, [courses]);

  const handleDelete = async (courseId) => {
    const response = await fetch(`/api/delete_course/${courseId}`, { method: 'DELETE' });
    if (response.ok) refreshCourses();
  };

  const handleEditClick = (course) => {
    setEditingCourseId(course.id);
    setEditFormData({ code: course.code, name: course.name, grade: course.grade || '' });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({...prev, [name]: value}));
  };

  const handleSaveClick = async (courseId) => {
    const dataToSave = {
      ...editFormData,
      grade: editFormData.grade ? parseInt(editFormData.grade) : null,
    };
    const response = await fetch(`/api/update_course/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave),
    });
    if (response.ok) {
      setEditingCourseId(null);
      refreshCourses();
    }
  };

  const handleCancelClick = () => {
    setEditingCourseId(null);
  };

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <strong>Semester GPA: {semesterGpa}</strong>
      </div>
      <Table striped bordered hover variant="dark" responsive size="sm">
        <thead>
          <tr>
            <th>Unit Code</th>
            <th>Unit Name</th>
            <th>Grade</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(courses) && courses.map(course => (
            <tr key={course.id}>
              <td>
                {editingCourseId === course.id ? (
                  <Form.Control type="text" name="code" value={editFormData.code} onChange={handleEditFormChange} />
                ) : (
                  <Link to={`/course/${course.id}`} style={{ color: 'white', textDecoration: 'underline' }}>{course.code}</Link>
                )}
              </td>
              <td>
                {editingCourseId === course.id ? (
                  <Form.Control type="text" name="name" value={editFormData.name} onChange={handleEditFormChange} />
                ) : ( course.name )}
              </td>
              <td>
                {editingCourseId === course.id ? (
                  <Form.Control type="number" name="grade" value={editFormData.grade} onChange={handleEditFormChange} placeholder="N/A" min="1" max="7" />
                ) : (
                  course.grade ?? 'N/A' // Display N/A if grade is null
                )}
              </td>
              <td>
                {editingCourseId === course.id ? (
                  <>
                    <Button variant="success" size="sm" onClick={() => handleSaveClick(course.id)}>Save</Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelClick} className="ms-2">Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" size="sm" onClick={() => handleEditClick(course)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(course.id)} className="ms-2">Delete</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
export default GpaTracker;
