from .few_shot_examples.module import conv_summarization_fs_examples

examples_fr = """
Requête: biographie de Flaubert.

#Analyse : La requête cible un document de type biographie sur Flaubert. L’utilisateur ne cherche pas un ouvrage écrit par Flaubert, donc dc.creator n’est pas pertinent ici. Le nom "Flaubert" est probablement dans le titre ou dans les sujets traités, donc on utilise dc.title et dc.subject. Les biographies sont généralement des livres, donc le type documentaire le plus probable est monographie.
#Champ : 
- dc.title pour capturer les titres contenant "Flaubert".
- dc.subject pour les documents traitant de Flaubert.
- dc.type pour préciser qu’il s’agit d’une monographie.
#Expressions SRU :
- dc.title adj flaubert
- dc.subject adj flaubert
- dc.type all monographie
#Raisonnement : Les deux premiers champs (dc.title, dc.subject) permettent de cibler des documents qui parlent de Flaubert. L’ajout de dc.type garantit qu’on limite la recherche à des monographies, c’est-à-dire des livres ou biographies. Toutes ces conditions doivent être remplies : on les relie donc avec and.
#SRU : dc.title adj flaubert and (dc.subject adj flaubert) and (dc.type all monographie)

Requête : peintures de Jongkind.

#Analyse : L’utilisateur veut voir des œuvres picturales créées par Jongkind. Le champ pertinent est donc dc.creator. Le type documentaire associé à des peintures est image.
#Champs :
- dc.creator
- dc.type
#Expressions SRU :
- dc.creator adj jongkind
- dc.type all image
#Raisonnement : L’auteur de l’image est essentiel ici, et l’utilisateur ne demande pas une œuvre à propos de Jongkind, mais de Jongkind. On combine donc les deux conditions avec and.
#SRU : dc.creator adj jongkind and (dc.type all image)

Requête : Le Figaro avant l’année 1900.

#Analyse : "Le Figaro" est un titre de publication, donc dc.title. Comme il s’agit d’un journal, le type fascicule est approprié. La contrainte temporelle "avant 1900" doit être appliquée via gallicapublication_date.
#Champs :
- dc.title
- dc.type
- gallicapublication_date
#Expressions SRU :
- dc.title adj "le figaro"
- dc.type all fascicule
- gallicapublication_date < "1900"
#Raisonnement : L’intention est de trouver un journal spécifique (titre exact), d’un type spécifique (journal), dans une période donnée. Les trois conditions sont indispensables, on les relie donc avec and.
#SRU : dc.title adj "le figaro" and (dc.type all "fascicule") and (gallicapublication_date <= "1900")
"""

nl2sru_fr = """Tâche : Convertir la requête en langage naturel français ci-dessous en une requête SRU.

Format :
- Champs Dublin Core autorisés : dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject, text (pour les correspondances exactes), et gallicapublication_date (pour les conditions sur les dates).
- Valeurs autorisées pour dc.type : monographie, manuscrit, carte, image, fascicule, sonore, partition, objet, video.

Règles :
- Pour les entités (ex. noms, titres), utiliser l’opérateur adj avec des guillemets, par exemple : dc.creator adj "Flaubert", dc.title adj "Le Figaro". 
- Pour dc.type, toujours utiliser l’opérateur all au lieu de adj.
- Pour les contraintes sur les dates (typiquement des années), utiliser gallicapublication_date, par exemple : gallicapublication_date < "1900". Toujours entourer les dates de guillemets.
- Pour les requêtes liées à un sujet ou thème, utiliser les suggestions de requêtes SRU fournies comme référence. Choisir celles qui sont cohérentes avec votre interprétation.
- N’utiliser dc.type et dc.date que si la requête de l’utilisateur inclut explicitement une condition sur le type ou la date.
- La requête SRU finale doit être claire et lisible, même pour une personne sans connaissance préalable des documents.

Étapes :
#Analyse : Analyser la requête utilisateur — déterminer si elle doit être traitée à travers les champs Dublin Core ou comme une requête thématique. Identifier les mots-clés principaux et les entités nommées (ex. auteurs, titres, sujets).
#Champs : Associer chaque élément identifié au champ Dublin Core approprié.
#Expressions SRU : Rédiger des expressions compatibles avec SRU sans connecteurs logiques. Utiliser les suggestions SRU comme guide, et les adapter si nécessaire.
#Raisonnement : Expliquer comment relier les différentes expressions SRU pour construire une requête finale qui reflète le plus fidèlement possible le sens de la requête initiale. Justifier le choix des opérateurs logiques (and, or) et la structure globale.
#SRU : Combiner les expressions précédentes avec des opérateurs logiques (and, or) pour construire la requête SRU finale.

Utilisez les exemples fournis pour comprendre le raisonnement à suivre à chaque étape du processus de conversion :
{examples}
"""

