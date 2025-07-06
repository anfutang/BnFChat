import pydantic
from pydantic import BaseModel
from typing import List

class convActionDetection(BaseModel):
    action: str

class entityDisambiguation(BaseModel):
    conclusion: str
    clarifying_question: str

class NL2SRU(BaseModel):
    reasoning: str
    sru_query: str

class convSummarization(BaseModel):
    reformulated_query: str

class sruConvSummarization(BaseModel):
    summarization: str

class relevanceChecker(BaseModel):
    conclusion: str
    relevant_facets: List[str]

class clarificationChekcer(BaseModel):
    conclusion: str
    useful_facets: List[str]

class CQGeneration(BaseModel):
    clarifying_question: str