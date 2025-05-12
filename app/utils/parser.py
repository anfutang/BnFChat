from pydantic import BaseModel

class RQMultiple(BaseModel):
    sru_queries: list[str]
    reformulated_queries: list[str]

class CQSingle(BaseModel):
    clarification_question: str

class CQMultiple(BaseModel):
    clarification_questions: list[str]

class RQCoTMultiple(BaseModel):
    reasoning: str
    reformulated_queries: list[str] 

class CQCoTSingle(BaseModel):
    reasoning: str
    clarification_question: str

class CQCoTMultiple(BaseModel):
    reasoning: str
    clarification_questions: list[str] 

# class OpenRQGeneration(BaseModel):
#     clarification_queries: list[str]

class Convertor(BaseModel):
    sru_queries: list[str]