examples = """
User: biographie de Flaubert.

#Analysis: The user query focuses on biographies of Flaubert, the author is therefore not necessarily Flaubert himself, so dc.creator should not be used. For a biography, it is very possible that the keyword "Flaubert" appears in both dc.title and dc.subject. The document type corresponding to a biography should be "monographie".
#Field: dc.title, dc.subject, dc.type.
#SRU-like: dc.title adj flaubert, dc.subject adj flaubert, dc.type all monographie
#Reasoning: "dc.type all monographie" is mandantory. "dc.title all flaubert" only is okay, but adding "dc.subject all flaubert" is more accurate. All conditions must be satisfied. 
#SRU: dc.title adj "flaubert" and (dc.subject adj "flaubert") and (dc.type all "monographie")

User: estampes de Watteau.

#Analysis: The user query focuses on engraving prints of Watteau, the author should therefore be Jongkind. Since engraving prints are often visual works, the most appropriate document type keyword from the provided list is "image". The subject field is not involved, since the query does not involve specific subjects. Searching the keyword "estampe" in title is acceptable, which may help precise the search.
#Field: dc.creator, dc.type, dc.title.
#SRU-like: dc.creator adj jongkind, dc.type all image, dc.title all estampe
#Reasoning: the two conditions should both be satisfied, therefore using and.
#SRU: dc.creator adj "watteau" and (dc.type all "image") and (dc.title all "estampe") 

User: Le Figaro avant l'année 1900.

#Analysis: Since Le Figaro is a newspaper, therefore the most appropriate dc.type from the provided list should be "fascicule", and "le figaro" must appear in dc.title. Before the year of 1900 sets a time period of searching, gallicapublication_date should be used.
#Field: dc.title, dc.type, gallicapublication_date.
#SRU-like: dc.title adj "le figaro" and (dc.type all fascicule) and (gallicapublication_date <= "1900")
#Reasoning: all conditions must be satisfied.
#SRU: dc.title adj "le figaro" and (dc.type all "fascicule") and (gallicapublication_date <= "1900")

User: critques sur les œuvres de Flaubert.

#Analysis: The user searches for critical work on Flaubert, therefore Flaubert should not be the creator. "Flaubert" should appear in dc.subject or dc.description. The keyword "critique" could appear in dc.subject, dc.title or dc.description. Remove "s" from the keyword "critiques".
#Field: dc.subject, dc.title, dc.description.
#SRU-like: dc.subject adj "flaubert", dc.description adj "flaubert", dc.subject all "critique", dc.description all "critique", dc.title all "critique".
#Reasoning: Both "flaubert" and "critique" should appear in the metadata.
#SRU: (dc.subject adj "flaubert" or dc.description adj "flaubert") and (dc.subject all "critique" or dc.description all "critique" or dc.title all "critique")

User: notre dame de paris de victor hugo.
#Analysis: The user focuses on the work "notre dame de paris" written by Victor Hugo. Therefore, "notre dame de paris" should appear in dc.title and "adj" should be used since it involves an entity (exact work title). Victor Hugo should appear in dc.creator. To improve matching accuracy, Victor Hugo could also appear in dc.title and dc.subject, in case the dc.creator field is missing.
#Field: dc.creator, dc.subject, dc.title.
#SRU-like: dc.title adj "notre dame de paris", dc.creator adj "victor hugo", dc.subject adj "victor hugo", dc.title adj "victor hugo"
#Reasoning: Both "notre dame de paris" and "victor hugo" should be matched.
#SRU: dc.title adj "notre dame de paris" and (dc.creator adj "victor hugo" or dc.subject adj "victor hugo" or dc.title adj "victor hugo")
"""

