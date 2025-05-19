from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Table, Column, Integer, JSON, MetaData, select, update, insert, delete, inspect, text
from sqlalchemy.engine import reflection
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from .db import db
from flask import current_app as app
from .utils.constant import admin_users, user_profile_keys

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    data = db.Column(db.JSON, nullable=False)

    def __init__(self,username,password,**kwargs):
        self.username = username
        self.data = {"raw_password":password}
        self.data.update(kwargs)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)


def fetch_user_table(user_id):
    table_name = f'user#{user_id}'

    # Use the existing db instance
    metadata = db.metadata
    engine = db.engine

    # Use SQLAlchemy inspector to check if the table exists
    inspector = reflection.Inspector.from_engine(engine)
    existing_tables = inspector.get_table_names()
    
    if table_name in existing_tables:
        # Reflect the existing table
        user_chat_history = Table(table_name, metadata, autoload_with=engine)
    else:
        # Define and create the new table
        user_chat_history = Table(
            table_name,
            metadata,
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('data', JSON, nullable=False)
        )
        user_chat_history.create(bind=engine, checkfirst=True)
    
    return user_chat_history

def list_chat_ids(user_id):
    table = fetch_user_table(user_id)
    stmt = select(table.c.id)
    
    with app.app_context():  
        with db.engine.connect() as connection:
            result = connection.execute(stmt)
            chat_ids = [row[0] for row in result]
    
    return chat_ids

def get_chat_content(user_id, chat_id):
    table = fetch_user_table(user_id)
    
    stmt = select(table.c.data).where(table.c.id == chat_id)
    
    with app.app_context():
        with db.engine.connect() as connection:
            result = connection.execute(stmt).fetchone()
    
    return result[0]

def fetch_last_chat_entry(user_id):
    table = fetch_user_table(user_id)
    
    stmt = select(table).order_by(table.c.id.desc()).limit(1)

    with app.app_context():
        with db.engine.connect() as connection:
            result = connection.execute(stmt).fetchone()  
            if result is None:
                return None, -1, {}
            return table, result[0], result[1] 
        
    print('Error SQLAlchemy database: failed to fetch last entry.')

def insert_chat_entry(user_id,chat_data):
    table = fetch_user_table(user_id)
    
    stmt = insert(table).values(data=chat_data)
    
    with app.app_context(): 
        with db.engine.connect() as connection:
            connection.execute(stmt)
            connection.commit()

    # with app.app_context():
    #     session: Session = db.session()
    #     try:
    #         session.execute(stmt)
    #         session.commit()
    #     except OperationalError as e:
    #         session.rollback()
    #         if "database is locked" in str(e):
    #             print("Database is locked. Retry or handle appropriately.")
    #         else:
    #             raise
    #     finally:
    #         session.close()

def update_chat_entry(user_id, updated_data):
    # Fetch the most recent chat entry
    table, last_entry_id, _ = fetch_last_chat_entry(user_id)

    stmt = (
        update(table)
        .where(table.c.id == last_entry_id)  
        .values(data=updated_data)
    )
    
    with app.app_context():
        with db.engine.connect() as connection:
            connection.execute(stmt)
            connection.commit()

def delete_chat_entry(user_id,chat_id):
    table = fetch_user_table(user_id)

    delete_stmt = delete(table).where(table.c.id == chat_id)
    
    with db.engine.connect() as connection:
        connection.execute(delete_stmt)
        connection.commit()

def save_conv(user_id,first_input,chat_history,status="ongoing",user_intent=""):
    if first_input:
        insert_chat_entry(user_id,{"status":status,"chat_mode":"respond","chat_history":chat_history,"user_intent":user_intent})
    else:
        update_chat_entry(user_id,{"status":status,"chat_mode":"respond","chat_history":chat_history,"user_intent":user_intent})

def create_user(username,password,user_profile_data):
    new_user = User(
        username=username,
        password=password,
        **user_profile_data
    )
    new_user.set_password(password) 

    db.session.add(new_user)
    db.session.commit()

def update_user(user,user_profile_data):
    for ky, val in user_profile_data.items():
        user.data[ky] = val
    flag_modified(user,'data')
    db.session.commit()

def operate_on_users(selected_user_ids,action):
    selected_users = User.query.filter(User.id.in_(selected_user_ids)).all()

    if action in ['delete','promote','reset']:
        if action == 'delete':
            inspector = inspect(db.engine)
            all_table_names = inspector.get_table_names()
            metadata = MetaData()

            for user in selected_users:
                db.session.delete(user)

                if f'user#{user.id}' in all_table_names:
                    chat_data_table = Table(f'user#{user.id}',metadata,autoload_with=db.engine)
                    chat_data_table.drop(db.engine)
        elif action == 'promote':
            for user in selected_users:
                user.data["permission_level"] = 1
                flag_modified(user, "data")
        elif action == 'reset':
            for user in selected_users:
                for ky in user_profile_keys:
                    if ky in user.data:
                        del user.data[ky]
                user.data['profile_created'] = False
                flag_modified(user, "data")
        db.session.commit()

def get_all_users_with_chats():
    inspector = inspect(db.engine)
    all_users = User.query.all()

    users_with_chats = []

    for user in all_users:
        chat_table_name = f"user#{user.id}"
        
        if chat_table_name in inspector.get_table_names():
            query = text(f"SELECT COUNT(*) FROM `{chat_table_name}`")
            result = db.session.execute(query).scalar()
            if result > 0:  
                users_with_chats.append(user)
    
    return users_with_chats