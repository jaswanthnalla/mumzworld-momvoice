from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal
from enum import Enum


class AgeGroup(str, Enum):
    NEWBORN = "0-3 months"
    INFANT = "3-12 months"
    TODDLER = "1-3 years"
    PRESCHOOL = "3-5 years"
    CHILD = "5-12 years"
    PREGNANCY = "pregnancy"
    ALL_AGES = "all ages"


class SentimentSignal(BaseModel):
    aspect: str
    sentiment: Literal["positive", "negative", "mixed", "neutral"]
    confidence: float = Field(ge=0.0, le=1.0)
    supporting_review_ids: list[int]
    quote: Optional[str] = None


class ConcernFlag(BaseModel):
    severity: Literal["safety", "quality", "usability"]
    description: str
    frequency: int
    review_ids: list[int]


class MomsVerdict(BaseModel):
    product_name: str
    review_count: int

    headline_en: str = Field(description="One sentence verdict. Max 20 words.")
    summary_en: str = Field(description="3-4 sentences. Only claims supported by reviews.")
    best_for_en: str = Field(description="Who this works best for. Max 20 words.")

    headline_ar: str
    summary_ar: str
    best_for_ar: str

    age_suitability: list[AgeGroup]
    top_positives: list[SentimentSignal] = Field(max_length=3)
    top_concerns: list[SentimentSignal] = Field(max_length=3)
    concern_flags: list[ConcernFlag] = Field(default_factory=list)

    overall_confidence: float = Field(ge=0.0, le=1.0)
    confidence_reason: str
    data_gaps: list[str]
    verdict_is_reliable: bool
    unreliable_reason: Optional[str] = None

    @field_validator('headline_en')
    @classmethod
    def max_twenty_words(cls, v):
        if len(v.split()) > 20:
            raise ValueError('Headline must be 20 words or fewer')
        return v

    @model_validator(mode='after')
    def unreliable_needs_reason(self):
        if not self.verdict_is_reliable and not self.unreliable_reason:
            raise ValueError('unreliable_reason is required when verdict_is_reliable is False')
        return self
