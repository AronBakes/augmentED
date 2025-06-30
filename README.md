# augmentED

## Overview
augmentED is an innovative web application designed to help students manage their academic progress and enhance their learning efficiency. Built with a Flask backend and a React frontend, it offers features such as course tracking, GPA calculation, study session logging, and AI-powered practice exam and flashcard generation. The project leverages modern technologies to provide a personalized learning experience, with plans to include advanced AI tools like automated grading and note organization.

**Note**: This project is still a work in progress. Features are being actively developed, and some functionalities may be incomplete or subject to change. Contributions and feedback are welcome!

## Features
- **Course Management**: Add, update, and delete courses with grades and semesters.
- **GPA Tracking**: Calculate and forecast GPA based on completed and remaining courses.
- **Study Session Logging**: Track study time and sessions per course.
- **Practice Generation**: Use AI to generate custom exam questions and flashcards based on course content.
- **Assessment Breakdown**: View and manage assessments for each course.
- **Analytics**: (In development) Visualize study and performance trends.

## Prerequisites
- **Python 3.12+**
- **Node.js and npm**
- **PostgreSQL** (with a database named `augmented_db`)
- **OpenAI API Key** (for AI features)

## Installation

### Backend (Flask)
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/AronBakes/augmentED.git
   cd augmentED/backend