import sqlite3
import os
from flask import g, current_app

def get_rag_db():
    if 'db' not in g:
        db_path = os.path.join(current_app.instance_path, "kv_mapping.db")
        g.db = sqlite3.connect(db_path)
    return g.db

def close_rag_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()
