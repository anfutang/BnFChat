import os
import re
import time
from typing import TypedDict, Optional, List, Tuple, Dict

from .llm import *
from .rag import knn
from ..utils.retriever import retrieve_result_page
from ..utils.constant import abandon_response, search_response, refusal_response, search_last_user_intent_response, no_further_clarification_response
from ..utils.utils import extract_sru_query

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
        status: Optional[str] # used as an indicator to finalize
        search_result:  Optional[Tuple[List[Dict], List[Dict]]]
        generated_sru_query: Optional[str]
        original_sru_query: Optional[str]


    def conv_action_detection(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "conv_action_detection",
            "info": "Le système oriente la conversation…"
        })

        conv_history = state["conv_history"]
        conv_action = call_conv_action_detection(conv_history)[1]

        state["conv_action"] = conv_action

        if conv_action == "abandon":
            state["response"] = abandon_response
            state["status"] = "end:user_abandon"
        elif conv_action == "search":
            state["response"] = search_response
            state["user_intent"] = call_conv_summarization(conv_history)[1]
            state["status"] = "search:user"
        elif conv_action == "continue":
            state["status"] = "continue"
        return state

    def ambiguity_detection(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "ambiguity_detection",
            "info": "Analyse de l’ambiguïté en cours… "
        })
        conv_history = state["conv_history"]
        if is_fisrt_input(conv_history) or not state.get("last_user_intent"):
            ambiguous, cq = call_entity_disambiguation(conv_history)[1]  
            state["ambiguous"] = ambiguous
        else:
            state["ambiguous"] = "no"    
        ambiguous = state["ambiguous"]
        if ambiguous == "yes":
            state["response"] = cq
            state["status"] = "continue"
        else:
            state["user_intent"] = call_conv_summarization(conv_history)[1]
        
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
            relevant, filtered_facets = call_relevance_checker(user_intent,candidate_facets)[1]
            # print(relevant,filtered_facets)
            state["relevant"] = relevant
        if state["relevant"] == "no":
            if state.get("last_user_intent"):
                state["response"] = search_last_user_intent_response
                state["user_intent"] = state.get("last_user_intent") 
                state["status"] = "search:system_intent_irrelevant"
            else:
                state["response"] = refusal_response
                state["status"] = "end:refuse"
        else:
            state["relevant_facets"] = filtered_facets
        # print("relevance_checker")
        return state

    def rac(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "rac",
            "info": "Analyse pour déterminer si une clarification est requise…"
        })

        conv_history = state["conv_history"]
        relevant_facets = state.get("relevant_facets", [])
        
        clarification_needed, filtered_facets = call_clarification_checker(conv_history, relevant_facets)[1]
        state["clarification_needed"] = clarification_needed
        
        if clarification_needed:
            state["response"] = call_cq_generation(conv_history,relevant_facets)[1]
            state["status"] = "continue"
        else:
            state["response"] = no_further_clarification_response
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
            state["response"] = refusal_response
            state["status"] = "end:refuse"
            return state
        if knn_result["score"][0] > 0.9:
            sru_hint = knn_result["sru_statements"][0]
        else:
            sru_hint = ""
        sru_query = extract_sru_query(call_nl2sru(user_intent, sru_hint)[1])

        socketio.emit("graph_update", {
            "node": "search",
            "info": "Préparation de la recherche : Interaction avec Gallica en cours…"
        })
        first_user_query = state["conv_history"][0]
        original_sru_query = f"gallica all {first_user_query}"
        state["generated_sru_query"] = sru_query
        state["original_sru_query"] = original_sru_query
        state["search_result"] = retrieve_result_page(sru_query,original_sru_query)
        # print("search")
        return state

    def finalize(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "finalize",
            "info": "Sauvegarde de la conversation…"
        })

        if state["status"] in abandon_list:
            socketio.emit("graph_update", {
                "node": "finalize",
                "info": "Conversation abandonnée."
            })
        elif state["status"] in result_lists:
            socketio.emit("graph_update", {
                "node": "finalize",
                "info": "Aucun résultat trouvé."
            })
        elif state["status"] in error:
            socketio.emit("graph_update", {
                "node": "finalize",
        elif  status == "continue":
            socketio.emit("graph_update", {
                "node": "finalize",
                "info": "Conversation continue."
            })
        else:
            socketio.emit("graph_update", {

        # socketio.emit("stream_chunk", {
        #     "content": state["response"]
        # })
        # print("start: finalize...")
        status = state["status"]
        base_status = status.split(':')[0]
        # 1. save conversation
        # save_conv(state["conv_history"],state["first_input"],status)
        # 2. show response
        # show_response(state["response"])
        # 3. initialize the chat interface
        # if base_status == "end":
        #     time.sleep(3)
        #     init_conv()
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
        lambda s: s["conv_action"],
        {
            "abandon": "finalize",
            "search": "finalize",
            "continue": "ambiguity_detection"
        }
    )

    builder.add_conditional_edges(
        "ambiguity_detection",
        lambda s: s["ambiguous"],
        {
            "yes": "finalize",
            "no": "knn_relevance_check"
        }
    )

    builder.add_conditional_edges(
        "knn_relevance_check",
        lambda s: s["relevant"],
        {
            "yes": "rac",
            "no": "finalize",
        }
    )

    builder.add_edge("rac", "finalize")
        
    builder.add_conditional_edges(
        "finalize", 
        lambda s: "search" if s["status"].split(':')[0] == "search" else "end",
        {
            "end":END,
            "search":"search",
        }
    )

    builder.add_edge("search", END)

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