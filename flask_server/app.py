from flask import Flask, jsonify
from flask_cors import CORS
from flask_mail import Mail
import os
from dotenv import load_dotenv

load_dotenv()

import database

app = Flask(__name__)
app.config['MONGO_URI'] = os.getenv('MONGO_URI')
database.init_app(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key')

# Mail configuration (use free Gmail SMTP for dev). Set these in .env
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER', '')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('EMAIL_USER', ''))

mail = Mail(app)

# Middleware
allowed_origins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://loopr-1.onrender.com',
  'https://loopr.vercel.app'
]

# If a public base URL is set (e.g., http://192.168.1.60:5000),
# also allow that origin and its :3000 counterpart for the client.
public_base = os.getenv('APP_PUBLIC_BASE_URL')
if public_base:
    allowed_origins.append(public_base)
    try:
        # Derive LAN host to allow :3000 frontend
        import urllib.parse as _urlparse
        parsed = _urlparse.urlparse(public_base)
        if parsed.scheme and parsed.hostname:
            allowed_origins.append(f"{parsed.scheme}://{parsed.hostname}:3000")
    except Exception:
        pass

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
from routes.forecast import forecast_bp

# Initialize blueprints with database connection
from database import get_db as get_db_func
from routes.forecast import init_app as init_forecast
init_forecast(get_db_func)

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
app.register_blueprint(forecast_bp)

from flask import send_from_directory

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # Prefer explicit APP_HOST, otherwise derive from APP_PUBLIC_BASE_URL, else 0.0.0.0
    host = os.environ.get('APP_HOST')
    if not host:
        base = os.environ.get('APP_PUBLIC_BASE_URL')
        if base:
            try:
                import urllib.parse as _urlparse
                _p = _urlparse.urlparse(base)
                host = _p.hostname or '0.0.0.0'
            except Exception:
                host = '0.0.0.0'
        else:
            host = '0.0.0.0'
    app.run(host=host, debug=True, port=port)
