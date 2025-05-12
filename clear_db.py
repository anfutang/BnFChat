from sqlalchemy import Table, MetaData
from sqlalchemy import create_engine

engine = create_engine('sqlite:///instance/flaskr.sqlite')

# Initialize metadata
metadata = MetaData()

# Reflect the 'user' table from the database
user_table = Table('user', metadata, autoload_with=engine)

# Drop the 'user' table
user_table.drop(engine)

# Optionally, you can also check if the table exists before dropping
if engine.dialect.has_table(engine, 'user'):
    user_table.drop(engine)
else:
    print("Table 'user' does not exist.")
