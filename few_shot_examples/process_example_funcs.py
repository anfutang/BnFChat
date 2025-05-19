import os
import sys
import pandas as pd

data_dir = "examples"

# python str() by default use single quotes which will cause parsing error using Langchain Pydantic parser. Therefore, can't simply use str() to turn a list to a string.
def list_to_string(l):
    s = "["
    for i, ss in enumerate(l):
        if i < len(l) - 1:
            s += '"' + ss + '", '
        else:
            s += '"' + ss + '"'
    return s + "]"

def single_turn_generation_select(args):
    df = pd.read_csv(os.path.join(data_dir,"single_turn","select.csv"))
    examples = []
    if args.prompt_type == "few-shot":
        for _, row in df.iterrows():
            query = row["requête"]
            rqs = [row[f"rq{i}"].replace('"',"'") for i in range(1,6)]
            examples.append((f"Requête: {query}","{\"reformulated_queries\":"+list_to_string(rqs)+"}"))
    else:
        for _, row in df.iterrows():
            query = row["requête"]
            rqs = [row[f"rq{i}"].replace('"',"'") for i in range(1,6)]
            reasoning = '"'+row["AT-raisonnement"].replace('"',"'")+'"'
            examples.append((f"Requête: {query}","{\"reasoning\":"+reasoning+",\"reformulated_queries\":"+list_to_string(rqs)+"}"))
    return examples
    
def single_turn_generation_respond(args):
    df = pd.read_csv(os.path.join(data_dir,"single_turn","respond.csv"))
    examples = []
    if args.prompt_type == "few-shot":
        for _, row in df.iterrows():
            query = row["requête"]
            cq = '"'+row["cq"].replace('"',"'")+'"'
            examples.append((f"Requête: {query}","{\"clarification_question\":"+cq+"}"))
    else:
        for _, row in df.iterrows():
            query = row["requête"]
            cq = '"'+row["cq"].replace('"',"'")+'"'
            reasoning = '"'+row["AT-raisonnement"].replace('"',"'")+'"'
            examples.append((f"Requête: {query}","{\"reasoning\":"+reasoning+",\"clarification_question\":"+cq+"}"))
    return examples

def single_turn_generation_select_respond(args):
    df = pd.read_csv(os.path.join(data_dir,"single_turn","select+respond.csv"))
    examples = []
    if args.prompt_type == "few-shot":
        for _, row in df.iterrows():
            query = row["requête"]
            cqs = [row[f"cq{i}"].replace('"',"'") for i in range(1,6)]
            examples.append((f"Requête: {query}","{\"clarification_questions\":"+list_to_string(cqs)+"}"))
    else:
        for _, row in df.iterrows():
            query = row["requête"]
            cqs = [row[f"cq{i}"].replace('"',"'") for i in range(1,6)]
            reasoning = '"'+row["AT-raisonnement"].replace('"',"'")+'"'
            examples.append((f"Requête: {query}","{\"reasoning\":"+reasoning+",\"clarification_questions\":"+list_to_string(cqs)+"}"))
    return examples

def multi_turn_generation_respond(args):
    df = pd.read_csv(os.path.join(data_dir,"multi_turn","respond.csv"))
    examples = []
    if args.prompt_type in ["few-shot","AT-few-shot"]:
        for _, row in df.iterrows():
            query = row["requête"]
            prev_cq = row["previous_cq"]
            prev_response = row["previous_response"]
            input = f"Query: {query}" + '\n' + f"Clarification question: {prev_cq}" + '\n' + f"Response: {prev_response}"
            cq = '"'+row["cq"]+'"'
            examples.append((input,"{\"clarification_question\":"+cq+"}"))
    elif args.prompt_type in ["CoT-few-shot","AT-CoT-few-shot"]:
        for _, row in df.iterrows():
            query = row["requête"]
            prev_cq = row["previous_cq"]
            prev_response = row["previous_response"]
            input = f"Query: {query}" + '\n' + f"Clarification question: {prev_cq}" + '\n' + f"Response: {prev_response}"
            cq = '"'+row["cq"]+'"'
            if args.prompt_type == "CoT-few-shot":
                reasoning = '"'+row["reasoning"].replace('"',"'")+'"'
            else:
                reasoning = '"'+row["AT-reasoning"].replace('"',"'")+'"'
            examples.append((input,"{\"reasoning\":"+reasoning+",\"clarification_question\":"+cq+"}"))
    return examples

def multi_turn_generation_select_respond(args):
    df = pd.read_csv(os.path.join(data_dir,"multi_turn","select+respond.csv"))
    examples = []
    if args.prompt_type in ["few-shot","AT-few-shot"]:
        for _, row in df.iterrows():
            query = row["requête"]
            prev_cq = row["previous_selected_cq"]
            prev_response = row["previous_response"]
            input = f"Query: {query}" + '\n' + f"Selected clarification question: {prev_cq}" + '\n' + f"Response: {prev_response}"
            cqs = [row[f"cq{i}"] for i in range(1,6)]
            examples.append((input,"{\"clarification_questions\":"+list_to_string(cqs)+"}"))
    elif args.prompt_type in ["CoT-few-shot","AT-CoT-few-shot"]:
        for _, row in df.iterrows():
            query = row["requête"]
            prev_cq = row["previous_selected_cq"]
            prev_response = row["previous_response"]
            input = f"Query: {query}" + '\n' + f"Selected clarification question: {prev_cq}" + '\n' + f"Response: {prev_response}"
            cqs = [row[f"cq{i}"] for i in range(1,6)]
            if args.prompt_type == "CoT-few-shot":
                reasoning = '"'+row["reasoning"].replace('"',"'")+'"'
            else:
                reasoning = '"'+row["AT-reasoning"].replace('"',"'")+'"'
            examples.append((input,"{\"reasoning\":"+reasoning+",\"clarification_questions\":"+list_to_string(cqs)+"}"))
    return examples
