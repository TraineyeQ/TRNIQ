# AI Personal Trainer Backend
# Built with FastAPI, SQLAlchemy, and ML integration points

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import hashlib
import jwt
import numpy as np
from enum import Enum
import json

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DATABASE_URL = "sqlite:///./personal_trainer.db"  # Use PostgreSQL in production

# Database setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# FastAPI app
app = FastAPI(title="AI Personal Trainer Backend", version="1.0.0")

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ============= ENUMS =============
class FitnessLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ELITE = "elite"

class Goal(str, Enum):
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    ENDURANCE = "endurance"
    STRENGTH = "strength"
    GENERAL_FITNESS = "general_fitness"

class ExerciseType(str, Enum):
    CARDIO = "cardio"
    STRENGTH = "strength"
    FLEXIBILITY = "flexibility"
    BALANCE = "balance"
    PLYOMETRIC = "plyometric"

# ============= DATABASE MODELS =============
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    workouts = relationship("Workout", back_populates="user")
    progress = relationship("Progress", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    age = Column(Integer)
    height = Column(Float)  # in cm
    weight = Column(Float)  # in kg
    fitness_level = Column(String)
    primary_goal = Column(String)
    injuries = Column(Text)  # JSON string
    preferences = Column(Text)  # JSON string
    
    user = relationship("User", back_populates="profile")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    muscle_groups = Column(Text)  # JSON array
    equipment = Column(String)
    difficulty = Column(Integer)  # 1-5
    description = Column(Text)
    instructions = Column(Text)
    
class Workout(Base):
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_date = Column(DateTime)
    completed = Column(Boolean, default=False)
    duration_minutes = Column(Integer)
    
    user = relationship("User", back_populates="workouts")
    exercises = relationship("WorkoutExercise", back_populates="workout")

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    sets = Column(Integer)
    reps = Column(Integer)
    weight = Column(Float)
    rest_seconds = Column(Integer)
    order = Column(Integer)
    
    workout = relationship("Workout", back_populates="exercises")
    exercise = relationship("Exercise")

class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)
    weight = Column(Float)
    body_fat_percentage = Column(Float)
    measurements = Column(Text)  # JSON with various body measurements
    performance_metrics = Column(Text)  # JSON with performance data
    
    user = relationship("User", back_populates="progress")

# Create tables
Base.metadata.create_all(bind=engine)

# ============= PYDANTIC MODELS =============
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserProfileCreate(BaseModel):
    age: int
    height: float
    weight: float
    fitness_level: FitnessLevel
    primary_goal: Goal
    injuries: Optional[List[str]] = []
    preferences: Optional[Dict[str, Any]] = {}

class ExerciseCreate(BaseModel):
    name: str
    type: ExerciseType
    muscle_groups: List[str]
    equipment: str
    difficulty: int = Field(ge=1, le=5)
    description: str
    instructions: str

class WorkoutCreate(BaseModel):
    name: str
    scheduled_date: datetime
    exercises: List[Dict[str, Any]]

class ProgressCreate(BaseModel):
    weight: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    measurements: Optional[Dict[str, float]] = {}
    performance_metrics: Optional[Dict[str, Any]] = {}

class Token(BaseModel):
    access_token: str
    token_type: str

