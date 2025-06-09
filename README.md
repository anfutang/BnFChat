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

##### Local concurrency test
```
cd frontend/app_test/
python -u  main.py > main.log 2>&1 
node test.js
```