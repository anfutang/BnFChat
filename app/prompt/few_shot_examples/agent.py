ambiguity_detection = """
Input: 
"""

rac_fs_examples = """
#Conversation:
User: flaubert
Assistant: cherchez-vous Gustave Flaubert ?
User: oui.
Assistant: Quel document cherchez-vous de Flaubert ?

#Relevant facets:
1. Flaubert et la biographie
2. la biographie de Flaubert
3. Flaubert et ses œuvres littéraires

#Reasoning: The user is interested in biography of Flaubert. The relevant facets cannot provide more detailed informaiton, therefore it is impossible to further clarify.
#Output: {"conclusion":"no","clarifying_question":""}

#Conversation:
User: impact de victor hugo sur la littérature

Relevant facets:
1. victor hugo et son influence
2. victor hugo et ses influences littéraires
3. victor hugo - influence sur d'autres auteurs
4. victor hugo - influence sur la musique
5. victor hugo et ses réflexions sur la littérature

#Reasoning: The user seeks Victor Hugo's influence on literature, which is facetted and could be reflected by certain facets in the provided list such as influence on music or influence on other authors. It is therefore possible to further clarify.
#Output: {"conclusion":"yes","clarifying_question":"Souhaitez-vous explorer comment Victor Hugo a influencé d'autres auteurs ou vous intéresser à ses réflexions sur la littérature en général ?"}

#Conversation:
User: influence de Voltaire dans la littérature française

#Relevant facets: 
1. voltaire et la littérature française
2. voltaire et la littérature
3. voltaire et ses œuvres littéraires
4. voltaire et son influence
5. voltaire et son influence dans l'art

#Reasoning: The user searches information about Voltaire's influence on French literature, which corresponds exactly to the first provided facet. No more specific facets exist, and "Influence dans l'art" is not coherent to the conversation, therefore it is impossible to further clarify. 
#Output: {"conclusion":"no","clarifying_question":""}
"""