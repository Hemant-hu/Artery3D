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

class TokenData(BaseModel):
    email: Optional[str] = None

class PatientCreate(BaseModel):
    patient_name: str
    age: int
    sex: str
    clinical_data: Dict[str, Any] # all the 55 features

class PatientResponse(BaseModel):
    id: int
    patient_name: str
    overall_risk: float
    lad_risk: float
    lcx_risk: float
    rca_risk: float
    class Config:
        from_attributes = True