# ============= ML/AI INTEGRATION =============
class AIPersonalTrainer:
    """AI engine for personalized workout recommendations"""
    
    @staticmethod
    def generate_workout_plan(profile: UserProfile, num_days: int = 7) -> List[Dict]:
        """Generate personalized workout plan based on user profile"""
        # This is a simplified version - integrate with actual ML model
        workouts = []
        
        # Map fitness level to intensity
        intensity_map = {
            "beginner": 0.3,
            "intermediate": 0.5,
            "advanced": 0.7,
            "elite": 0.9
        }
        
        intensity = intensity_map.get(profile.fitness_level, 0.5)
        
        for day in range(num_days):
            if day % 3 == 2:  # Rest day every 3rd day
                continue
                
            workout = {
                "day": day + 1,
                "name": f"Day {day + 1} Workout",
                "exercises": []
            }
            
            # Add exercises based on goal
            if profile.primary_goal == "muscle_gain":
                workout["exercises"] = [
                    {"exercise_id": 1, "sets": int(3 + intensity * 2), "reps": 8-12},
                    {"exercise_id": 2, "sets": int(3 + intensity * 2), "reps": 8-12},
                    {"exercise_id": 3, "sets": int(2 + intensity * 2), "reps": 10-15}
                ]
            elif profile.primary_goal == "weight_loss":
                workout["exercises"] = [
                    {"exercise_id": 4, "duration": int(20 + intensity * 20)},
                    {"exercise_id": 5, "sets": 3, "reps": 15-20},
                    {"exercise_id": 6, "duration": int(15 + intensity * 15)}
                ]
            else:
                workout["exercises"] = [
                    {"exercise_id": 1, "sets": 3, "reps": 10-12},
                    {"exercise_id": 4, "duration": 20}
                ]
            
            workouts.append(workout)
        
        return workouts
    
    @staticmethod
    def predict_progress(user_data: Dict, weeks_ahead: int = 4) -> Dict:
        """Predict user progress based on current trends"""
        # Simplified prediction - replace with actual ML model
        current_weight = user_data.get("weight", 70)
        goal = user_data.get("goal", "general_fitness")
        
        predictions = []
        for week in range(1, weeks_ahead + 1):
            if goal == "weight_loss":
                predicted_weight = current_weight - (0.5 * week)
            elif goal == "muscle_gain":
                predicted_weight = current_weight + (0.2 * week)
            else:
                predicted_weight = current_weight
            
            predictions.append({
                "week": week,
                "predicted_weight": predicted_weight,
                "confidence": 0.85 - (week * 0.05)
            })
        
        return {"predictions": predictions}
    
    @staticmethod
    def recommend_nutrition(profile: UserProfile) -> Dict:
        """Generate nutrition recommendations"""
        # Calculate basic metrics
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age
        
        activity_multiplier = {
            "beginner": 1.2,
            "intermediate": 1.375,
            "advanced": 1.55,
            "elite": 1.725
        }
        
        tdee = bmr * activity_multiplier.get(profile.fitness_level, 1.375)
        
        # Adjust based on goal
        if profile.primary_goal == "weight_loss":
            target_calories = tdee - 500
        elif profile.primary_goal == "muscle_gain":
            target_calories = tdee + 300
        else:
            target_calories = tdee
        
        return {
            "daily_calories": int(target_calories),
            "macros": {
                "protein": int(profile.weight * 2.0),  # grams
                "carbs": int((target_calories * 0.4) / 4),  # grams
                "fats": int((target_calories * 0.3) / 9)  # grams
            },
            "water": int(profile.weight * 35)  # ml
        }

# ============= UTILITY FUNCTIONS =============
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============= API ENDPOINTS =============

@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    existing = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hash_password(user.password)
    )
    db.add(db_user)
    db.commit()
    
    # Create token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/profile")