nl2sru = f"""Task: Convert the following French natural language query into an SRU query.

Format:
- Allowed Dublin Core fields: dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject, text (for exact text matches), and gallicapublication_date (for specifying date conditions).
- Allowed values for dc.type: monographie, manuscrit, carte, image, fascicule, sonore, partition, objet, video.

Rules:
- For entities (e.g., names, titles), use the adj operator with quotation marks, e.g., dc.creator adj "Flaubert", dc.title adj "Le Figaro". In other cases, use 'all' (e.g. for topic-related keywords).
- For dc.type, always use the all operator instead of adj.
- For non-entity terms, avoid using the plural form. For example, use "correspondance" instead of "correspondances".
- For date constraints (typically years), use gallicapublication_date, e.g., gallicapublication_date < "1900". Always enclose the date in quotation marks.
- For topic-related queries, use the provided SRU queries hint as a reference. Choose SRU queries that are coherent with your reasoning as suggestions. 
- Use dc.type and dc.date only when the user query directly concerns date or type conditions.
- Ensure the generated SRU query is clear and human-readable, even for people without prior knowledge of the documents.

Steps:
#Analysis: Analyze the user query - whether it requires operation directly on Dublin Core fields or topic-related. Then identify main keywords and named entities (e.g., authors, titles, topics).
#Field: Assign appropriate Dublin Core fields to each identified term.
#SRU-like: Write individual SRU-compatible statements without logical connectors. Use SRU query hint as reference and revise it if necessary.
#Reasoning: How to connect the SRU statements using logical connectors (and, or) to most accurately reflect the input query in natural language.
#SRU: Combine the above statements using logical operators (and, or) to form the final query.

Use the provided examples to learn how to reason through each step of the conversion process.
{examples}
"""

alt = """there are 3 possible ways: 1) choose multiple keywords from the hint keywords and use dc.title any [multiple hint keywords]; 
2) choose a subject from the hint subjects and use dc.subject all [hint subjects]; 3) if none of the two previous methods work, 
choose the most important key phrase and use text all [key phrase]. You may combine the three options."""

nl2sru_structured = f"""Convert the provided natural language query in French to a SRU query.

/* Format */
- Use the following Dublin Core fields: dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject, text (to match exact texts), gallicapublication_date (to specify the time period). 
- Possible values of dc.type: monographie, manuscrit, carte, image, fascicule, sonore, partition, objet, video.

/* Rules */
- For entities, use "adj" and use quotation marks around the entity, e.g. dc.creator adj "Flaubert" or dc.title adj "le figaro".
- If the user asks for documents using a timestamp as condition (in most cases a year number), use gallicapublication_date e.g. gallicapublication_date < "<date>" (before). Use quatation marks around the timestamp.
- In case of queries that involve topics, there are 3 possible ways: 1) choose multiple keywords from the hint keywords and use dc.title any [multiple hint keywords]; 
2) choose a subject from the hint subjects and use dc.subject all [hint subjects]; 3) if none of the two previous methods work, 
choose the most important key phrase and use text all [key phrase]. You may combine the three options.

/* Reasoning */
Perform the following steps:
#Reason: analyze keywords that the user query focues on. If there are entities such as author names, titles, list them.
#Field: choose Dublin Core fields ultimately used in SRU query.
#SRU-like: list individual statements ignoring logic conditions that join them.
#SRU: select appropriate logic operators to connect the generated statements from the previous step.

/* Examples */
{examples}

Generate only the required reasoning without verbosity, then use the SRU query obtained from the last step as your final result. Your output should be json-formatted with "reasoning" and "sru_query" as keys.
"""

