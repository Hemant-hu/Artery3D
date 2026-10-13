from pydantic import BaseModel
from typing import Optional, Any, Dict

class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    doctor_name: Optional[str] = None
    email: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    doctor_name: Optional[str] = None
    email: str
    password: str

class PatientCreate(BaseModel):
    patient_name: str
    age: int
    sex: str
    clinical_data: Dict[str, Any] # all clinical features

class PatientUpdate(BaseModel):
    patient_name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    clinical_data: Optional[Dict[str, Any]] = None

class PatientResponse(BaseModel):
    id: int
    patient_name: str
    doctor_name: Optional[str] = None
    overall_risk: float
    lad_risk: float
    lcx_risk: float
    rca_risk: float
    class Config:
        from_attributes = True

class ClinicalNoteCreate(BaseModel):
    note: str
    action_plan: Optional[str] = None
    urgency: Optional[str] = "Routine"