def create_profile(
    profile: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    existing = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if existing:
        # Update existing profile
        for key, value in profile.dict().items():
            if key in ["injuries", "preferences"]:
                setattr(existing, key, json.dumps(value))
            else:
                setattr(existing, key, value)
        db.commit()
        return {"message": "Profile updated"}
    else:
        # Create new profile
        db_profile = UserProfile(
            user_id=current_user.id,
            age=profile.age,
            height=profile.height,
            weight=profile.weight,
            fitness_level=profile.fitness_level,
            primary_goal=profile.primary_goal,
            injuries=json.dumps(profile.injuries),
            preferences=json.dumps(profile.preferences)
        )
        db.add(db_profile)
        db.commit()
        return {"message": "Profile created"}

@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {
        "age": profile.age,
        "height": profile.height,
        "weight": profile.weight,
        "fitness_level": profile.fitness_level,
        "primary_goal": profile.primary_goal,
        "injuries": json.loads(profile.injuries) if profile.injuries else [],
        "preferences": json.loads(profile.preferences) if profile.preferences else {}
    }

@app.post("/exercises")
def create_exercise(
    exercise: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new exercise (admin only in production)"""
    db_exercise = Exercise(
        name=exercise.name,
        type=exercise.type,
        muscle_groups=json.dumps(exercise.muscle_groups),
        equipment=exercise.equipment,
        difficulty=exercise.difficulty,
        description=exercise.description,
        instructions=exercise.instructions
    )
    db.add(db_exercise)
    db.commit()
    return {"message": "Exercise created", "id": db_exercise.id}

@app.get("/exercises")
def get_exercises(
    type: Optional[ExerciseType] = None,
    muscle_group: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of exercises with optional filters"""
    query = db.query(Exercise)
    
    if type:
        query = query.filter(Exercise.type == type)
    
    exercises = query.all()
    
    if muscle_group:
        exercises = [e for e in exercises if muscle_group in json.loads(e.muscle_groups)]
    
    return [{
        "id": e.id,
        "name": e.name,
        "type": e.type,
        "muscle_groups": json.loads(e.muscle_groups),
        "equipment": e.equipment,
        "difficulty": e.difficulty,
        "description": e.description
    } for e in exercises]

@app.post("/workouts/generate")
def generate_workout_plan(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered workout plan"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please create profile first")
    
    trainer = AIPersonalTrainer()
    plan = trainer.generate_workout_plan(profile, days)
    
    return {"workout_plan": plan}

@app.post("/workouts")
def create_workout(
    workout: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom workout"""
    db_workout = Workout(
        user_id=current_user.id,
        name=workout.name,
        scheduled_date=workout.scheduled_date
    )
    db.add(db_workout)
    db.commit()
    
    # Add exercises
    for i, exercise in enumerate(workout.exercises):
        db_exercise = WorkoutExercise(
            workout_id=db_workout.id,
            exercise_id=exercise["exercise_id"],
            sets=exercise.get("sets", 3),
            reps=exercise.get("reps", 10),
            weight=exercise.get("weight", 0),
            rest_seconds=exercise.get("rest_seconds", 60),
            order=i
        )
        db.add(db_exercise)
    
    db.commit()
    return {"message": "Workout created", "id": db_workout.id}

@app.get("/workouts")
def get_workouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's workouts"""
    workouts = db.query(Workout).filter(Workout.user_id == current_user.id).all()
    return [{
        "id": w.id,
        "name": w.name,
        "scheduled_date": w.scheduled_date,
        "completed": w.completed,
        "duration_minutes": w.duration_minutes
    } for w in workouts]

@app.put("/workouts/{workout_id}/complete")
def complete_workout(
    workout_id: int,
    duration_minutes: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark workout as completed"""
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    workout.completed = True
    workout.duration_minutes = duration_minutes
    db.commit()
    
    return {"message": "Workout completed"}

@app.post("/progress")
def track_progress(
    progress: ProgressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track user progress"""
    db_progress = Progress(
        user_id=current_user.id,
        weight=progress.weight,
        body_fat_percentage=progress.body_fat_percentage,
        measurements=json.dumps(progress.measurements),
        performance_metrics=json.dumps(progress.performance_metrics)
    )
    db.add(db_progress)
    db.commit()
    
    return {"message": "Progress tracked"}

@app.get("/progress")
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's progress history"""
    progress = db.query(Progress).filter(Progress.user_id == current_user.id).all()
    return [{
        "date": p.date,
        "weight": p.weight,
        "body_fat_percentage": p.body_fat_percentage,
        "measurements": json.loads(p.measurements) if p.measurements else {},
        "performance_metrics": json.loads(p.performance_metrics) if p.performance_metrics else {}
    } for p in progress]

@app.get("/ai/predict-progress")
def predict_progress(
    weeks: int = 4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI progress predictions"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile required")
    
    trainer = AIPersonalTrainer()
    predictions = trainer.predict_progress(
        {"weight": profile.weight, "goal": profile.primary_goal},
        weeks
    )
    
    return predictions

@app.get("/ai/nutrition")
def get_nutrition_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI nutrition recommendations"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile required")
    
    trainer = AIPersonalTrainer()
    nutrition = trainer.recommend_nutrition(profile)
    
    return nutrition

@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Personal Trainer Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)