from pydantic import BaseModel, Field
from typing import Optional, Literal


class Review(BaseModel):
    id: int
    text: str
    rating: int = Field(ge=1, le=5)
    language: Literal["en", "ar"]
    verified_purchase: bool = True
    helpful_votes: int = 0
    date: str
    reviewer_child_age: Optional[str] = None
