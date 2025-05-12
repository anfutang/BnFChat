LLM_API_URL = 'http://192.168.0.152:8002/predict' 
PROMPT_TYPE = "AT-CoT" # standard, CoT, AT-CoT
DEV_MODE = True
MAX_NUM_REFRESH = 3
USER_MODES = ["select","respond","select+respond"]
IS_DEV_MODE = False
THRES_OPEN_GENERATION = 500
THRES_STOPPING = 20
THRES_TITLE_SAMPLING = 50
MAX_NUM_PAGES_TO_RETRIEVAL = 2
RAG_EMBED_DIM = 512
METADATA_DIR = "/data/"

EMBEDDING_DIM = 512

chatmode2ky = {"select":"reformulated_queries",
               "respond":"clarification_question",
               "select+respond":"clarification_questions"}

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
