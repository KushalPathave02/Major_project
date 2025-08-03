from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

import database

app = Flask(__name__)
app.config['MONGO_URI'] = os.getenv('MONGO_URI')
database.init_app(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key')

# Middleware
allowed_origins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://loopr-1.onrender.com',
  'https://loopr.vercel.app'
]

CORS(app, origins=allowed_origins, supports_credentials=True)

# Health check route
@app.route('/')
def index():
    return 'Financial Analytics Dashboard API'

# Register blueprints
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.transactions import transactions_bp
from routes.export import export_bp
from routes.analytics import analytics_bp
from routes.messages import messages_bp
from routes.gemini import gemini_bp
from routes.settings import settings_bp
from routes.users import users_bp
from routes.wallet import wallet_bp

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(export_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(messages_bp)
app.register_blueprint(gemini_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(users_bp)
app.register_blueprint(wallet_bp)

from flask import send_from_directory

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
