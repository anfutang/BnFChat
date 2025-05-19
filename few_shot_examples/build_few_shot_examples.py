import os
import sys
# import logging
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from itertools import product
import pandas as pd
from langchain.output_parsers import PydanticOutputParser

from parser_templates import *
from process_example_funcs import *
# from ..opt import get_args

class Arg:
    def __init__(self,turn,user_simulation_mode=None,prompt_type=None):
        self.turn = turn
        if user_simulation_mode is not None:    
            self.user_simulation_mode = user_simulation_mode
        if prompt_type is not None:
            self.prompt_type = prompt_type

def get_parser(args):
    if args.user_simulation_mode == "select":
        if "CoT" in args.prompt_type:
            pydantic_obj = RQCoTMultiple
        else:
            pydantic_obj = RQMultiple
    elif args.user_simulation_mode == "respond":
        if "CoT" in args.prompt_type:
            pydantic_obj = CQCoTSingle
        else:
            pydantic_obj = CQSingle
    else:
        if "CoT" in args.prompt_type:
            pydantic_obj = CQCoTMultiple
        else:
            pydantic_obj = CQMultiple
    return PydanticOutputParser(pydantic_object=pydantic_obj)

def turn_examples_to_pydantic_string(args):
    if args.turn == "multi_turn":
        if args.user_simulation_mode == "select":
            example_string = single_turn_generation_select(args)
        elif args.user_simulation_mode == "respond":
            example_string = multi_turn_generation_respond(args)
        elif args.user_simulation_mode == "select+respond":
            example_string = multi_turn_generation_select_respond(args)
    else:
        if args.user_simulation_mode == "select":
            example_string = single_turn_generation_select(args)
        elif args.user_simulation_mode == "respond":
            example_string = single_turn_generation_respond(args)
        elif args.user_simulation_mode == "select+respond":
            example_string = single_turn_generation_select_respond(args)
    return example_string

if __name__ == "__main__":
    turns = ["single_turn","multiple_turn"]
    user_simulation_modes = ["select","respond","select+respond"]
    prompt_types = ["few-shot","AT-CoT-few-shot"]

    argument_combs = list(product(["single_turn"],user_simulation_modes,prompt_types)) 
                    #  list(product(["multi_turn"],user_simulation_modes,prompt_types)) 
    
    fs_examples = {}
    for arg in argument_combs:
        tmp = fs_examples
        for a in arg[:-1]:
            if a not in tmp:
                tmp[a] = {}
            tmp = tmp[a]

    for comb in argument_combs:
        args = Arg(*comb)
        parser = get_parser(args)
        examples = turn_examples_to_pydantic_string(args)
        tmp = fs_examples
        for arg in comb[:-1]:
            tmp = tmp[arg]
        tmp[comb[-1]] = ''
        
        for input, output in examples:
            try:
                parser.parse(output)
                tmp[comb[-1]] += f"{input}\n{output}\n\n"
            except:
                raise ValueError(f"{comb}: unable to parse few-shot examples.")
        else:
            print(f"{comb}:finished.")
        
    dst_fn = "few_shot_examples.json"
    json.dump(fs_examples,open(dst_fn,'w'))
    
    print("succeded: building few-shot examples.")
    print(f"formatted few-shot examples saved to {dst_fn}.")


    