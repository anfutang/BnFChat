import os
import json
import functools
import time
import openai
from dotenv import load_dotenv
from openai import OpenAI
import numpy as np

from ..prompt.module import nl2sru, test, nl2sru_structured, metadata_process, conv_summarization
from ..prompt.agent import ambiguity_detection
from .parser import entityDisambiguation, NL2SRU
from ..utils.utils import normalize, fetch_error
from ..utils.constant import RAG_EMBED_DIM

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
            return (f"{end_time-start_time:.3f}", func(*args,**kwargs))
        except Exception as e:
            return json.dumps({"type": "error", "content": f"{func.__name__}\n"+fetch_error(e)})

def prompt_formatting(system_message,chat_history):
    history_message = []
    for idx, message in enumerate(chat_history):
        if not idx % 2:
            history_message.append({"role":"user","content":message})
        else:
            history_message.append({"role":"assistant","content":message})

    return [{"role":"system","content":system_message}] + history_message

def build_conv_paragraph(chat_history):
    conv = ["Conversation: "]
    for idx, message in enumerate(chat_history):
        if not idx:
            conv.append(f"User: {message}")
        else:
            conv.append(f"Assistant: {message}")
    return '\n'.join(conv)


def call_nl2sru(query,stream=False):
    if stream:
        messages = prompt_formatting(nl2sru,query)
        stream = client.chat.completions.create(
            model=model_id,
            messages=messages,
            stream=True,
        )
        return stream
    else:
        messages = prompt_formatting(nl2sru_structured,query)
        # print(messages)
        completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=NL2SRU,
            temperature=0.0
        )
        parsed_result = completion.choices[0].message.parsed
        return (getattr(parsed_result,"reasoning"), getattr(parsed_result,"sru_query"))

def call_entity_disambiguation(chat_history):
    messages = prompt_formatting(ambiguity_detection,chat_history)
    
    try:
        completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=entityDisambiguation,
            temperature=0.0
        )
        parsed_result = completion.choices[0].message.parsed
        print(parsed_result)
        return (getattr(parsed_result,"conclusion"), getattr(parsed_result,"clarifying_question"))
    except Exception as e:
        return e

def call_metadata_processor(chat_history: list, bibligraphic_records: str):
    # messages = prompt_formatting(metadata_process,'\n'.join(map(str,bibligraphic_records)))
    messages = prompt_formatting(metadata_process,['\n'.join([build_conv_paragraph(chat_history),'\n',bibligraphic_records])])
    completion = client.chat.completions.create(
            model=model_id,
            messages=messages,
        )
    print(completion)
    return completion.choices[0].message.content

def call_conv_summarization(chat_history: list):
    messages = prompt_formatting(conv_summarization,build_conv_paragraph(chat_history))
    completion = client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
        )
    parsed_result = completion.choices[0].message.parsed
    return getattr(parsed_result,"reformulated_query")

# def call_rac(chat_history:list,context: str):

def call_embedding(query: str):
    return normalize(np.array([openai.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
        dimensions=RAG_EMBED_DIM 
    ).data[0].embedding]))