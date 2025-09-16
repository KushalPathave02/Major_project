from flask import current_app, g
from pymongo import MongoClient
import os

def get_db():
    if 'db' not in g:
        client = MongoClient(current_app.config['MONGO_URI'])
        db = None
        try:
            # Works only if the URI includes a database name (e.g., .../financial_analytics)
            db = client.get_default_database()
        except Exception:
            db = None

        if db is None:
            # Fall back to an explicit DB name if not provided in the URI
            db_name = (
                current_app.config.get('MONGO_DB_NAME')
                or os.getenv('MONGO_DB_NAME')
                or 'financial_analytics'
            )
            db = client[db_name]

        g.db = db
    return g.db

def init_app(app):
    app.config['MONGO_URI'] = app.config.get('MONGO_URI', 'mongodb://localhost:27017/financial_analytics')
    # Optional explicit DB name if URI doesn't include one
    app.config['MONGO_DB_NAME'] = app.config.get('MONGO_DB_NAME', os.getenv('MONGO_DB_NAME', 'financial_analytics'))
