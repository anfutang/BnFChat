import os
import re
import time
from typing import TypedDict, Optional, List, Tuple, Dict

from .llm import *
from .rag import knn
from ..utils.retriever import retrieve_result_page
from ..utils.constant import ABANDON_RESPONSE, SEARCH_RESPONSE, REFUSAL_RESPONSE, SEARCH_LAST_USER_INTENT_RESPONSE, NO_FURTHER_CLARIFICATION_RESPONSE
from ..utils.utils import extract_sru_query, fetch_error

from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableLambda


def is_fisrt_input(conv_history: list):
    return len(conv_history) == 1


# abandon (end conv + restart new conv)
# end:user_abandon -> user wants to abandon
# end:refuse -> system wants to abandon cause no results
# end:user_restart -> user wants to restart

# search (get results + display + evaluate + end conv + restart new conv)
# search:user -> user wants to search result
# search:system_no_further_clarification -> system wants to no further clarification
# search:system_intent_irrelevant -> system wants to search using last intent 

# continue (continue conv)
# continue -> continue conv

# systen erreur (display message to user conv, save graph error to db, restart new conv )
# erreur:

# advance (! only used in langgraph pipeline; route to the next node)

# -- user workflow (end conv + restart new conv)
# session change
# change topic

# --- State definition ---
def build_graph(socketio): # socketio instance
    class State(TypedDict, total=False):
        conv_history: str
        last_user_intent: Optional[str]

        # intermediate variables
        conv_action: Optional[str]
        ambiguous: Optional[str]
        user_intent: Optional[str]
        relevant: Optional[str]
        relevant_facets: Optional[List[str]]
        clarification_needed: Optional[str]

        # output
        response: Optional[str]
        status: Optional[str] # used as an argument for prompt chain routers
        search_result:  Optional[Tuple[List[Dict], List[Dict]]]
        generated_sru_query: Optional[str]
        original_sru_query: Optional[str]


    def conv_action_detection(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "conv_action_detection",
            "info": "Le système oriente la conversation…"
        })

        conv_history = state["conv_history"]

        call_llm_result = call_conv_action_detection(conv_history)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node: conv_action_detection [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state
        conv_action = call_llm_result[1]
        state["conv_action"] = conv_action

        if conv_action == "abandon":
            state["response"] = ABANDON_RESPONSE
            state["status"] = "end:user_abandon"
        elif conv_action == "search":
            state["response"] = SEARCH_RESPONSE
            call_llm_result = call_conv_summarization(conv_history)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: conv_action_detection -> conv_summarization [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            state["user_intent"] = call_llm_result[1]
            state["status"] = "search:user"

            socketio.emit("show_user_intent", {
                "user_intent": state["user_intent"]
            })
        elif conv_action == "continue":
            state["status"] = "advance"
        return state

    def ambiguity_detection(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "ambiguity_detection",
            "info": "Analyse de l’ambiguïté en cours… "
        })
        conv_history = state["conv_history"]
        if is_fisrt_input(conv_history) or not state.get("last_user_intent"):
            call_llm_result = call_entity_disambiguation(conv_history)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: conv_ambiguity_detection [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            ambiguous, cq = call_llm_result[1]  
            state["ambiguous"] = ambiguous
        else:
            state["ambiguous"] = "no"    
        ambiguous = state["ambiguous"]
        if ambiguous == "yes":
            state["response"] = cq
            state["status"] = "continue"
        else:
            call_llm_result = call_conv_summarization(conv_history)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: conv_ambiguity_detection -> conv_summarization [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state   
            state["user_intent"] = call_llm_result[1]
            state["status"] = "advance"
            
            socketio.emit("show_user_intent", {
                "user_intent": state["user_intent"]
            })
        
        return state

    def knn_relevance_check(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "knn_relevance_check",
            "info": "Recherche en cours de contenus pertinents…"
        })
        
        user_intent = state["user_intent"]
        knn_result = knn(user_intent,20)
        if not knn_result:
            state["relevant"] = "no"
        else:
            candidate_facets = knn_result["facet"]
            call_llm_result = call_relevance_checker(user_intent,candidate_facets)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: knn_relevance_check [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            relevant, filtered_facets = call_llm_result[1]
            # print(relevant,filtered_facets)
            state["relevant"] = relevant
        if state["relevant"] == "no":
            if state.get("last_user_intent"):
                state["response"] = SEARCH_LAST_USER_INTENT_RESPONSE
                state["user_intent"] = state.get("last_user_intent") 
                state["status"] = "search:system_intent_irrelevant"
            else:
                state["response"] = REFUSAL_RESPONSE
                state["status"] = "end:refuse"
        else:
            state["relevant_facets"] = filtered_facets
            state["status"] = "advance"
        # print("relevance_checker")
        return state

    def rac(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "rac",
            "info": "Analyse pour déterminer si une clarification est requise…"
        })

        conv_history = state["conv_history"]
        relevant_facets = state.get("relevant_facets", [])
        
        call_llm_result = call_clarification_checker(conv_history, relevant_facets)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node: rac [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state
        clarification_needed, filtered_facets = call_llm_result[1]
        # state["clarification_needed"] = clarification_needed
        
        if clarification_needed:
            call_llm_result = call_cq_generation(conv_history, filtered_facets)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: cq_generation [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            state["response"] = call_llm_result[1]
            state["status"] = "continue"
        else:
            state["response"] = NO_FURTHER_CLARIFICATION_RESPONSE
            state["status"] = "search:system_no_further_clarification"
        # print("rac")
        return state

    def search(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "search",
            "info": "Préparation de la recherche : génération de la requête SRU en cours…"
        })
        user_intent = state.get("user_intent")
        knn_result = knn(user_intent,1)
        if not knn_result:
            # here, relevance check is only for cases when users instruct to search using the first user query, the query may not be relevant
            # If not the first query, relevance is checked in previous chain; no need to double check.
            state["response"] = REFUSAL_RESPONSE
            state["status"] = "end:refuse"
            return state
        if knn_result["score"][0] > 0.9:
            sru_hint = knn_result["sru_statements"][0]
        else:
            sru_hint = ""
        
        # generate SRU and parse from the raw LLM result
        call_llm_result = call_nl2sru(user_intent, sru_hint)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node: search -> NL2SRU [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state
        try: 
            sru_query = extract_sru_query(call_llm_result[1])
        except: 
            state["status"] = "error"
            state["error_message"] = "node: search -> NL2SRU [parsing]. ✖️Error parsing SRU query from LLM result."
            return state
        
        socketio.emit("graph_update", {
            "node": "search",
            "info": "Préparation de la recherche : Interaction avec Gallica en cours…"
        })

        # fetch results w/ and w/o conversation using Gallica API
        first_user_query = state["conv_history"][0]
        original_sru_query = f"gallica all {first_user_query}"
        state["generated_sru_query"] = sru_query
        state["original_sru_query"] = original_sru_query
        try:
            state["search_result"] = retrieve_result_page(sru_query,original_sru_query)
            return state
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = "node: search -> retrieval [Gallica API]. ✖️"+fetch_error(call_llm_result) 
            return state

    def finalize(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "finalize",
            "info": "Sauvegarde de la conversation…"
        })

        # for all status
        #TODO: save_conv(state["response"],state["status"]); 
        #TODO: show_response()
        socketio.emit("llm_response", {
            "response":state["response"]
        })

        # status tag: end; search; continue.
        status_tag = state["status"].split(':')[0]

        if status_tag == "end":
            # TODO: time delay & newconv()
            pass
        elif status_tag == "search":
            #TODO: show_search_result(state["search_result"]) 
            #TODO: save_user_evals(); save state["generated_sru_query"] (no need to save state["search_result"])
            pass
        return state

    # --- build LangGraph ---
    builder = StateGraph(State)

    # add nodes
    builder.add_node("conv_action_detection", RunnableLambda(conv_action_detection))
    builder.add_node("ambiguity_detection", RunnableLambda(ambiguity_detection))
    builder.add_node("knn_relevance_check", RunnableLambda(knn_relevance_check))
    builder.add_node("rac", RunnableLambda(rac))
    builder.add_node("finalize", RunnableLambda(finalize))
    builder.add_node("search", RunnableLambda(search))

    # set entry
    builder.set_entry_point("conv_action_detection")

    builder.add_conditional_edges(
        "conv_action_detection",
        lambda s: s["status"].split(':')[0],
        {
            "advance": "ambiguity_detection",
            "end": "finalize",
            "error": "finalize",
            "search": "search",
        }
    )

    builder.add_conditional_edges(
        "ambiguity_detection",
        lambda s: s["status"].split(':')[0],
        {
            "advance": "knn_relevance_check",
            "continue":"finalize",
            "end": "finalize",
            "error": "finalize",
        }
    )

    builder.add_conditional_edges(
        "knn_relevance_check",
        lambda s: s["status"].split(':')[0],
        {
            "advance": "rac",
            "end": "finalize",
            "error": "finalize",
            "search": "search",
        }
    )

    builder.add_conditional_edges(
        "rac", 
        lambda s: s["status"].split(':')[0],
        {
            "continue":"finalize",
            "error":"finalize",
            "search":"search",
        }
    )

    builder.add_edge("search", "finalize")
        
    builder.add_edge("finalize", END)

    # compile graph
    graph = builder.compile()
    return graph


class SimpleWorkflow:
    def __init__(self):
        self.steps = ['analyze', 'search', 'respond']
    
    def execute(self, state):
        user_input = state.get('user_input', '').lower()
        
        # Check for special commands
        if 'abandon' in user_input:
            return {
                'response': 'abandon',
                'status': 'abandon'
            }
        elif 'recommencer' in user_input or 'restart' in user_input:
            return {
                'response': 'restart',
                'status': 'restart'
            }
        elif 'résultat' in user_input or 'result' in user_input:
            return {
                'response': 'results',
                'status': 'results'
            }
        
        # Simple response generation
        if any(word in user_input for word in ['bonjour', 'salut', 'hello']):
            response = "Bonjour! Je suis votre assistant de recherche BNF. Comment puis-je vous aider aujourd'hui?"
        elif any(word in user_input for word in ['merci', 'thank']):
            response = "Je vous en prie! N'hésitez pas si vous avez d'autres questions."
        elif len(user_input) > 0:
            response = f"Je recherche des informations sur '{user_input}' dans les collections de la BNF. Voici ce que j'ai trouvé..."
        else:
            response = "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler?"
        
        return {
            'response': response,
            'status': 'completed'
        }

# def build_graph(socketio):
#     return SimpleWorkflow()