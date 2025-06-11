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

DEFAULT_USERS = [
    {'username': 'atang', 'password': 'aft0609', 'permission_level': 2, 'profile_created': True},
    {'username': 'admin', 'password': 'admin', 'permission_level': 2, 'profile_created': True},
    {'username': 'racousin', 'password': 'qwe', 'permission_level': 2, 'profile_created': True},
    {'username': 'guest', 'password': 'guest', 'permission_level': 1,  'profile_created': False},
    {'username': 'tester', 'password': 'tester', 'permission_level': 1,  'profile_created': False},
    {'username': 'bnf-scai-1', 'password': '7atsua', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-2', 'password': 'sn6moj', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-3', 'password': 'a63u38', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-4', 'password': 'tkzo3h', 'permission_level': 1, 'profil_created': False},
    {'username': 'bnf-scai-5', 'password': 'uqbwky', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-6', 'password': 'cunhkb', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-7', 'password': '3w7w0w', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-8', 'password': 'aqz85b', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-9', 'password': 'mtnmpj', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-10', 'password': 'dh38uu', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-11', 'password': 'ixhxwu', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-12', 'password': 'm06ypg', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-13', 'password': 'gznxby', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-14', 'password': 'fokery', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-15', 'password': 'tmouj8', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-16', 'password': '9uq2d7', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-17', 'password': 'f8hint', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-18', 'password': 'ny39ed', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-19', 'password': 'jn6gdx', 'permission_level': 1, 'profil_created': False}, 
    {'username': 'bnf-scai-20', 'password': '8793vv', 'permission_level': 1, 'profil_created': False}
]

PROFILE_KEYS =  ['age', 'diplome', 'situation', 'recherche_academique', 'recherche_amateur', 'utilise_gallica', 'usage_gallica', 'frequence_gallica', 'contact_autorise']

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

# Topic definitions
TOPICS = {
    1: [
        {"id": 1, "name": "Victor Hugo", "category": "Personne"}
    ],
    2: [  # Exercise topics
        {"id": 1, "name": "Victor Hugo", "category": "Personne"}
    ],
    3: [
        {"id": 1, "name": "Histoire naturelle", "category": "Œuvre / Sujet"},
        {"id": 2, "name": "Mémoires de l'Académie des Sciences", "category": "Revue scientifique"},
        {"id": 3, "name": "Le Charivari", "category": "Périodique"},
        {"id": 4, "name": "Le Temps", "category": "Périodique"},
        {"id": 5, "name": "Encyclopédie", "category": "Œuvre / Sujet"},
        {"id": 6, "name": "La Mode illustrée", "category": "Périodique"},
        {"id": 7, "name": "La Bible", "category": "Œuvre"},
        {"id": 8, "name": "Voltaire", "category": "Personne"},
        {"id": 9, "name": "Louis XVI", "category": "Personne"},
        {"id": 10, "name": "Émile Zola", "category": "Personne"},
        {"id": 11, "name": "Saint Louis", "category": "Personne"},
        {"id": 12, "name": "Eugène Atget", "category": "Personne"},
        {"id": 13, "name": "Victor Hugo", "category": "Personne"},
        {"id": 14, "name": "Louis XIV", "category": "Personne"},
        {"id": 15, "name": "Henri III", "category": "Personne"},
        {"id": 16, "name": "Mozart", "category": "Personne"},
        {"id": 17, "name": "Jeanne d'Arc", "category": "Personne"},
        {"id": 18, "name": "Napoléon III", "category": "Personne"},
        {"id": 19, "name": "Molière", "category": "Personne"},
        {"id": 20, "name": "Mythologie", "category": "Sujet"},
        {"id": 21, "name": "Caricature", "category": "Sujet"},
        {"id": 22, "name": "Gravure", "category": "Sujet"},
        {"id": 23, "name": "Pêche", "category": "Sujet"},
        {"id": 24, "name": "Urbanisme", "category": "Sujet"},
        {"id": 25, "name": "Mode", "category": "Sujet"},
        {"id": 26, "name": "Arts décoratifs", "category": "Sujet"},
        {"id": 27, "name": "Économie politique", "category": "Sujet"},
        {"id": 28, "name": "Astronomie", "category": "Sujet"},
        {"id": 29, "name": "Moyen Âge", "category": "Sujet"},
        {"id": 30, "name": "Carte de France", "category": "Sujet"},
        {"id": 31, "name": "Linguistique", "category": "Sujet"},
        {"id": 32, "name": "Daguerreotype", "category": "Sujet"},
        {"id": 33, "name": "Paquebot", "category": "Sujet"},
        {"id": 34, "name": "Agence Rol", "category": "Organisation"},
        {"id": 35, "name": "Le Monde", "category": "Organisation"},
        {"id": 36, "name": "La Croix", "category": "Organisation"},
        {"id": 37, "name": "Musée du Louvre", "category": "Organisation"},
        {"id": 38, "name": "Vogue", "category": "Organisation"},
        {"id": 39, "name": "Longchamp", "category": "Organisation"},
        {"id": 40, "name": "Légion d'Honneur", "category": "Organisation"},
        {"id": 41, "name": "Armée française", "category": "Organisation"},
        {"id": 42, "name": "Première Guerre mondiale", "category": "Événement"},
        {"id": 43, "name": "Révolution Française", "category": "Événement"},
        {"id": 44, "name": "Second Empire", "category": "Événement"},
        {"id": 45, "name": "Tour de France", "category": "Événement"},
        {"id": 46, "name": "Exposition coloniale", "category": "Événement"},
    ]
}