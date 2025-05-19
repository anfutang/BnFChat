import pydantic
from pydantic import BaseModel
from typing import List

class ConvIntentDetection(BaseModel):
    intent: str

class entityDisambiguation(BaseModel):
    conclusion: str
    clarifying_question: str

class NL2SRU(BaseModel):
    reasoning: str
    sru_query: str

class convSummarization(BaseModel):
    reformulated_query: str

class relevanceChecker(BaseModel):
    conclusion: str
    relevant_facet_ids: List[int]

class RAC(BaseModel):
    conclusion: str
    clarifying_question: str