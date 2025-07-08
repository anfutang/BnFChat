from flask import current_app
from flask_sqlalchemy import SQLAlchemy
import click
import os
import sqlite3
import datetime
from .utils.constant import DEFAULT_USERS

db = SQLAlchemy()

def init_app(app):
    # Generate a new database path with timestamp for each run
    # timestamp = "20250603"
    #timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S") # for production and keep previous experiments
    db_dir = app.instance_path
    db_file = f"bnfchat.sqlite"
    db_path = os.path.join(db_dir, db_file)
    
    # Update database configuration with the new path
    app.config['DATABASE'] = db_path
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    # Ensure database and tables exist on startup
    with app.app_context():
        ensure_database_exists(app)
        db.create_all()
        
        # Create default users
        create_default_users()
    
    app.cli.add_command(init_db_command)
    app.cli.add_command(clear_db_command)

def create_default_users():
    """Create default users for testing"""
    # Import locally to avoid circular imports
    from .models import User
    
    # Check if users already exist in this database
    if User.query.count() > 0:
        current_app.logger.info("Users already exist, skipping default user creation")
        return
    
    # Create users using a list of default users
    for user_data in DEFAULT_USERS:
        username = user_data.get('username')
        password = user_data.get('password')
        permission_level = user_data.get('permission_level')
        profile_created = user_data.get('profile_created', False)
        save_password_in_plain_text = user_data.get('save_password_in_plain_text', False)
        # Create user with appropriate permissions
        new_user = User(
            username=username, 
            password=password,
            permission_level=permission_level,
            profile_created=profile_created,
            save_password_in_plain_text=save_password_in_plain_text
        )
        db.session.add(new_user)
    
    # Commit to database
    db.session.commit()
    current_app.logger.info(f"Created {len(DEFAULT_USERS)} default users")

@click.command('init-db')
def init_db_command():
    with current_app.app_context():
        db.create_all()
    click.echo('Initialized the database.')

@click.command('clear-db')
def clear_db_command():
    with current_app.app_context():
        db.drop_all()
        click.echo('Cleared the database.')

def ensure_database_exists(app):
    # Check if database directory exists
    db_dir = os.path.dirname(app.config["DATABASE"])
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    # Create database file if it doesn't exist
    if not os.path.isfile(app.config["DATABASE"]):
        open(app.config["DATABASE"], 'w').close()
        
    # Quick check if database is properly initialized
    try:
        conn = sqlite3.connect(app.config["DATABASE"])
        conn.close()
        return True
    except sqlite3.Error as e:
        click.echo(f"Database error: {e}")
        return False