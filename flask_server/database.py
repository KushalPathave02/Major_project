from flask import current_app, g
from pymongo import MongoClient

def get_db():
    if 'db' not in g:
        client = MongoClient(current_app.config['MONGO_URI'])
        g.db = client.get_default_database()
    return g.db

def init_app(app):
    app.config['MONGO_URI'] = app.config.get('MONGO_URI', 'mongodb://localhost:27017/financial_analytics')
