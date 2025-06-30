from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import fitz  # PyMuPDF
import re
from datetime import datetime, UTC
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os
from openai import OpenAI  # Updated import

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://augmented_user:password123@localhost:5432/augmented_db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Configure OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
print("API Key loaded:", "Set" if client.api_key else "Not Set")  # Debug print

# --- DATABASE MODELS ---
class Course(db.Model):
    __tablename__ = 'course'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=True)
    name = db.Column(db.String(100), nullable=True)
    grade = db.Column(db.Integer, nullable=True)
    year = db.Column(db.Integer, nullable=True)
    semester = db.Column(db.String(20), nullable=True)
    assessments = db.relationship('Assessment', backref='course', lazy=True)

    def to_dict(self):
        return {"id": self.id, "code": self.code, "name": self.name, "grade": self.grade, "year": self.year, "semester": self.semester}

class Assessment(db.Model):
    __tablename__ = 'assessment'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Numeric(5, 2), nullable=False)
    score = db.Column(db.Numeric(5, 2), nullable=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "weight": float(self.weight) if self.weight is not None else None,
            "score": float(self.score) if self.score is not None else None,
            "course_id": self.course_id
        }

class StudySession(db.Model):
    __tablename__ = 'study_session'
    id = db.Column(db.Integer, primary_key=True)
    duration_minutes = db.Column(db.Integer, nullable=False)
    break_duration = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    date_logged = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    course = db.relationship('Course', backref=db.backref('study_sessions', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "duration_minutes": self.duration_minutes,
            "break_duration": self.break_duration,
            "description": self.description,
            "date_logged": self.date_logged.isoformat(),
            "course_code": self.course.code
        }

# --- API ROUTES ---
@app.route("/api/courses")
def get_courses():
    all_courses = Course.query.order_by(Course.year.desc(), Course.semester.desc(), Course.code).all()
    def to_dict(c): return {"id": c.id, "code": c.code, "name": c.name, "grade": c.grade, "year": c.year, "semester": c.semester}
    return jsonify(courses=[to_dict(c) for c in all_courses])

@app.route("/api/course/<int:course_id>")
def get_course_details(course_id):
    course = Course.query.get(course_id)
    if not course: return jsonify({"message": "Course not found"}), 404
    return jsonify(course.to_dict())

@app.route("/api/course/<int:course_id>/assessments", methods=['GET'])
def get_course_assessments(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    assessments = Assessment.query.filter_by(course_id=course_id).all()
    return jsonify(assessments=[a.to_dict() for a in assessments])

@app.route("/api/course/<int:course_id>/assessments", methods=['POST'])
def add_assessment(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    data = request.get_json()
    if not data or 'name' not in data or 'weight' not in data:
        return jsonify({"message": "Missing name or weight"}), 400
    try:
        new_assessment = Assessment(
            name=data['name'],
            weight=float(data['weight']),
            score=data.get('score') if data.get('score') is not None else None,
            course_id=course_id
        )
        db.session.add(new_assessment)
        db.session.commit()
        return jsonify(new_assessment.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"message": f"Invalid data: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error adding assessment: {str(e)}")
        return jsonify({"message": f"Server error: {str(e)}"}), 500

@app.route("/api/assessment/<int:assessment_id>", methods=['PATCH'])
def update_assessment(assessment_id):
    assessment = Assessment.query.get(assessment_id)
    if not assessment:
        return jsonify({"message": "Assessment not found"}), 404
    data = request.get_json()
    if 'name' in data: assessment.name = data['name']
    if 'weight' in data: assessment.weight = float(data['weight'])
    if 'score' in data: assessment.score = float(data['score']) if data['score'] is not None else None
    db.session.commit()
    return jsonify(assessment.to_dict())

@app.route("/api/assessment/<int:assessment_id>", methods=['DELETE'])
def delete_assessment(assessment_id):
    assessment = Assessment.query.get(assessment_id)
    if not assessment:
        return jsonify({"message": "Assessment not found"}), 404
    db.session.delete(assessment)
    db.session.commit()
    return jsonify({"message": "Assessment deleted"})

@app.route("/api/add_course", methods=['POST'])
def add_course():
    data = request.get_json()
    if not data or not all(k in data for k in ['code', 'year', 'semester']):
        return jsonify({"message": "Missing required fields (code, year, semester)"}), 400
    try:
        new_course = Course(
            code=data.get('code', ''),
            name=data.get('name', ''),
            grade=data.get('grade') if data.get('grade') is not None else None,
            year=int(data.get('year')),
            semester=data.get('semester')
        )
        db.session.add(new_course)
        db.session.commit()
        return jsonify({"message": "Course added", "id": new_course.id}), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"message": f"Invalid data: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error adding course: {str(e)}")
        return jsonify({"message": f"Server error: {str(e)}"}), 500

@app.route("/api/update_course/<int:course_id>", methods=['PATCH'])
def update_course(course_id):
    course = Course.query.get(course_id)
    if not course: return jsonify({"message": "Not Found"}), 404
    data = request.get_json()
    if 'code' in data: course.code = data['code']
    if 'name' in data: course.name = data['name']
    if 'grade' in data: course.grade = data.get('grade')
    if 'year' in data: course.year = int(data['year'])
    if 'semester' in data: course.semester = data['semester']
    db.session.commit()
    return jsonify(course.to_dict())

@app.route("/api/delete_course/<int:course_id>", methods=['DELETE'])
def delete_course(course_id):
    course = Course.query.get(course_id)
    if not course: return jsonify({"message": "Not Found"}), 404
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Deleted"})

@app.route('/api/upload_transcript', methods=['POST'])
def upload_transcript():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"message": "Invalid file type. Please upload a PDF"}), 400

    try:
        pdf_document = fitz.open(stream=file.read(), filetype="pdf")
        full_text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            text = page.get_text()
            full_text += text
            print(f"Page {page_num + 1} text: {text}")

        lines = [line.strip() for line in full_text.split('\n') if line.strip()]
        print(f"Processed lines: {lines}")

        semesters = []
        units = []
        grades = []
        current_semester = None

        semester_regex = re.compile(r"Semester (\d|Summer), (\d{4})")
        unit_code_regex = re.compile(r"^[A-Z]{3}\d{3}\.\d$")
        grade_regex = re.compile(r"^(\d+)$")

        i = 0
        while i < len(lines):
            line = lines[i]
            semester_match = semester_regex.match(line)
            if semester_match:
                current_semester = f"{semester_match.group(1)}, {semester_match.group(2)}"
                semesters.append(current_semester)
                print(f"Detected semester: {current_semester}")
                i += 1
                continue

            unit_match = unit_code_regex.match(line)
            if unit_match:
                units.append((current_semester, line))
                print(f"Detected unit: {line} in {current_semester}")
                i += 1
                if i < len(lines):
                    next_line = lines[i].strip()
                    grade_match = grade_regex.match(next_line)
                    if grade_match:
                        grades.append(int(grade_match.group(1)))
                        print(f"Detected grade: {grade_match.group(1)} for unit {line}")
                    elif "Enrolled" in next_line or "-" in next_line:
                        grades.append(None)
                        print(f"No grade (Enrolled) for unit {line}")
                    else:
                        grades.append(None)
                i += 1
                continue
            i += 1

        valid_units = [u for u in units if grades[units.index(u)] is not None]
        grades = [g for g in grades if g is not None]

        print(f"Units: {valid_units}")
        print(f"Grades: {grades}")

        if len(valid_units) != len(grades):
            return jsonify({"message": f"Mismatch: {len(valid_units)} units but {len(grades)} grades found"}), 400

        db.session.query(Course).delete()
        db.session.commit()

        for (semester, code), grade in zip(valid_units, grades):
            semester_num, year = semester.split(", ")
            course = Course(
                code=code,
                name="TBD",
                grade=grade,
                year=int(year),
                semester=f"Semester {semester_num}"
            )
            db.session.add(course)
            print(f"Added course: {course.to_dict()}")

        db.session.commit()
        return jsonify({"message": "Transcript uploaded and courses updated successfully"}), 200

    except fitz.fitz.FileDataError:
        return jsonify({"message": "Invalid or corrupted PDF file"}), 400
    except Exception as e:
        print(f"Exception details: {str(e)}")
        return jsonify({"message": f"Error processing PDF: {str(e)}"}), 500

