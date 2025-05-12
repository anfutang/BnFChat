import pydantic
from pydantic import BaseModel

class entityDisambiguation(BaseModel):
    conclusion: str
    clarifying_question: str

class NL2SRU(BaseModel):
    reasoning: str
    sru_query: str

class convSummarization(BaseModel):
    reformulated_query: str
