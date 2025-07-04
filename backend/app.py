from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import fitz  # PyMuPDF
import re
from datetime import datetime, UTC
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os
from openai import OpenAI
import json

# Unset proxy environment variables to prevent httpx from picking them up
for var in ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY']:
    if var in os.environ:
        del os.environ[var]

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://augmented_user:password123@localhost:5432/augmented_db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

import httpx

# Configure xAI client
client = OpenAI(
  api_key=os.getenv("XAI_API_KEY"),
  base_url="https://api.x.ai/v1",
  http_client=httpx.Client(trust_env=False)
)
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

class GeneratedQuestion(db.Model):
    __tablename__ = 'generated_question'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    question_type = db.Column(db.String(50), nullable=False) # e.g., free_text, multiple_choice, numerical
    question_text = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)
    working = db.Column(db.Text, nullable=True)
    choices = db.Column(db.JSON, nullable=True) # For multiple choice questions
    numerical_answer = db.Column(db.Numeric(10, 4), nullable=True) # For numerical questions
    tolerance = db.Column(db.Numeric(10, 4), nullable=True) # For numerical questions
    generated_at = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "question_type": self.question_type,
            "question_text": self.question_text,
            "correct_answer": self.correct_answer,
            "working": self.working,
            "choices": self.choices,
            "numerical_answer": float(self.numerical_answer) if self.numerical_answer is not None else None,
            "tolerance": float(self.tolerance) if self.tolerance is not None else None,
            "generated_at": self.generated_at.isoformat()
        }

class UserAnswer(db.Model):
    __tablename__ = 'user_answer'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('generated_question.id'), nullable=False)
    user_input = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=True)
    answered_at = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "user_input": self.user_input,
            "is_correct": self.is_correct,
            "answered_at": self.answered_at.isoformat()
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
    from sqlalchemy import func

    # Get all courses with a grade (attempted units)
    attempted_courses_data = db.session.query(Course).filter(Course.grade.isnot(None)).all()

    print("--- Debugging GPA Calculation ---")
    print(f"Total courses in DB: {db.session.query(Course).count()}")
    print("Attempted courses data (code, grade):")
    for c in attempted_courses_data:
        print(f"  - {c.code}: {c.grade}")

    # Count passed units (grade >= 4)
    num_passed_units = sum(1 for c in attempted_courses_data if c.grade >= 4)

    # Count all attempted units
    num_attempted_units = len(attempted_courses_data)

    # Total units for the degree (passed units required)
    TOTAL_DEGREE_UNITS = 32 # As per user's input

    # Calculate current GPA based on all attempted units
    total_grade_points_attempted = sum(c.grade for c in attempted_courses_data)
    current_gpa = total_grade_points_attempted / num_attempted_units if num_attempted_units > 0 else 0.0

    # Calculate remaining units (passed units still needed)
    remaining_units = TOTAL_DEGREE_UNITS - num_passed_units
    if remaining_units < 0:
        remaining_units = 0

    # Calculate maximum possible GPA
    # Sum of grades from already passed units (grade >= 4)
    total_grade_points_passed = sum(c.grade for c in attempted_courses_data if c.grade >= 4)

    # Number of units that still need to be passed to reach TOTAL_DEGREE_UNITS
    units_to_pass_for_degree = TOTAL_DEGREE_UNITS - num_passed_units
    if units_to_pass_for_degree < 0:
        units_to_pass_for_degree = 0

    # The total number of units that will contribute to the final GPA is the sum of attempted units
    # plus the number of units still needed to pass to reach the degree requirement.
    # This ensures the denominator for max_possible_gpa is correct.
    total_units_for_max_gpa_calc = num_attempted_units + units_to_pass_for_degree

    max_possible_total_grade_points = total_grade_points_attempted + (units_to_pass_for_degree * 7)
    max_possible_gpa = max_possible_total_grade_points / total_units_for_max_gpa_calc if total_units_for_max_gpa_calc > 0 else 0.0

    return jsonify({
        "current_gpa": round(current_gpa, 2),
        "max_possible_gpa": round(max_possible_gpa, 2),
        "completed_units": num_passed_units, # This is now passed units
        "attempted_units": num_attempted_units, # New field for all units with a grade
        "remaining_units": remaining_units, # Remaining units to pass
        "total_degree_units": TOTAL_DEGREE_UNITS # Total passed units required for degree
    })

