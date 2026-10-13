from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)

    patients = relationship("PatientRecord", back_populates="doctor")

class PatientRecord(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    doctor_name = Column(String, nullable=True)
    
    patient_name = Column(String)
    age = Column(Integer)
    sex = Column(String)
    
    # Store predictions
    overall_risk = Column(Float)
    lad_risk = Column(Float)
    lcx_risk = Column(Float)
    rca_risk = Column(Float)
    
    # We can store the full raw input data as a JSON string if needed, 
    # but for simplicity we keep the key metrics here.
    raw_data = Column(String)
    clinical_notes = Column(String, default="[]")

    doctor = relationship("User", back_populates="patients")