@app.route("/api/course/<int:course_id>/study_sessions", methods=['POST'])
def add_study_session(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    data = request.get_json()
    if not data or 'duration_minutes' not in data:
        return jsonify({"message": "Missing duration_minutes"}), 400
    new_study_session = StudySession(
        duration_minutes=data['duration_minutes'],
        break_duration=data.get('break_duration', 0),
        description=data.get('description'),
        course_id=course_id
    )
    db.session.add(new_study_session)
    db.session.commit()
    return jsonify({"message": "Study session added", "id": new_study_session.id}), 201

@app.route("/api/sessions", methods=['GET'])
def get_sessions():
    all_sessions = StudySession.query.all()
    return jsonify(sessions=[{
        "id": s.id,
        "duration_minutes": s.duration_minutes,
        "break_duration": s.break_duration,
        "description": s.description,
        "date_logged": s.date_logged.isoformat(),
        "course_code": s.course.code
    } for s in all_sessions])

@app.route("/api/session/<int:session_id>", methods=['PATCH'])
def update_study_session(session_id):
    session = StudySession.query.get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404
    data = request.get_json()
    if 'duration_minutes' in data:
        session.duration_minutes = data['duration_minutes']
    if 'break_duration' in data:
        session.break_duration = data['break_duration']
    if 'description' in data:
        session.description = data['description']
    db.session.commit()
    return jsonify(session.to_dict())

@app.route("/api/session/<int:session_id>", methods=['DELETE'])
def delete_study_session(session_id):
    session = StudySession.query.get(session_id)
    if not session:
        return jsonify({"message": "Session not found"}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({"message": "Session deleted"}), 200

@app.route("/api/gpa_summary", methods=['GET'])
def get_gpa_summary():
    # Group by code and take the highest grade for each course
    from sqlalchemy import func
    subquery = db.session.query(
        Course.code,
        func.max(Course.grade).label('max_grade')
    ).group_by(Course.code).subquery()
    
    # Count completed courses (max grade >= 4)
    completed_courses = db.session.query(Course).join(
        subquery, (Course.code == subquery.c.code) & (Course.grade == subquery.c.max_grade)
    ).filter(Course.grade >= 4, Course.grade.isnot(None)).distinct(Course.code).count()

    # Calculate GPA including all grades (1-7)
    all_grades = [c.grade for c in Course.query.filter(Course.grade.isnot(None)).all()]
    gpa = sum(all_grades) / len(all_grades) if all_grades else 0.0

    return jsonify({
        "completed_courses": completed_courses,
        "total_courses": 32,  # Hardcode to match TOTAL_UNITS_FOR_DEGREE
        "gpa": round(gpa, 2)
    })

@app.route("/api/debug_db")
def debug_db():
    with app.app_context():
        return jsonify({"db_name": db.engine.url.database, "full_uri": str(db.engine.url)})

@app.route("/api/test_ai", methods=['GET'])
def test_ai():
    try:
        response = openai.Completion.create(
            model="text-davinci-003",
            prompt="Generate a sample question about machine learning.",
            max_tokens=50
        )
        return jsonify({"response": response.choices[0].text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/generate_practice", methods=['POST'])
def generate_practice():
    data = request.get_json()
    if not data or 'course_id' not in data or 'type' not in data:
        return jsonify({"message": "Missing course_id or type"}), 400
    
    course = Course.query.get(data['course_id'])
    if not course:
        return jsonify({"message": "Course not found"}), 404
    
    # Use course details and optional content
    content = data.get('content', f"Based on the course: {course.code} - {course.name or 'Unnamed Course'}")
    num_items = data.get('num_items', 5)  # Default to 5 items
    
    try:
        response = client.chat.completions.create(  # Use client instance
            model="gpt-3.5-turbo",  # Updated to chat model
            messages=[
                {"role": "system", "content": "You are an advanced educational AI assistant for the augmentED platform, designed to help students learn efficiently. Your role is to generate accurate, concise, and relevant educational content based on provided course materials. Always return responses in valid JSON format, using clear field names (e.g., 'question', 'answer' for exams, 'front', 'back' for flashcards). If the output is not JSON-compatible, include an 'error' field with a description. Prioritize content relevance to the given course and end all responses with '###'."},
                {"role": "user", "content": f"{content}. Generate {num_items} {data['type']} items. Return the response as a valid JSON array of objects, where each object has 'question' and 'answer' fields for exams, or 'front' and 'back' fields for flashcards. Example: [{{\"question\": \"What is ML?\", \"answer\": \"Machine Learning\"}}]."}
            ],
            max_tokens=300,
            temperature=0.7
        )
        result = response.choices[0].message.content.strip()  # Access content from response
        try:
            items = json.loads(result) if result.startswith('[') else [{"error": "Invalid AI response format"}]
        except json.JSONDecodeError:
            items = [{"error": "Failed to parse AI-generated JSON"}]
        return jsonify({
            "type": data['type'],
            "items": items
        })
    except Exception as e:
        return jsonify({"message": f"AI error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)