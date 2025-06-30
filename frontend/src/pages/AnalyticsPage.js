// frontend/src/pages/AnalyticsPage.js
import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import * as ss from 'simple-statistics'; // 1. Import the statistics library

import MonteCarloChart from '../components/MonteCarloChart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
);

// --- Component for the GPA Trend Chart (Now with Trendline) ---
function GpaTrendChart({ courses, trendlineData }) { // Receives trendline data as a prop
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!courses || courses.length === 0) return;
    
    const groupedBySemester = courses.reduce((acc, course) => {
      if (course.year && course.semester) {
        const key = `${course.year} - ${course.semester}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(course.grade);
      }
      return acc;
    }, {});

    const semesterGpas = Object.entries(groupedBySemester).map(([key, grades]) => ({
      semester: key,
      gpa: ss.mean(grades) // Using simple-statistics for clarity
    }));

    const sortedData = semesterGpas.sort((a, b) => a.semester.localeCompare(b.semester));

    setChartData({
      labels: sortedData.map(d => d.semester),
      datasets: [
        {
          type: 'line', // Specify chart type
          label: 'GPA per Semester',
          data: sortedData.map(d => d.gpa),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.1,
        },
        // --- NEW: Dataset for the Trendline ---
        {
          type: 'line',
          label: 'Performance Trend',
          data: trendlineData,
          fill: false,
          borderColor: 'rgba(255, 99, 132, 0.8)',
          borderDash: [5, 5], // Makes the line dashed
          pointRadius: 0, // No dots on the trendline
        }
      ],
    });
  }, [courses, trendlineData]); // Re-render if courses or trendline changes

  return (
    <Card bg="dark" text="white" className="mb-4">
      <Card.Header as="h4">GPA Trend Over Time</Card.Header>
      <Card.Body>
        {chartData ? <Line data={chartData} options={{ scales: { y: { min: 4, max: 7 }, x: { ticks: { color: 'white'}}}, plugins: { legend: { labels: { color: 'white' }}}}} /> : <p>Loading chart data...</p>}
      </Card.Body>
    </Card>
  );
}


function AnalyticsPage() {
  const [courses, setCourses] = useState([]);
  // --- NEW: State for our trendline data points ---
  const [trendlineData, setTrendlineData] = useState([]);
  
  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        const response = await fetch('/api/courses');
        const data = await response.json();
        const validCourses = data.courses.filter(c => c.grade != null && c.year && c.semester);
        setCourses(validCourses);

        // --- Trendline Calculation Logic ---
        const semesterGpas = Object.values(validCourses.reduce((acc, c) => {
            const key = `${c.year}-${c.semester}`;
            if (!acc[key]) acc[key] = { grades: [], key };
            acc[key].grades.push(c.grade);
            return acc;
        }, {})).map(sem => ({ ...sem, gpa: ss.mean(sem.grades) })).sort((a,b) => a.key.localeCompare(b.key));
        
        if (semesterGpas.length > 1) {
            const dataForRegression = semesterGpas.map((d, index) => [index, d.gpa]);
            const { m, b } = ss.linearRegression(dataForRegression);
            const line = ss.linearRegressionLine({ m, b });
            
            // Create a trendline data point for each semester
            setTrendlineData(semesterGpas.map((d, index) => line(index)));
        }

      } catch (error) { console.error("Error fetching data:", error); }
    };
    fetchAndProcessData();
  }, []);

  return (
    <Container>
      <h2 className="mb-4">Your Academic Analytics</h2>
      <Row>
        <Col>
          {/* Pass the calculated trendline data to the chart component */}
          <GpaTrendChart courses={courses} trendlineData={trendlineData} />
        </Col>
      </Row>
      <Row>
        <Col>
          {/* The old Monte Carlo chart is still here for comparison */}
          <MonteCarloChart courses={courses} />
        </Col>
      </Row>
    </Container>
  );
}

export default AnalyticsPage;