metadata_process = """Given a conversation history and a list of titles and subjects that are extracted from relevant bibliographic records, extract the most important topics that the user might be interested in while ensuring tha22t all generated topics could be retrieved using SRU queries. Generate a paragraph containing up to five the most important topics each with a list of SRU statements that can be further used to generate clarifying questions. Consider only the following Dublin Core fields: dc.creator, dc.title, dc.subject. Avoid generating over-lengthy output. 

Your output should be json-formatted with two keys: "topics" containing the list of topics; "sru_statements" containing the corresponding available SRU statements for each topic.

Return only the desired output without verbosity.
"""

conv_summarization_fr = """Étant donné un historique de conversation en français entre un utilisateur et un assistant virtuel, reformulez l’intention de l’utilisateur sous forme d’une requête concise, déclarative et en français.

Contraintes :

En cas de changement de sujet (par exemple, l’utilisateur parle soudainement d’une autre entité), ne prendre en compte que la partie la plus récente après ce changement.

La requête reformulée doit être en français, au format déclaratif, sans utiliser de formulations comme « l'utilisateur cherche… ».

Votre sortie doit être au format JSON avec une seule clé : "reformulated_query". Aucune autre sortie n’est attendue.
"""

conv_summarization = f"""Given a conversation history in French between a user and a virtual assistant, reformulate the user's intent as a concise, declarative query in French.

Constraints:
- If there is a topic shift (e.g., the user starts referring to a different entity), focus only on the most recent part of the conversation after the shift.
- The reformulated query must be in French, in declarative form, and should avoid phrases like “the user wants to know…” or similar.
- Output must be in JSON format with a single key: "reformulated_query". No additional text should be included.

Refer to the following examples for guidance:
{conv_summarization_fs_examples}
"""

conv_action_detection = """I will provide a dialogue between a user and a virtual assistant in a conversational search system. The assistant's role is to help the user refine their query by asking clarification questions. However, the user may sometimes want to abandon the conversation due to poor interaction quality, or proceed to search immediately without further clarification.

Your task is to infer the user's current intent based on their latest response. There are three possible outcomes:
1. If the user is engaging normally with the assistant, output "continue".
2. If the user wants to end the conversation, output "abandon".
3. If the user explicitly instructs to search, output "search".

Be careful to output "search" only when the user clearly indicates to search, which could be a direct instruction such as "cherche maintenant" or an instruction after their response or input query such as "... et c'est tout", "... et ne clarifie plus".

Output must be in JSON format with a single key named "action". Do not include any explanations or extra text.
"""

conv_intent_detection_old = """I will provide a dialogue between a user and a virtual assistant in a conversational search system. The assistant's role is to help the user refine their query by asking clarification questions. However, the user may sometimes want to abandon the conversation due to poor interaction quality, or proceed to search immediately without further clarification.

Your task is to infer the user's current intent based on their latest response. There are three possible outcomes:
1. If the user is engaging normally with the assistant, output "continue".
2. If the user wants to end the conversation, output "abandon".
3. If the user ignores a clarifying question and explicitly wants to search immediately with the last detected intent, output "search". 
4. If the user responds to the previously asked clarifying question then explicitly instructs to search, output "respond_and_search".

Be careful to output "search" or "respond_and_search" only when the user clearly indicates to search, such as "cherche maintenant", "... et c'est tout", "ne clarifie plus".

Output must be in JSON format with a single key named "intent". Do not include any explanations or extra text.
"""

cq_generation = """Given a conversation history and a list of relevant facets, generate a clarifying question in French that is coherent to the provided facets. The goal is to guide users to explore facets in a given database. 

Constraints:
- The generated clarifying question must be in French.
- Do not ask trivial or repetitive questions.
- Do not associate facets; treat them as independent.
- Only ask a clarifying question if it meaningfully advances the conversation based on the facets.
- Prefer questions that refine the user’s intent with greater specificity, without exceeding the scope of known content.
- The question must align with the conversation and guide exploration of existing knowledge in the database.

Output must be in JSON format with a single key named "clarifying_question". Generate without any verbosity.
"""

test = "Given the user query, guess the user intent. Be creative."

