from flask import (
    Blueprint, flash, g, redirect, render_template, render_template_string, request, session, url_for, jsonify, Response, stream_with_context
)

import os
import functools
from .utils.utils import *
from .utils.retriever import * 
from .llm.llm import call_nl2sru
from .llm.rag import knn

bp = Blueprint('module', __name__, url_prefix="/module")

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        loggedin, target_url = make_sure_loggedin()
        if not loggedin:
            return target_url 
        return f(*args, **kwargs)
    return decorated_function

#========== NL2SRU ==========
@bp.route("/nl2sru",methods=["GET"])
@login_required
def nl2sru():
    return render_template('module/nl2sru.html',**session)

@bp.route("/nl2sru/input",methods=["POST"])
@login_required
def user_input():
    query = request.form["user-input"]
    session["module_query"] = query
    rag_result = knn(query,1)
    if rag_result:
        topic = rag_result["topic"][0]
        sru_hint = rag_result["sru_statements"][0]
        # print('='*10)
        # print(topic)
        # print('-'*10)
        # print(sru_hint)
        # print('='*10)
    else:
        sru_hint = ""
    def generate():
        stream = call_nl2sru(query,sru_hint,stream_response=True)[1]
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    return Response(generate(), mimetype='text/plain')

@bp.route("/nl2sru/search",methods=["GET","POST"])
@login_required
def search():
    sru_query = request.args.get("query")
    result = retrieve_result_page(sru_query,session["module_query"])
    if isinstance(result,Exception):
        # print(str(result))
        return
    retrieval_result_wc, retrieval_result_woc = result
    return render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc)
#==========