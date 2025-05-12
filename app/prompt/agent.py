ambiguity_detector = """Given a French query, reason following the given steps sequentially and execute the corresponding action if the condition is satisfied. 

#Step 1. If the query is incoherent, heavily misspelled, or incomprehensible, generate a clarification question asking the user to rephrase. Return only the clarification question without verbosity.

#Step 2. Extract entities from the user query and normalize them given the context. In case of ambiguity in entity normalization (e.g., a common person name), call the function entity_verification() with two arguments: entity as the most focused entity in the query; entity_type as the corresponding entity type.

#Step 3. Since the query is completely comprehensible, unambiguous in terms of entity normalization, call the functino nl2sru() with the input query as the argument to convert it to a search engine-compatible SRU query.
"""

ambiguity_detection = f"""Given a conversation, summarize first the conversation using a reformulated query. Analyze then whether the user query has a clear focus on specific entities and whether the Dublin Core roles for each entity can be deduced without ambiguity. Follow the following steps: 

1. Attempt entity recognition and normalization. If entity recognition or normalization fails, conclude "no" and generate a French clarifying question correspondingly. The generated question should focus on the ambiguous entity mention and should propose a highly possible normalized entity related to it. Ask the user to clarify without any suggestion only when you have no clue about the entity.
2. Attempt to convert the user query to a SRU query using the following Dublin Core fields: dc.title, dc.creator, dc.contributor, dc.date, dc.type, dc.subject. If ambiguity exists in assigning Dublin Core roles to a certain entity, conclude "no" and generate a French clarifying question correspondingly. The generated question should focus on resolving ambiguity in Dublin Core roles of entities.
3. Conclude "yes".

Important: Focus only on entity recognition, normalization or Dublin Core assignment. NEVER ask clarifying questions about facets.

Generate in the following order:
# Summarize the conversation if more than one turn.
# Reason following the three steps above.
# Reasoning conclusion: "yes" or "no".
# Clarifying question: if the conclusion is "no", ensure the clarifying question is in French. Leave it blank if the conclusion is "yes".

Your output should be json-formatted with "conclusion" and "clarifying_question" as keys.
"""

relevance_checker = """You are a virtual assistant in a RAG system. Given a conversation history and a list of potentially relevant facets from a domain database. Since these facets are retrieved based on semantic similarity, it is possible that they are not coherent with the conversation history. Your task is to check first if the provided facets are relevant. If none of the provided facets are relevant, conclude with "irrelevant". Otherwise, find the facet that best corresponds to the current user intent and return the index of the facet. Your output should be JSON-formatted with two keys:

- conclusion: {relevant / irrelevant}
- relevant_facet_id: {facet_id}

Avoid any verbosity in the generation.
"""

rac = """Given a conversation history and a list of potentially relevant facets from a domain database, determine whether it is possible that the user focus on a specific facet from the provided list based on the conversation. If it is possible, conclude "yes" and generate a clarifying question correspondingly. Otherwise, conclude "no". Your output should be JSON-formatted with two keys: "conclusion" and "clarifying_question". Leave "clarifying_question" blank if the conclusion is "no". Avoid any verbosity in the generation.
"""

