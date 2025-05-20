from flask import current_app
from flask_sqlalchemy import SQLAlchemy
import click
import os
import sqlite3

db = SQLAlchemy()

def init_app(app):
    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + app.config["DATABASE"]
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    # Ensure database and tables exist on startup
    with app.app_context():
        ensure_database_exists(app)
        db.create_all()
    
    app.cli.add_command(init_db_command)
    app.cli.add_command(clear_db_command)

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