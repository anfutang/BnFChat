import os
import json
import functools
import time
import openai
from dotenv import load_dotenv
from openai import OpenAI
import numpy as np

from ..prompt.module import *
from ..prompt.agent import ambiguity_detection, relevance_checker, clarification_checker
from .parser import *
from ..utils.utils import normalize, fetch_error
from ..utils.constant import RAG_EMBED_DIM

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI()
model_id = "gpt-4o-mini"

def safe_func(func):
    @functools.wraps(func)
    def wrapper(*args,**kwargs):
        start_time = time.time()
        try:
            res = func(*args,**kwargs)
            end_time = time.time()
            return (f"{end_time-start_time:.3f}", res)
        except Exception as e:
            return json.dumps({"type": "error", "content": f"{func.__name__}\n"+fetch_error(e)})
    return wrapper

def prompt_formatting(system_message,chat_history):
    history_message = []
    for idx, message in enumerate(chat_history):
        if not idx % 2:
            history_message.append({"role":"user","content":message})
        else:
            history_message.append({"role":"assistant","content":message})

    return [{"role":"system","content":system_message}] + history_message

def build_conv_paragraph(chat_history: list):
    conv = ["#Conversation: "]
    for idx, message in enumerate(chat_history):
        if not idx % 2:
            conv.append(f"User: {message}")
        else:
            conv.append(f"Assistant: {message}")
    return '\n'.join(conv)

def build_indexed_facets(facets: list):
    context = ["#Relevant facets:"]
    for ix, facet in enumerate(facets):
        context.append(f"{ix+1}. {facet}")
    return '\n'.join(context)

@safe_func
def call_conv_action_detection(chat_history: list):
    messages = prompt_formatting(conv_action_detection,[build_conv_paragraph(chat_history)])
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=ConvActionDetection,
            temperature=0.0
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"action")

@safe_func
def call_entity_disambiguation(chat_history:list):
    # print(chat_history)
    messages = prompt_formatting(ambiguity_detection,[build_conv_paragraph(chat_history)])
    
    completion = client.beta.chat.completions.parse(
        model=model_id,
        messages=messages,
        response_format=entityDisambiguation,
        temperature=0.0
    )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"conclusion"), getattr(parsed_result,"clarifying_question")

@safe_func
def call_metadata_processor(chat_history: list, bibligraphic_records: str):
    # messages = prompt_formatting(metadata_process,'\n'.join(map(str,bibligraphic_records)))
    messages = prompt_formatting(metadata_process,['\n'.join([build_conv_paragraph(chat_history),'\n',bibligraphic_records])])
    completion = client.chat.completions.create(
            model=model_id,
            messages=messages,
        )
    return completion.choices[0].message.content

@safe_func
def call_conv_summarization(chat_history: list):
    messages = prompt_formatting(conv_summarization,[build_conv_paragraph(chat_history)])
    # print(messages)
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=convSummarization,
            temperature=0.1
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"reformulated_query")

@safe_func
def call_relevance_checker(user_intent: str, facets: list):
    messages = prompt_formatting(relevance_checker,['\n'.join([f"User Intent: {user_intent}",'\n',build_indexed_facets(facets)])])
    # print(messages)
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=relevanceChecker,
            temperature=0.0
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"conclusion"), getattr(parsed_result,"relevant_facets") 

@safe_func
def call_clarification_checker(chat_history: list, facets: list):
    messages = prompt_formatting(clarification_checker,['\n'.join([build_conv_paragraph(chat_history),'\n',build_indexed_facets(facets)])])
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=clarificationChekcer,
            temperature=0.7
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"conclusion"), getattr(parsed_result,"useful_facets") 

@safe_func
def call_cq_generation(chat_history: list, facets: list):
    messages = prompt_formatting(cq_generation,['\n'.join([build_conv_paragraph(chat_history),'\n',build_indexed_facets(facets)])])
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=CQGeneration,
            temperature=0.5
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"clarifying_question")

@safe_func
def call_embedding(query: str):
    return normalize(np.array([openai.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
        dimensions=RAG_EMBED_DIM 
    ).data[0].embedding]))

@safe_func
def call_nl2sru(query: str,sru_hint: str,stream_response=False):
    if sru_hint:
        messages = prompt_formatting(nl2sru,['\n'.join([f"Query : {query}",f"Hint : {sru_hint}"])])
    else:
        messages = prompt_formatting(nl2sru,[f"Query : {query}"]) 
    # messages = prompt_formatting(nl2sru,[query])
    # print(messages)

    if stream_response:
        stream = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.0,
            stream=True,
        )
        return stream
    else:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.0,
        )
        # parsed_result = completion.choices[0].message.parsed
        # return (getattr(parsed_result,"reasoning"), getattr(parsed_result,"sru_query"))
        return completion.choices[0].message.content
