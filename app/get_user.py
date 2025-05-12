from sqlalchemy import create_engine, MetaData, Table, select, delete

# Define the database URL
DATABASE_URL = 'sqlite:///../instance/flaskr.sqlite'

# Create engine
engine = create_engine(DATABASE_URL)

# Create a MetaData instance
metadata = MetaData()

# Reflect the 'user' table
user_table = Table('user', metadata, autoload_with=engine)

# Create a connection to execute queries
with engine.connect() as connection:
    # Example: Select all columns from the 'user' table where username is 'desired_username'
    stmt = select(user_table).where(user_table.c.username == 'FloZ')
    
    # Execute the query
    result = connection.execute(stmt)
    # connection.commit()
    # # Fetch the first result
    user = result.fetchone()
    
    # # Check if user exists and print details
    if user:
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
    else:
        print("User not found.")