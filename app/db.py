from flask import current_app
from flask_sqlalchemy import SQLAlchemy
import click
import os

db = SQLAlchemy()

def init_app(app):
    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + app.config["DATABASE"]
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
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
    # database_path = 'sqlite:///' + app.config["DATABASE"]
    if not os.path.isfile(app.config["DATABASE"]):
        # Create an empty database file if it does not exist
        open(app.config["DATABASE"], 'w').close()
