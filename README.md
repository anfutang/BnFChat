# 🌼 BnFChat

## Table of Contents
- [Background](#Background)
- [Deployment](#Deployment)
- [Miscellaneous](#Miscellaneous)
- [License](#license)

---

## Background
BnFChat fulfills a conversational search system that could be used to better precise your search using [Gallica](https://gallica.bnf.fr/accueil/fr/) (numeric library of BnF): 

🔧 BnFChat provides two functionalities:
- Conversation in natural language (French only) to better understand user intent
- Once the conversation terminates, convert the user intent to a SRU query (used by Gallica). This actually replaces [Advanced Search](https://gallica.bnf.fr/services/engine/search/advancedSearch/) by a chatbot. The conversion could also be more precise than that of Advanced Search.

BnFChat is designed to handle two problems, with two modes implemented correspondingly: 
- User queries could be ambiguous (`chat` to better understand user intent)
- Automatic conversion between user intent in natural language and SRU (`search` to correct or refine SRU translation).

This project leverages prompt graph composition to organize and connect multiple prompt modules. A vector database is also used for the RAG part. For backend details, refer to [Backend](app/README.md). For frontend details, refer to [Frontend](frontend/README.md).

💡 We used OpenAI API (for LLM calls) and [Gallica Search API](https://api.bnf.fr/fr/api-gallica-de-recherche) (to retrieve from Gallica using SRU) in this project.

---

## Deployment
Before running this project, make sure you have installed:

- [Node.js](https://nodejs.org/) (comes with **npm**)
- [Gunicorn](https://gunicorn.org/) (for running the Python backend)

Install requirements:
```
conda env create -f environment.yaml 
```

or

```
pip install -r requirements.txt
```

👉 Local deployment
1️⃣ (Terminal 1)
```
cd frontend
npm start
```

2️⃣ (Terminal 2)
```  
cd BnFChat
python main.py
````

👉 Production deployment (e.g. deployment on the port 6000)
1️⃣ Frontend build:

```
cd BnFChat-v2/frontend
npm run build
cd ..
```
2️⃣ (if needed) Kill previous version:
```
kill -9 $(lsof -t -i:6000)
```

3️⃣ (if needed) Activate Python environment:
```
source envs/bnfchat/bin/activate
```

4️⃣ Launch the Gunicorn worker process
```
FLASK_ENV=production gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:6000 --access-logfile access.log --error-logfile error.log -D wsgi:app 
```
✅ The application should be successfully deployed after this step.


5️⃣ (if needed) Local concurrency test
```
python -u  main.py > main.log 2>&1 
cd frontend/app_test/
node test.js
```
Test if the system could response to concurrent requests (check main.log under the main directory). 

⚠️ This project ***IS NOT*** built to handle high levels of concurrency (>50 users).

---

## Miscellaneous
🔴 Rate limits of Gallica
All SRU queries are sent to Gallica from the backend, since we cannot change to send requests from the frontend to Gallica due to CORS limitation (*"Access to fetch ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource."*)

Since the Gallica API imposes rate limits, the system's concurrency is limited by these restrictions.

🟢 Several examples to test (search mode "Recherche"):
- bandes dessinés Astérix
- portrait d'une bourgeoise sous Louis XVI
- carte aquitaine au 19ème siècle
- critiques sur Madame Bovary
- septième croisade de Saint Louis (you could further instruct LLMs to change "septième" by "7e" after the first translation)

---

## License 
This project is licensed under the [MIT License](LICENSE).