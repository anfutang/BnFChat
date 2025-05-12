from flask import session
import time

demo_llm_responses = {"select": {1:["Je cherche des informations nutritionnelles sur le kiwi.",
                                    "Je souhaite consulter des recettes incluant le kiwi.",
                                    "Je cherche des livres sur la culture et l'histoire du kiwi.",
                                    "Je cherche des documents détaillant le kiwi en tant qu'oiseau.",
                                    "Je veux en savoir plus sur la culture de kiwi."],
                                 2:["Je cherche des livres traitant de la culture du kiwi dans différents pays.",
                                    "Je veux trouver des études sur la production du kiwi.",
                                    "Je cherche des ressources sur l'impact économique de la production du kiwi.",
                                    "Je veux des informations sur les variétés de kiwi et leur culture.",
                                    "Je veux trouver des documents sur l'histoire et l'origine de kiwi."]},
                      "respond": {1:["cherchez-vous des informations sur le kiwi en tant que fruit ou en tant qu'animal ?"],
                                  2:["cherchez-vous des ouvrages sur la culture et l'histoire du kiwi ?"],
                                  3:["Voulez-vous des livres qui traitent spécifiquement de l'histoire du kiwi, de ses origines ?"],
                                  4:["Souhaitez-vous des livres académiques, des ouvrages de vulgarisation ou des livres pratiques sur la culture du kiwi et ses origines?"]},
                      "select+respond": {1:["Cherchez-vous des livres ou des articles sur la culture du kiwi fruit ?",
                                            "Avez-vous besoin d'informations sur l'histoire et l'origine du kiwi fruit ?",
                                            "Avez-vous besoin d'informations sur l'achat ou la conservation du kiwi ?",
                                            "Être-vous à la recherche de recettes qui utilisent des kiwis comme ingrédient ? ",
                                            "Souhaitez-vous des informations sur les bienfaits nutritionnels du kiwi ?"],
                                         2:["Voulez-vous des récits ou des études sur l'impact économique ou culturel du kiwi ?",
                                            "Recherchez-vous des livres sur l'histoire du kiwi dnas un certain pays ou région ?",
                                            "Être-vous intéressé par des ressources qui traitent du développement du kiwi au fil du temps ?",
                                            "Préférez-vous des informations générales ou des études détaillées sur l'origine du kiwi ?",
                                            "Quel type de document préférez-vous ? un livre, un article ou une étude académique ?"]}}

def fetch_demo_llm_responses():
    chat_mode = session["chat_mode"]
    time.sleep(2)
    if session["first_input"]:
        session["tutorial_turn"] = 1
        return demo_llm_responses[chat_mode][1]
    else:
        tutorial_turn = session["tutorial_turn"]
        tutorial_turn += 1
        session["tutorial_turn"] = tutorial_turn
        return demo_llm_responses[chat_mode][tutorial_turn]