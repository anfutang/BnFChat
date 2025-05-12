from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)

from datetime import datetime

import functools

from .db import db
from .models import *

from .utils.utils import *
from .utils.constant import *
from .utils.self_host_llm import *

bp = Blueprint('admin', __name__, url_prefix="/admin")

def admin_level_check(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        blocked, target_url = block_non_admin_connections()
        if blocked:
            return target_url 
        return f(*args, **kwargs)  
    return decorated_function

@bp.route('/')
@admin_level_check
def index():
    return render_template('admin/index.html', username=session['username'])

@bp.route('/profile')
@admin_level_check
def profile():
    users = User.query.all()
    if session["permission_level"] < 2:
        users = [user for user in users if user.username in visible_users]
    return render_template('admin/option/profile.html', users=users)

@bp.route('/profile/<int:user_id>',methods=['GET'])
@admin_level_check
def user_info(user_id):
    user = User.query.get_or_404(user_id)
    if session["permission_level"] >= 2:
        user_data = {k:v for k,v in user.data.items() if k not in ["permission_level"] and v is not None}
        user_data["user_id"] = user.id
    else:
        user_data = {k:v for k,v in user.data.items() if k not in ["permission_level", "avatar-seed", "raw_password"] and v is not None}
    return jsonify(user_data)

@bp.route('/create_users',methods=['POST'])
@admin_level_check
def create_users():
    try: 
        form = request.get_json()
        lower_bound = form.get('lowerBound')
        upper_bound = form.get('upperBound')
        password_length = form.get('passwordLength')
    except:
        return {'status':'failure','html':None}
    
    for ix in range(lower_bound,upper_bound+1):
        username = f'bnf-scai-{ix}'
        password = generate_password(password_length)
        user_profile_data = {'profile_created':False, 'permission_level':admin_users.get(username,0)}
        create_user(username,password,user_profile_data)

    users = User.query.all()
    return {'status':'success','html':render_template('admin/option/updated_user_list.html',users=users)}

@bp.route('/profile/operation',methods=['POST'])
@admin_level_check
def profile_operation():
    try: 
        data = request.get_json()
        action = data.get('action')
        selected_user_ids = data.get('selectedUserIds')

        operate_on_users(selected_user_ids,action)

        return {'status':'success'}
    except:
        return {'status':'failure'}

@bp.route("/chat_history")
@admin_level_check
def chat_history():
    users = get_all_users_with_chats()
    if session["permission_level"] < 2:
        users = [user for user in users if user.username in visible_users]
    return render_template('admin/option/chat_history.html',users=users)
    
@bp.route('/chat_history/<int:user_id>')
@admin_level_check
def get_user_chats(user_id):
    chat_ids = list_chat_ids(user_id)
    return jsonify(chat_ids=chat_ids)

@bp.route('/chat_history/<int:user_id>/<int:chat_id>')
@admin_level_check
def fetch_chat_content(user_id,chat_id):
    chat_data = get_chat_content(user_id,chat_id)
    chat_mode = chat_data["chat_mode"]

    return render_template(f'/admin/chat/{chat_mode}_full_page.html',chat_data=chat_data)

@bp.route('/chat_history/delete_chat/<int:chat_id>', methods=['POST'])
@admin_level_check
def delete_chat(chat_id):
    user_id = session["user_id"]
    delete_chat_entry(user_id,chat_id)
    return redirect(url_for('admin.chat_history'))

# @bp.route("/new_chat")
# @admin_level_check
# def new_chat():
#     if "chat_mode" not in session:
#         # by default chat type is set to "select+respond"
#         session["chat_mode"] = "select+respond"
#     clear_session(user_global_keys)
#     return render_template(get_chat_template('admin'),**session)

# # the user selects the chat type: cannot change chat type in the middle of conversation; must "clear" than select the desired chat type from a dropdown list.
# @bp.route("/change_chat_mode",methods=['POST'])
# @admin_level_check
# def change_chat_mode():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     if not session.get('user_input','') and not session.get("chat_history",[]):
#         session["chat_mode"] = request.form['chat_mode']
#         return render_template(get_chat_template('admin'),**session)
#     else:
#         flash("⛔️Impossible de changer le type de conversation pendant une conversation. Cliquez d'abord sur 'Effacer'.")
#         return render_template(get_chat_template('admin'), **session)

# # the user inputs the initial query or responds to a CQ ("response" or "select+respond" mode) through the input box at the bottom.
# @bp.route("/user_input",methods=['POST'])
# def user_input():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     session["user_input"]= request.form["user_input"]
#     llm_responses = interact_with_llm(session)
#     session["responses"] = llm_responses
#     if session["chat_mode"] == "respond":
#         session["selected_response"] = llm_responses
#     return render_template(get_chat_template('admin'),**session)

# # the user selects the best RQ ("select") / CQ ("select+respond")
# @bp.route("/annotate",methods=['POST'])
# def annotate():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     session["selected_response"] = request.form.get('selected_response','')
#     return render_template(get_chat_template('admin'),**session)

# # the user submits the evaluation form of the current turn, and the current turn finishes.
# @bp.route('/submit_evals', methods=['POST'])
# def submit_evals():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     chat_type = session["chat_mode"]
#     if chat_type in ["select","select+respond"]:
#         if 'selected_response' not in session:
#             flash(f"Must choose a {chat_type_to_show_text[chat_type]}.")
#             return render_template(get_chat_template('admin'),**session)

#     collect_evaluations(request.form)
#     update_chat_history()
    
#     # only for "select", submitting the evaluation form is equivelant to responding.
#     if chat_type == "select":
#         session["responses"] = interact_with_llm(session)
#         for ky in ["user_input","selected_response"]:
#             if ky in session:
#                 session.pop(ky)
#     else:
#         clear_session(user_global_keys+["chat_history"])
    
#     return render_template(get_chat_template('admin'),**session)

# # the user chooses to clear chat history, maybe due to: (1) typing error; (2) do not want to save current chat. 
# @bp.route("/clear_chat")
# def clear_chat():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     clear_session(user_global_keys)
#     return redirect(url_for("admin.new_chat"))

# @bp.route("/try_submission",methods=['POST'])
# def try_submission():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     if 'chat_history' not in session:
#         return jsonify({'message':"⚠️Il semble que vous n'ayez pas fait d'évaluation. Si vous souhaitez recommencer la conversation, appuyez sur 'Effacer'.",'status':'error'})
#     else:
#         return jsonify({'message':"",'status':'success'})
    
# @bp.route("/terminate_session",methods=['POST'])
# def terminate_session():
#     blocked, target_url = block_non_admin_connections()
#     if blocked:
#         return target_url
#     try:
#         user_id = session["user_id"]
#         chat_data = {"timestamp":datetime.now().strftime('%Y-%m-%d %H:%M:%S'),"username":session["username"],"chat_history":session["chat_history"],
#                         "user_comment":request.form["comment"]}
#         insert_chat_entry(user_id,chat_data)
#         return jsonify({'message':'✅Votre conversation a été enregistrée avec succès.','status':'success'})
#     except Exception as e:
#         return jsonify({'message':e,'status':"error"})
