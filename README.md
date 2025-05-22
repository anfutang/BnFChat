### Commands
* Create conda environment:
```
conda env create -f environment.yaml 
```

* Run the app:
flask --app flaskr init-db (if necessary, to initialize the sql database: instance/flaskr.sqlite. This will delete user data, no need to manually delete the sqlite file.) 
flask --app v2 run --debug


### How to start
1. Launch LLM instance on gpu cluster (the following command will launch 3 nodes on "edwards"): 
    conda activate llm-api
    sbatch launch_llm_instance.sh 
2. Set ssh tunnel to forward local ports to remote ports of llm servers (should run one command for each LLM instance):  
    Start-Process "ssh" -ArgumentList "-o ServerAliveInterval=60 -o ServerAliveCountMax=10 -N llm-instance-1" -NoNewWindow
3. Make sure the LLM instance is correctly started (e.g. for the first LLM instance).
    curl http://localhost:8001 
4. Run the Flask application
    .venv\Scripts\activate
    flask --app main clear-db (if necessary; will clear all existing data)
    flask --app main init-db (if necessary; will initialize the SQLAlchemy database)
    flask --app main run --debug
    (url: http://127.0.0.1:5001/auth/login)

### About the Application
1. 1st RAG:
    python3 script/precompute_minhash.py
    python3 script/build_lsh_index.py

##### Key Logics
1. The "session" Flask variable is used to save temporary chat history. There are five key variables: 
    - chat_mode: the selected chat type using the green dropdown list. ("select", "respond" or "select+respond").
    - user_input: user input through the input area at the bottom of the interface.
    - responses: LLM responses, either be a string ("respond" mode) or a list of strings ("select" or "select+respond" mode). 
    - selected_response: the selected reformulated query (RQ,"select") / clarification question (CQ,"select+respond") from the LLM's responses. 
    - chat_history: the application will save the chat history as the conversation goes.
    - eval_metrics: user's evaluation form submission through checkboxes, and the evaluation metrics is defined in utils.constant.eval_metrics
2. Definition of a conversation turn
    * For all chat modes, once the user submits the evaluation form, a "turn" ends. 
    - "select": except for the initial query input (user input), each turn consists of: LLM response + user evaluation.
    - "respond" & "select+respond": each turn consists of: user input + LLM response + user evaluation.
3. At the end of each turn
    * "session" variables are cleared after each turn, except for global variables that should be used across different chat sessions. Global variables are defined in utils.constant.user_global_keys. THE REASON to clear session variables is to show only the chat history when a turn ends & some logics are based on if certain variables exist in session (e.g. if the user does not select a RQ / CQ, it should be forbidden to submit evaluations, this if statement is based on if "selected_response" exists in "session"). When the user is filling the evaluation form, the html template is rendered with 'user_input', 'responses' and 'chat history'. After each turn, user evaluations are collected and the chat history is updated. If 'user_input' and 'responses' are kept, user input and LLM responses from the last turn will be shown twice.
    - "select": "session" cleared and the last selected RQ is used as user input for the next turn; input area is disabled after the first input (initial query).
    - "respond" & "select+respond": "session" cleared and wait for the next user input (the user responses to the clarification question).