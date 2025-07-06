import os
import re
import time
from typing import TypedDict, Optional, List, Tuple, Dict

from .llm import *
from .rag import knn
from ..utils.retriever import retrieve_with_gallica
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

def get_gallica_retrieval_message(num_gallica_records):
    message = ""
    if num_gallica_records == -1:
        message = "🟡 Validation bloquée pour l'instant, mais vous pouvez cliquer pour voir sur Gallica."
    elif num_gallica_records == 0:
        message = "🔴 Nul documents trouvé pour le SRU généré. Veuillez indiquer comment améliorer."
    elif num_gallica_records > 0: 
        message = f"🟢 {num_gallica_records} résultats correspondants pour ce SRU."
    return message 

# --- State definition ---
def build_graph(socketio, user_id, mode):
    class State(TypedDict, total=False):
        conv_history: List[str]
        chat_id: int
        last_user_intent: Optional[str]

        # intermediate variables
        conv_action: Optional[str]
        ambiguous: Optional[str]
        user_intent: Optional[str]
        relevant: Optional[str]
        relevant_facets: Optional[List[str]]
        clarification_needed: Optional[str]
        is_relevant_topic: Optional[bool]

        # output
        response: Optional[str]
        status: Optional[str] # used as an argument for prompt chain routers
        search_result:  Optional[Tuple[List[Dict], List[Dict]]]
        generated_sru_query: Optional[str]
        gallica_retrieval_message: Optional[str]

        # error
        error_message: Optional[str]

    def conv_action_detection(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "conv_action_detection",
            "info": "Le système oriente la conversation…"
        }, room=f'user_{user_id}') 

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
            if conv_history[-1] in ["cherche","cherchez","cherche le", "cherce", "cherches"]:
                call_llm_result = call_conv_summarization(conv_history[:-2])
            else:
                call_llm_result = call_conv_summarization(conv_history)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: conv_action_detection -> conv_summarization [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            state["user_intent"] = call_llm_result[1]
            state["status"] = "search:user"

            socketio.emit("user_intent", {
                "user_intent": state["user_intent"]
            }, room=f'user_{user_id}') 
        elif conv_action == "continue":
            state["status"] = "advance"
        return state

    def ambiguity_detection(state: State) -> State:
        conv_history = state["conv_history"]

        if is_fisrt_input(conv_history):
            socketio.emit("graph_update", {
                "node": "ambiguity_detection",
                "info": "Analyse de l’ambiguïté en cours… "
            }, room=f'user_{user_id}') 
            # if is_fisrt_input(conv_history) or not state.get("last_user_intent"):
        
            call_llm_result = call_entity_disambiguation(conv_history)
            if isinstance(call_llm_result,Exception):
                state["status"] = "error"
                state["error_message"] = "node: conv_ambiguity_detection [LLM]. ✖️"+fetch_error(call_llm_result) 
                return state
            ambiguous, cq = call_llm_result[1]  
            state["ambiguous"] = ambiguous
        else:
            socketio.emit("graph_update", {
                "node": "ambiguity_detection",
                "info": "Résumé en cours de la conversation… "
            }, room=f'user_{user_id}') 
            state["ambiguous"] = "no"    
        ambiguous = state["ambiguous"]
        if ambiguous == "yes":
            state["response"] = cq
            state["status"] = "continue"
        else:
            state["status"] = "advance"
        call_llm_result = call_conv_summarization(conv_history)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node: conv_ambiguity_detection -> conv_summarization [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state   
        if state.get("user_intent",''):
            state["last_user_intent"] = state["user_intent"]
        state["user_intent"] = call_llm_result[1]
        
        socketio.emit("user_intent", {
            "user_intent": state["user_intent"]
        }, room=f'user_{user_id}')
    
        return state

    def knn_relevance_check(state: State) -> State:
        socketio.emit("graph_update", {
            "node": "knn_relevance_check",
            "info": "Recherche en cours de contenus pertinents…"
        }, room=f'user_{user_id}')
        
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
        }, room=f'user_{user_id}')

        conv_history = state["conv_history"]
        relevant_facets = state.get("relevant_facets", [])
        
        call_llm_result = call_clarification_checker(conv_history, relevant_facets)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node: rac [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state
        clarification_needed, filtered_facets = call_llm_result[1]
        # state["clarification_needed"] = clarification_needed

        # if len(conv_history) >= random.sample(conv_length_limits):
        #     clarification_needed = "no"
        
        if clarification_needed == "yes":
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
            "info": "Recherche  : exploitation des sujets proches de votre intention…"
        }, room=f'user_{user_id}')

        user_intent = state.get("user_intent")
        knn_result = knn(user_intent,8)

        if not knn_result:
            # here, relevance check is only for cases when users instruct to search using the first user query, the query may not be relevant
            # If not the first query, relevance is checked in previous chain; no need to double check.
            state["response"] = REFUSAL_RESPONSE
            state["status"] = "end:refuse"
            return state

        socketio.emit('assistant_response', {
                'chat_id': state["chat_id"],
                'content': state["response"],
                'status': state["status"]
            }, room=f'user_{user_id}')

        state["search_result"] = knn_result

        return state
        
    def nl2sru(state: State) -> State:
        conv_history = state.get("conv_history")
        
        # if len(conv_history) > 1:
        #     socketio.emit("graph_update", {
        #     "node": "nl2sru",
        #     "info": "Résumé en cours…"}
        #     )
        #     summary = call_sru_conv_summarization(conv_history)
        # else:
        #     summary = conv_history[0]

        socketio.emit("graph_update", {
            "node": "nl2sru",
            "info": "Analyse en cours…"
        }, room=f'user_{user_id}')

        state["status"] = "nl2sru"
        
        # generate SRU and parse from the raw LLM result
        call_llm_result = call_nl2sru(conv_history,True)
        if isinstance(call_llm_result,Exception):
            state["status"] = "error"
            state["error_message"] = "node:  NL2SRU [LLM]. ✖️"+fetch_error(call_llm_result) 
            return state
        
        stream = call_llm_result[1]

        buffer = ""
        current_section = None

        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                buffer += content

                # check the current section of LLM-generated reasoning
                if "#Analysis:" in buffer and current_section is None:
                    current_section = "analysis"
                    buffer = buffer.split("#Analysis:")[1]  
                    buffer = "#Analysis:" + buffer  

                if "#Field:" in buffer and current_section == "analysis":
                    analysis_part, remaining = buffer.split("#Field:", 1)
                    state["response"] = analysis_part.replace("#Analysis:","").strip()
                    
                    # extract analysis only and use it as assistant response that will be shown to users
                    socketio.emit('assistant_response', {
                            'chat_id': state["chat_id"],
                            'content': state["response"],
                            'status': state["status"]
                        }, room=f'user_{user_id}')

                    socketio.emit("graph_update", {
                        "node": "search",
                        "info": "Génération de la requête SRU…"
                    }, room=f'user_{user_id}')

                    buffer = "#Field:" + remaining  
                    current_section = "field"

                if "#SRU:" in buffer and current_section in ["analysis", "field"]:
                    _, remaining = buffer.split("#SRU:", 1)
                    buffer = "#SRU:" + remaining  
                    current_section = "sru"

        if current_section == "sru" and buffer:
            generated_sru_query = buffer.replace("#SRU:","").strip()
            state["generated_sru_query"] = generated_sru_query
            socketio.emit('generated_sru', {
                'chat_id': state["chat_id"],
                'sru': state["generated_sru_query"],
            }, room=f'user_{user_id}')
        else:
            state["status"] = "error"
            state["error_message"] = f"node: NL2SRU [parsing]. ✖️Error parsing SRU query from LLM response; possibly due to incorrect format. {current_section}; {buffer}"
            return state
        
        socketio.emit("graph_update", {
            "node": "search",
            "info": "Vérification du SRU…"
        }, room=f'user_{user_id}')
        
        try:
            num_records, _ = retrieve_with_gallica(generated_sru_query,True)
        except Exception as e:
            state["status"] = "error"
            state["error_message"] = "node: search -> retrieval [Gallica API]. ✖️"+fetch_error(e) 
            num_records = -1

        gallica_retrieval_message = get_gallica_retrieval_message(num_records)
        state["gallica_retrieval_message"] = gallica_retrieval_message

        socketio.emit("gallica_retrieval_message", {
                "message": gallica_retrieval_message
            }, room=f'user_{user_id}')
        return state
            

    def finalize(state: State) -> State:
        if state["status"] not in ["search","error"]:
            socketio.emit('assistant_response', {
                'chat_id': state["chat_id"],
                'content': state["response"],
                'status': state.get("status", "completed")
            }, room=f'user_{user_id}')
        
        if state["status"] == "error":
            #  print('>'*10+state["error_message"])
            socketio.emit("error", {
                "error": state["error_message"],
            }, room=f'user_{user_id}')
        
        socketio.emit("graph_update", {
            "node": "finalize",
            "info": "finalize"
        }, room=f'user_{user_id}')
        return state

    # --- build LangGraph ---
    builder = StateGraph(State)

    # add nodes
    builder.add_node("conv_action_detection", RunnableLambda(conv_action_detection))
    builder.add_node("ambiguity_detection", RunnableLambda(ambiguity_detection))
    builder.add_node("knn_relevance_check", RunnableLambda(knn_relevance_check))
    builder.add_node("rac", RunnableLambda(rac))
    builder.add_node("search", RunnableLambda(search))
    builder.add_node("nl2sru", RunnableLambda(nl2sru))
    builder.add_node("finalize", RunnableLambda(finalize))

    if mode == "chat":
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
    else:
        builder.set_entry_point("nl2sru")

        builder.add_edge("nl2sru", "finalize")
            
        builder.add_edge("finalize", END)

    # compile graph
    graph = builder.compile()
    return graph