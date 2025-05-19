from .few_shot_examples.module import conv_summarization_fs_examples

conv_summarization_fs_examples = """

"""

examples = """
Query: Je cherche un biographie de Flaubert.

#Reason: The user query focuses on biographies of Flaubert, the author is therefore not necessarily Flaubert himself, so dc.creator should not be used. The keyword "Flaubert" should appear in both dc.title and dc.subject. The document type corresponding to a biography should be "monographie".
#Field: dc.title, dc.subject.
#SRU-like: dc.title adj flaubert, dc.subject adj flaubert
#SRU: dc.title adj flaubert and dc.subject adj flaubert

Query: Je veux des peintures de Jongkind.

#Reason: The user query focus on paintings of Jongkind, the author should therefore be Jongkind and the target document type should be "image". Other fields like dc.subject and dc.date are not involved.
#Field: dc.creator, dc.type.
#SRU-like: dc.creator adj jongkind, dc.type adj image
#SRU: dc.creator adj jongkind and dc.type adj image

Query: Je cherche Le Figaro avant l'année 1900.

#Reason: Since Le Figaro is a newspaper, therefore dc.type should be "fascicule", and "le figaro" must appear in dc.title. Before the year of 1900 sets a time period of searching, gallicapublication_date should be used.
#Field: dc.title, dc.type, gallicapublication_date.
#SRU-like: dc.title adj "le figaro" and (dc.type adj fascicule) and (gallicapublication_date <= "1900")
#SRU: dc.title adj "le figaro" and (dc.type all "fascicule") and (gallicapublication_date <= "1900")
"""

nl2sru = f"""Task: Convert the following French natural language query into an SRU query.

Format:
- Allowed Dublin Core fields: dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject, text (for exact text matches), and gallicapublication_date (for specifying date conditions).
- Allowed values for dc.type: monographie, manuscrit, carte, image, fascicule, sonore, partition, objet, video.

Rules:
- For entities (e.g., names, titles), use the adj operator with quotation marks, e.g., dc.creator adj "Flaubert", dc.title adj "Le Figaro".
- For date constraints (typically years), use gallicapublication_date, e.g., gallicapublication_date < "1900". Always enclose the date in quotation marks.
- For topic-related queries, use the provided SRU queries hint as a reference. Choose SRU queries that are coherent with your reasoning as suggestions. 
- Use dc.type and dc.date only when the user query directly concerns date or type conditions.
- Ensure the generated SRU query is clear and human-readable, even for people without prior knowledge of the documents.

Steps:
#Reason: Analyze the user query - whether it requires operation directly on Dublin Core fields or topic-related. Then identify main keywords and named entities (e.g., authors, titles, topics).
#Field: Assign appropriate Dublin Core fields to each identified term.
#SRU-like: Write individual SRU-compatible statements without logical connectors. Use SRU query hint as reference and revise it if necessary.
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

test = "Given the user query, guess the user intent. Be creative."

