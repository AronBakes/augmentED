import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card } from 'react-bootstrap';
import * as ss from 'simple-statistics'; // Add this import

function MonteCarloChart({ courses }) {
  const [chartData, setChartData] = useState(null);
  const TOTAL_UNITS_FOR_DEGREE = 32;
  const SIMULATION_COUNT = 32000; // Updated to 50,000 as per your tweak

  useEffect(() => {
    if (!courses || courses.length === 0) {
      setChartData(null);
      return;
    }

    const completedUnits = courses.length;
    const remainingUnits = TOTAL_UNITS_FOR_DEGREE - completedUnits;
    const currentGradeSum = courses.reduce((sum, course) => sum + course.grade, 0);

    if (remainingUnits <= 0) {
      setChartData(null); // No forecast if degree is complete
      return;
    }
    
    // --- Grade Probability Calculation (Baseline) ---
    const gradeCounts = courses.reduce((acc, course) => {
      acc[course.grade] = (acc[course.grade] || 0) + 1;
      return acc;
    }, {});

    const gradeProbabilities = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade: parseInt(grade),
      probability: count / completedUnits,
    }));

    let cumulativeProbability = 0;
    const cumulativeDistribution = gradeProbabilities
      .sort((a, b) => a.grade - b.grade)
      .map(item => {
        cumulativeProbability += item.probability;
        return { ...item, cumulative: cumulativeProbability };
      });

    const runSimulation = (optimisticFactor = 0) => {
      const rand = Math.random();
      for (const item of cumulativeDistribution) {
        if (rand <= item.cumulative) {
          const baseGrade = item.grade;
          // Apply optimistic adjustment based on trendline and log
          if (optimisticFactor > 0) {
            const adjustedGrade = Math.min(baseGrade + optimisticFactor, 7.0); // Cap at 7
            return adjustedGrade;
          }
          return baseGrade;
        }
      }
      return cumulativeDistribution[cumulativeDistribution.length - 1].grade;
    };

    // --- Run Baseline and Optimistic Simulations ---
    const simulationResultsBaseline = [];
    const simulationResultsOptimistic = [];
    for (let i = 0; i < SIMULATION_COUNT; i++) {
      let futureGradeSumBaseline = 0;
      let futureGradeSumOptimistic = 0;

      // Calculate trendline improvement
      const semesterGpas = Object.values(courses.reduce((acc, c) => {
        const key = `${c.year}-${c.semester}`;
        if (!acc[key]) acc[key] = { grades: [], key };
        acc[key].grades.push(c.grade);
        return acc;
      }, {})).map(sem => ({ ...sem, gpa: ss.mean(sem.grades) })).sort((a, b) => a.key.localeCompare(b.key));
      const dataForRegression = semesterGpas.map((d, index) => [index, d.gpa]);
      const { m, b } = ss.linearRegression(dataForRegression);
      const trendline = ss.linearRegressionLine({ m, b });

      for (let j = 0; j < remainingUnits; j++) {
        // Baseline uses original distribution
        futureGradeSumBaseline += runSimulation(0);
        // Optimistic uses trendline-based improvement with log adjustment
        const currentSemesterIndex = semesterGpas.length + j;
        const predictedGpa = trendline(currentSemesterIndex);
        const meanHistoricalGpa = ss.mean(semesterGpas.map(s => s.gpa));
        const improvement = Math.log1p(predictedGpa - meanHistoricalGpa) * 0.5; // Logarithmic tempering
        futureGradeSumOptimistic += runSimulation(improvement);
      }

      const finalGpaBaseline = (currentGradeSum + futureGradeSumBaseline) / TOTAL_UNITS_FOR_DEGREE;
      const finalGpaOptimistic = (currentGradeSum + futureGradeSumOptimistic) / TOTAL_UNITS_FOR_DEGREE;
      simulationResultsBaseline.push(finalGpaBaseline);
      simulationResultsOptimistic.push(finalGpaOptimistic);
    }
    
    // --- Dynamic binning with (maxGpa - minGpa) / 11, min 0.02, 13 bins ---
    const minGpaBaseline = Math.min(...simulationResultsBaseline);
    const maxGpaBaseline = Math.max(...simulationResultsBaseline);
    const minGpaOptimistic = Math.min(...simulationResultsOptimistic);
    const maxGpaOptimistic = Math.max(...simulationResultsOptimistic);
    const minGpa = Math.min(minGpaBaseline, minGpaOptimistic);
    const maxGpa = Math.max(maxGpaBaseline, maxGpaOptimistic);
    const BIN_WIDTH = Math.max((maxGpa - minGpa) / 11, 0.02); // Divide by 11 for 13 bins
    const numBins = 13; // Fixed number of bins

    const binsBaseline = new Array(numBins).fill(0);
    const binsOptimistic = new Array(numBins).fill(0);
    const labels = [];
    for (let i = 0; i < numBins; i++) {
      const binStart = minGpa + i * BIN_WIDTH;
      const binEnd = binStart + BIN_WIDTH;
      labels.push(`${binStart.toFixed(2)}-${(binEnd - 0.01).toFixed(2)}`); // e.g., 5.70-5.74
    }

    simulationResultsBaseline.forEach(gpa => {
      const binIndex = Math.floor((gpa - minGpa) / BIN_WIDTH);
      if (binIndex >= 0 && binIndex < numBins) binsBaseline[binIndex]++;
    });

    simulationResultsOptimistic.forEach(gpa => {
      const binIndex = Math.floor((gpa - minGpa) / BIN_WIDTH);
      if (binIndex >= 0 && binIndex < numBins) binsOptimistic[binIndex]++;
    });

    setChartData({
      labels: labels,
      datasets: [
        {
          label: 'Baseline Frequency',
          data: binsBaseline,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Optimistic Frequency',
          data: binsOptimistic,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [courses]);

  if (!chartData) {
    return null;
  }

  return (
    <Card bg="dark" text="white" className="mt-4">
      <Card.Header as="h4">GPA Forecast Distribution (Monte Carlo)</Card.Header>
      <Card.Body>
        {chartData ? (
          <Bar 
            data={chartData} 
            options={{
              plugins: {
                legend: { display: true, labels: { color: 'white' } },
                title: { display: true, text: `Distribution of ${SIMULATION_COUNT} Simulated Final GPAs`, color: 'white' }
              },
              scales: {
                x: { ticks: { maxRotation: 90, minRotation: 70, color: 'white' } },
                y: { title: { display: true, text: 'Frequency', color: 'white' }, ticks: { color: 'white' } }
              }
            }}
          />
        ) : (
          <p>Running simulations...</p>
        )}
      </Card.Body>
    </Card>
  );
}

export default MonteCarloChart;