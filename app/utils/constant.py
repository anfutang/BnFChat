import os

DEV_MODE = True
MAX_NUM_REFRESH = 3
USER_MODES = ["select","respond","select+respond"]
IS_DEV_MODE = False
THRES_OPEN_GENERATION = 500
THRES_STOPPING = 20
THRES_TITLE_SAMPLING = 50
MAX_NUM_PAGES_TO_RETRIEVAL = 2
RAG_EMBED_DIM = 512
METADATA_DIR = "./instance/"

chatmode2ky = {"select":"reformulated_queries",
               "respond":"clarification_question",
               "select+respond":"clarification_questions"}

ABANDON_RESPONSE = "Vous avez décidé d'abondonner le dialogue. Votre conversation sera réinitialisée."
SEARCH_RESPONSE = "Recherche lancée. Veuillez patienter."
REFUSAL_RESPONSE = "Désolé, nul document pertinent trouvé dans notre base de données actuelle."
SEARCH_LAST_USER_INTENT_RESPONSE = "Nul document pertinent trouvé pour votre intention actuelle. Recherche lancée selon l'intention détectée la plus récente. Veuillez patienter."
NO_FURTHER_CLARIFICATION_RESPONSE = "Impossible de clarifier davantage. Recherche lancée selon la dernière intention détectée. Veuillez patienter."
# no_intent_response = "Pas d'intention détectée. Votre conversation sera réinitialisée."
# reinitialization_notification = " Votre conversation sera réinitialisée."
# search_notification = " Recherche lancée selon la dernière intention détectée. Veuillez patienter."

base_gallica_url = "https://gallica.bnf.fr/SRU?version=1.2&operation=searchRetrieve&query={sruQuery}&maximumRecords={maximumRecords}&startRecord={startRecord}"

admin_users = {"atang":2}

per_turn_eval_metrics = {"redondant":bool, "unnatural":bool,"incomplete":bool, "selected_index":int, "eliminated_indexes":list[int],
                         "selection_counts":int, "user_response_time":float, "llm_response_time":float,}

per_conversation_eval_metrics = ["comment","qAmbiguity","qEntity","qSatisfaction","qFacility"]

# list to index to index of user profile questions
ix_to_user_profile_question_ix = {**{i:i+1 for i in range(2)},**{i:i for i in range(3,100)}}

chat_type_to_show_text = {"select":"reformulated query","respond":"clarification question","select+respond":"clarification question"}

# keys that are kept when starting a new test
user_basic_keys = ["user_id","username", "dev_mode","permission_level"]

# keys that are useful across different chats
user_global_keys = ["user_id","username","chat_mode","dev_mode","permission_level","free_test","session_id","avatar-seed","first_turn"]

# keys that are used to define user profiles
user_profile_keys = ["age","diploma","situation","other-situation","engaged-in-academic-research-activities","engaged-in-amateur-research-activities",
                     "is-gallica-user","frequency-usage-gallica","time-usage-gallica","accept-further-contact","avatar-seed","permission_level"]

visible_users = [f"bnf-scai-{i}" for i in range(1,10)]

def get_topic_name(topic_id):
    """Get topic name by ID"""
    topic_names = {
        1: "Voltaire",
        2: "Napoléon III", 
        3: "Watteau",
        4: "Foucault",
        5: "Mozart",
        6: "Chopin",
        7: "Victor Hugo",
        8: "Rembrandt"
    }
    return topic_names.get(topic_id, "Sujet libre")

# Response constants
ABANDON_RESPONSE = "Conversation abandonnée. Vous pouvez commencer une nouvelle recherche à tout moment."
RESTART_RESPONSE = "Conversation redémarrée. Comment puis-je vous aider?"
RESULTS_RESPONSE = "Ouverture de la fenêtre de résultats..."