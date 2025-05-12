from flask import (
    Blueprint, flash, g, redirect, render_template, render_template_string, request, session, url_for, jsonify, Response, stream_with_context
)

import os
import functools
from .utils.utils import *
from .llm.llm import call_nl2sru

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
def user_input():
    query = request.form["user-input"]
    def generate():
        stream = call_nl2sru([query],stream=True)
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    return Response(generate(), mimetype='text/plain')

#==========