import uuid
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"


class UserOut(BaseModel):
    id:    uuid.UUID
    name:  str
    email: str

    model_config = {"from_attributes": True}
