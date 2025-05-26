from .few_shot_examples.agent import rac_fs_examples

ambiguity_detector = """Given a French query, reason following the given steps sequentially and execute the corresponding action if the condition is satisfied. 

#Step 1. If the query is incoherent, heavily misspelled, or incomprehensible, generate a clarification question asking the user to rephrase. Return only the clarification question without verbosity.

#Step 2. Extract entities from the user query and normalize them given the context. In case of ambiguity in entity normalization (e.g., a common person name), call the function entity_verification() with two arguments: entity as the most focused entity in the query; entity_type as the corresponding entity type.

#Step 3. Since the query is completely comprehensible, unambiguous in terms of entity normalization, call the functino nl2sru() with the input query as the argument to convert it to a search engine-compatible SRU query.
"""

ambiguity_detection_old = f"""Given a conversation, summarize first the conversation using a reformulated query. Analyze then whether the user query has a clear focus on specific entities and whether the Dublin Core roles for each entity can be deduced without ambiguity. Follow the following steps: 

1. Attempt entity recognition and normalization. If entity recognition or normalization fails, conclude "no" and generate a French clarifying question correspondingly. The generated question should focus on the ambiguous entity mention and should propose a highly possible normalized entity related to it. Ask the user to clarify without any suggestion only when you have no clue about the entity.
2. Attempt to convert the user query to a SRU query using the following Dublin Core fields: dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject. If ambiguity exists in assigning Dublin Core roles to a certain entity, conclude "no" and generate a French clarifying question correspondingly. The generated question should focus on resolving ambiguity in Dublin Core roles of entities.
3. Conclude "yes".

Important: Focus only on entity recognition, normalization or Dublin Core assignment. NEVER ask clarifying questions about facets.

Generate in the following order:
# Summarize the conversation.
# Reason following the three steps above.
# Reasoning conclusion: "yes" or "no".
# Clarifying question: if the conclusion is "no", ensure the clarifying question is in French. Leave it blank if the conclusion is "yes".

Your output should be json-formatted with "conclusion" and "clarifying_question" as keys.
"""

ambiguity_detection = f"""Given a conversation, analyze then whether the user query is ambiguous in terms of entity recognization and normalization. Ask a clarifying question if the entity involved is ambiguous. Typical scenarios of entity ambiguity:

- the user inputs an incomplete person name.
- the user inputs a partial title.
- the user query is not readable or does not have a clear focus.

If you fail to identify the entity that the conversation focuses on, conclude "yes" and generate a clarifying question in French correspondingly. Otherwise, conclude "no" and leave the clarifying question blank.

Important: NEVER ask clarifying questions about facets. Your task is only to disambiguate entities.

Your output should be json-formatted with "conclusion" and "clarifying_question" as keys.
"""

relevance_checker = """You are a virtual assistant in a RAG system. Given a user intent and a list of candidate facets retrieved from a domain database, determine if any facets are truly coherent with the intent. While facets are retrieved via semantic similarity, some may be off-topic or contradictory. Remove irrelevant facets, but keep as much as facets that are diverse and relevant.

You may provide reasoning, but be concise — no extra verbosity.

Return a JSON with:
- conclusion: "yes" if at least one facet is coherent, otherwise "no"
- relevant_facets: a list of distinct, coherent facets ranked in descending order of relevance (most relevant first); remove redundant facets; return an empty list if no coherent facet is found.
"""

clarification_checker = f"""Given a conversation and a list of independent facets from a domain-specific database, assess whether the user intent can be further clarified. If so, output "conclusion": "yes" and return facets that could be used for further clarification. If not, output "conclusion": "no" and leave the list of facets empty.

Your output must be JSON-formatted with two keys: "conclusion" and "useful_facets".
"""

test = f"""Refer to the following examples for guidance:
{rac_fs_examples}"""