@app.route("/api/save_user_answer", methods=['POST'])
def save_user_answer():
    data = request.get_json()
    if not data or 'question_id' not in data or 'user_input' not in data or 'is_correct' not in data:
        return jsonify({"message": "Missing question_id, user_input, or is_correct"}), 400
    
    try:
        new_user_answer = UserAnswer(
            question_id=data['question_id'],
            user_input=data['user_input'],
            is_correct=data['is_correct']
        )
        db.session.add(new_user_answer)
        db.session.commit()
        return jsonify({"message": "User answer saved successfully", "id": new_user_answer.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error saving user answer: {str(e)}"}), 500

@app.route("/api/debug_db")
def debug_db():
    with app.app_context():
        return jsonify({"db_name": db.engine.url.database, "full_uri": str(db.engine.url)})

@app.route("/api/get_saved_questions", methods=['GET'])
def get_saved_questions():
    course_id = request.args.get('course_id')
    
    query = GeneratedQuestion.query
    if course_id:
        query = query.filter_by(course_id=course_id)
    
    questions = query.order_by(GeneratedQuestion.generated_at.desc()).all()
    
    result = []
    for q in questions:
        question_data = q.to_dict()
        user_answers = UserAnswer.query.filter_by(question_id=q.id).order_by(UserAnswer.answered_at.desc()).all()
        question_data['user_answers'] = [ua.to_dict() for ua in user_answers]
        
        # Add course code and name
        course = Course.query.get(q.course_id)
        if course:
            question_data['course_code'] = course.code
            question_data['course_name'] = course.name
        else:
            question_data['course_code'] = 'N/A'
            question_data['course_name'] = 'N/A'
            
        result.append(question_data)
        
    return jsonify(saved_questions=result)

@app.route('/api/extract_text_from_pdf', methods=['POST'])
def extract_text_from_pdf():
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
            full_text += page.get_text()
        return jsonify({"text": full_text}), 200
    except Exception as e:
        return jsonify({"message": f"Error processing PDF: {str(e)}"}), 500

@app.route("/api/generate_practice", methods=['POST'])
def generate_practice():
    data = request.get_json()
    if not data or 'course_id' not in data or 'type' not in data or 'question_type' not in data:
        return jsonify({"message": "Missing course_id, type, or question_type"}), 400
    
    question_type = data['question_type']
    
    course = Course.query.get(data['course_id'])
    if not course:
        return jsonify({"message": "Course not found"}), 404
    
    # Use course details and optional content
    content = data.get('content', f"Based on the course: {course.code} - {course.name or 'Unnamed Course'}")
    num_items = data.get('num_items', 5)  # Default to 5 items
    
    try:
        response = client.chat.completions.create(
            model="grok-3",
            messages=[
                {"role": "system", "content": "You are an advanced educational AI assistant for the augmentED platform, designed to help students learn efficiently. Your role is to generate accurate, concise, and relevant educational content based on provided course materials. Always return responses in valid JSON format, using clear field names (e.g., 'question', 'answer' for exams, 'front', 'back' for flashcards). If the output is not JSON-compatible, include an 'error' field with a description. Prioritize content relevance to the given course and end all responses with '###'."},
                {"role": "user", "content": f"""
{content}. Generate {num_items} {data['type']} items.
Return the response as a valid JSON array of objects.

If type is 'exam' and question_type is 'free_text', each object should have 'question', 'answer', and 'working' fields.
Example: {json.dumps([{"question": "What is ML?", "answer": "Machine Learning", "working": "ML is a field of AI that uses statistical techniques to give computer systems the ability to learn from data."}])}

If type is 'exam' and question_type is 'multiple_choice', each object should have 'question', 'choices' (an array of strings), 'answer' (the correct choice), and 'working' fields.
Example: {json.dumps([{"question": "What is the capital of France?", "choices": ["Berlin", "Madrid", "Paris", "Rome"], "answer": "Paris", "working": "Paris is the capital and most populous city of France."}])}

If type is 'exam' and question_type is 'numerical', each object should have 'question', 'numerical_answer' (a number), 'tolerance' (a number for acceptable deviation, e.g., 0 for exact match), 'answer' (string representation of numerical_answer), and 'working' fields.
Example: {json.dumps([{"question": "What is 2 + 2?", "numerical_answer": 4, "tolerance": 0, "answer": "4", "working": "2 + 2 = 4"}])}

If type is 'flashcard', each object should have 'front', 'back', and 'working' fields.
Example: {json.dumps([{"front": "What is ML?", "back": "Machine Learning", "working": "ML is a field of AI that uses statistical techniques to give computer systems the ability to learn from data."}])}
"""}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        result = response.choices[0].message.content.strip().replace('###', '')
        print(f"Raw AI response: {result}") # Debugging line
        try:
            items = json.loads(result) if result.startswith('[') else [{"error": "Invalid AI response format"}]

            # Save generated questions to the database
            saved_items = []
            for item_data in items:
                if "error" in item_data: # Skip items with errors
                    saved_items.append(item_data)
                    continue

                if data['type'] == 'exam':
                    new_question = GeneratedQuestion(
                        course_id=course.id,
                        question_type=question_type,
                        question_text=item_data.get('question'),
                        correct_answer=item_data.get('answer'),
                        working=item_data.get('working'),
                        choices=item_data.get('choices'),
                        numerical_answer=item_data.get('numerical_answer'),
                        tolerance=item_data.get('tolerance')
                    )
                elif data['type'] == 'flashcard':
                    new_question = GeneratedQuestion(
                        course_id=course.id,
                        question_type='free_text', # Flashcards are essentially free text
                        question_text=item_data.get('front'),
                        correct_answer=item_data.get('back'),
                        working=item_data.get('working')
                    )
                db.session.add(new_question)
                db.session.flush() # To get the ID for the newly added question
                saved_items.append({**item_data, "id": new_question.id}) # Add the generated question ID
            db.session.commit()

        except json.JSONDecodeError:
            items = [{"error": "Failed to parse AI-generated JSON"}]
            saved_items = items # Assign to saved_items for consistent return
        return jsonify({
            "type": data['type'],
            "items": saved_items
        })
    except Exception as e:
        return jsonify({"message": f"AI error: {str(e)}"}), 500


def extract_text_from_file(file):
    if not file:
        return None, "No file provided"
    if file.filename == '':
        return None, "No selected file"
    if not file.filename.lower().endswith('.pdf'):
        return None, "Invalid file type. Please upload a PDF"
    try:
        pdf_document = fitz.open(stream=file.read(), filetype="pdf")
        full_text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            full_text += page.get_text()
        return full_text, None
    except Exception as e:
        return None, f"Error processing PDF: {str(e)}"

@app.route("/api/grade_assessment", methods=['POST'])
def grade_assessment():
    if 'rubric' not in request.files or 'assessment' not in request.files:
        return jsonify({"message": "Both 'rubric' and 'assessment' files are required"}), 400

    rubric_file = request.files['rubric']
    assessment_file = request.files['assessment']

    rubric_text, error = extract_text_from_file(rubric_file)
    if error:
        return jsonify({"message": f"Error with rubric file: {error}"}), 400

    assessment_text, error = extract_text_from_file(assessment_file)
    if error:
        return jsonify({"message": f"Error with assessment file: {error}"}), 400

    try:
        response = client.chat.completions.create(
            model="grok-3",
            messages=[
                {"role": "system", "content": "You are an AI assistant that grades student assessments based on a provided rubric. The output should be a JSON object with two keys: 'overallPoints' and 'markedRubric'. The 'overallPoints' should be a string representing the total score (e.g., '85/100'). The 'markedRubric' should be an array of objects, where each object represents a criterion from the rubric. Each criterion object should have the following keys: 'criterion' (the name of the criterion), 'points' (the points awarded for that criterion, e.g., '20/25'), 'feedback' (general feedback for that criterion), 'specificExample' (a specific example from the student's assessment to support the feedback), 'improvement' (a suggestion for improvement), and 'loss' (an explanation of why points were lost)."},
                {"role": "user", "content": f"Here is the rubric:\n\n{rubric_text}\n\nHere is the student's assessment:\n\n{assessment_text}"}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        result = response.choices[0].message.content.strip()
        return jsonify(json.loads(result))
    except Exception as e:
        return jsonify({"message": f"AI error: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)