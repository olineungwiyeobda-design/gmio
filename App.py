from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
import uuid
from passlib.context import CryptContext

# 설정
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일

app = FastAPI(title="Ground Education Platform API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# 임시 데이터베이스 (실제로는 PostgreSQL, MongoDB 등 사용)
db_teachers = {}
db_classes = {}
db_students = {}
db_points = {}

# ==================== Models ====================

class Teacher(BaseModel):
    id: str
    email: EmailStr
    name: str
    school: str
    hashed_password: str
    created_at: datetime

class TeacherSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    school: str

class TeacherLogin(BaseModel):
    email: EmailStr
    password: str

class Class(BaseModel):
    id: str
    teacher_id: str
    name: str
    grade: int
    class_number: int
    access_code: str
    created_at: datetime

class ClassCreate(BaseModel):
    name: str
    grade: int
    class_number: int

class Student(BaseModel):
    id: str
    class_id: str
    name: str
    student_number: int
    created_at: datetime

class StudentCreate(BaseModel):
    name: str
    student_number: int

class PointTransaction(BaseModel):
    id: str
    student_id: str
    amount: int
    reason: str
    created_by: str
    created_at: datetime

class PointCreate(BaseModel):
    student_id: str
    amount: int
    reason: str

# ==================== Utility Functions ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_teacher(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Teacher:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        teacher_id = payload.get("sub")
        if teacher_id not in db_teachers:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return db_teachers[teacher_id]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

def generate_class_code() -> str:
    return str(uuid.uuid4())[:8].upper()

# ==================== Authentication Routes ====================

@app.post("/api/auth/signup")
def signup(data: TeacherSignup):
    # 이메일 중복 체크
    for teacher in db_teachers.values():
        if teacher.email == data.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    teacher_id = str(uuid.uuid4())
    teacher = Teacher(
        id=teacher_id,
        email=data.email,
        name=data.name,
        school=data.school,
        hashed_password=hash_password(data.password),
        created_at=datetime.utcnow()
    )
    
    db_teachers[teacher_id] = teacher
    
    token = create_access_token({"sub": teacher_id})
    
    return {
        "token": token,
        "teacher": {
            "id": teacher.id,
            "email": teacher.email,
            "name": teacher.name,
            "school": teacher.school
        }
    }

@app.get("/api/auth/me")
def get_me(teacher: Teacher = Depends(get_current_teacher)):
    return {
        "id": teacher.id,
        "email": teacher.email,
        "name": teacher.name,
        "school": teacher.school
    }

# ==================== Class Management Routes ====================

@app.post("/api/classes")
def create_class(data: ClassCreate, teacher: Teacher = Depends(get_current_teacher)):
    class_id = str(uuid.uuid4())
    new_class = Class(
        id=class_id,
        teacher_id=teacher.id,
        name=data.name,
        grade=data.grade,
        class_number=data.class_number,
        access_code=generate_class_code(),
        created_at=datetime.utcnow()
    )
    
    db_classes[class_id] = new_class
    
    return {
        "id": new_class.id,
        "name": new_class.name,
        "grade": new_class.grade,
        "class_number": new_class.class_number,
        "access_code": new_class.access_code,
        "created_at": new_class.created_at.isoformat()
    }

@app.get("/api/classes")
def get_classes(teacher: Teacher = Depends(get_current_teacher)):
    teacher_classes = [
        {
            "id": c.id,
            "name": c.name,
            "grade": c.grade,
            "class_number": c.class_number,
            "access_code": c.access_code,
            "student_count": len([s for s in db_students.values() if s.class_id == c.id]),
            "created_at": c.created_at.isoformat()
        }
        for c in db_classes.values()
        if c.teacher_id == teacher.id
    ]
    return teacher_classes

@app.get("/api/classes/{class_id}")
def get_class(class_id: str, teacher: Teacher = Depends(get_current_teacher)):
    if class_id not in db_classes:
        raise HTTPException(status_code=404, detail="Class not found")
    
    cls = db_classes[class_id]
    if cls.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    students = [
        {
            "id": s.id,
            "name": s.name,
            "student_number": s.student_number,
            "total_points": sum(p.amount for p in db_points.values() if p.student_id == s.id),
            "created_at": s.created_at.isoformat()
        }
        for s in db_students.values()
        if s.class_id == class_id
    ]
    
    return {
        "id": cls.id,
        "name": cls.name,
        "grade": cls.grade,
        "class_number": cls.class_number,
        "access_code": cls.access_code,
        "students": students,
        "created_at": cls.created_at.isoformat()
    }

@app.post("/api/classes/{class_id}/students")
def add_student(class_id: str, data: StudentCreate, teacher: Teacher = Depends(get_current_teacher)):
    if class_id not in db_classes:
        raise HTTPException(status_code=404, detail="Class not found")
    
    cls = db_classes[class_id]
    if cls.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student_id = str(uuid.uuid4())
    student = Student(
        id=student_id,
        class_id=class_id,
        name=data.name,
        student_number=data.student_number,
        created_at=datetime.utcnow()
    )
    
    db_students[student_id] = student
    
    return {
        "id": student.id,
        "name": student.name,
        "student_number": student.student_number,
        "created_at": student.created_at.isoformat()
    }

# ==================== Point System Routes ====================

@app.post("/api/points")
def create_point(data: PointCreate, teacher: Teacher = Depends(get_current_teacher)):
    if data.student_id not in db_students:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student = db_students[data.student_id]
    cls = db_classes[student.class_id]
    
    if cls.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    transaction_id = str(uuid.uuid4())
    transaction = PointTransaction(
        id=transaction_id,
        student_id=data.student_id,
        amount=data.amount,
        reason=data.reason,
        created_by=teacher.id,
        created_at=datetime.utcnow()
    )
    
    db_points[transaction_id] = transaction
    
    return {
        "id": transaction.id,
        "student_id": transaction.student_id,
        "amount": transaction.amount,
        "reason": transaction.reason,
        "created_at": transaction.created_at.isoformat()
    }

@app.get("/api/students/{student_id}/points")
def get_student_points(student_id: str, teacher: Teacher = Depends(get_current_teacher)):
    if student_id not in db_students:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student = db_students[student_id]
    cls = db_classes[student.class_id]
    
    if cls.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    transactions = [
        {
            "id": p.id,
            "amount": p.amount,
            "reason": p.reason,
            "created_at": p.created_at.isoformat()
        }
        for p in db_points.values()
        if p.student_id == student_id
    ]
    
    total_points = sum(p.amount for p in db_points.values() if p.student_id == student_id)
    
    return {
        "student_id": student_id,
        "student_name": student.name,
        "total_points": total_points,
        "transactions": transactions
    }

@app.get("/api/classes/{class_id}/leaderboard")
def get_leaderboard(class_id: str, teacher: Teacher = Depends(get_current_teacher)):
    if class_id not in db_classes:
        raise HTTPException(status_code=404, detail="Class not found")
    
    cls = db_classes[class_id]
    if cls.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    students = [s for s in db_students.values() if s.class_id == class_id]
    
    leaderboard = [
        {
            "student_id": s.id,
            "name": s.name,
            "student_number": s.student_number,
            "total_points": sum(p.amount for p in db_points.values() if p.student_id == s.id)
        }
        for s in students
    ]
    
    leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
    
    return leaderboard

# ==================== Health Check ====================

@app.get("/")
def health_check():
    return {"status": "healthy", "message": "Ground Education Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) teacher.id,
            "email": teacher.email,
            "name": teacher.name,
            "school": teacher.school
        }
    }

@app.post("/api/auth/login")
def login(data: TeacherLogin):
    teacher = None
    for t in db_teachers.values():
        if t.email == data.email:
            teacher = t
            break
    
    if not teacher or not verify_password(data.password, teacher.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    token = create_access_token({"sub": teacher.id})
    
    return {
        "token": token,
        "teacher": {
            "id":
