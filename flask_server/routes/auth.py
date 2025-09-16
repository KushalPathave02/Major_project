from flask import Blueprint, jsonify, request, current_app, url_for
import os
from database import get_db
from models.user import User
from werkzeug.security import check_password_hash
import jwt
import datetime
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask_mail import Message

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    db = get_db()
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'message': 'Missing name, email, or password'}), 400

    if db.users.find_one({'email': email}):
        return jsonify({'message': 'User with this email already exists'}), 400

    new_user = User(name=name, email=email, password=password, join_date=datetime.datetime.utcnow())
    user_data = {
        'name': new_user.name,
        'email': new_user.email,
        'password': new_user.password_hash,
        'role': new_user.role,
        'profile_pic': new_user.profile_pic,
        'two_fa_enabled': new_user.two_fa_enabled,
        'join_date': new_user.join_date,
        'wallet_balance': new_user.wallet_balance,
        'is_verified': False
    }
    
    result = db.users.insert_one(user_data)
    user_data['_id'] = result.inserted_id

    # Build verification link first
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    token = serializer.dumps(email, salt='email-verify')
    public_base = os.getenv('APP_PUBLIC_BASE_URL')
    if public_base:
        verify_link = f"{public_base.rstrip('/')}/api/auth/verify/{token}"
    else:
        verify_link = url_for('auth.verify_email', token=token, _external=True)

    # Send verification email
    try:
        # Use Flask-Mail instance from app extensions
        mail = current_app.extensions.get('mail')
        msg = Message('Verify your email', recipients=[email])
        msg.body = f"Welcome to Finance Dashboard, {name}!\n\nClick this link to verify your email:\n{verify_link}\n\nThis link is valid for 1 hour."
        if mail:
            mail.send(msg)
        else:
            raise RuntimeError('Mail extension not initialized')
    except Exception as e:
        # Do not fail registration if email fails; include verify_link for dev convenience
        return jsonify({'message': 'User registered. Failed to send verification email.', 'verify_link': verify_link, 'email_error': str(e)}), 201

    return jsonify({'message': 'Registration successful. Check your email for verification link.', 'verify_link': verify_link}), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    db = get_db()
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Missing email or password'}), 400

    user = db.users.find_one({'email': email})

    if user and check_password_hash(user['password'], password):
        if not user.get('is_verified', False):
            return jsonify({'message': 'Please verify your email first'}), 403
        token = jwt.encode(
            {
                'user_id': str(user['_id']),
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        return jsonify({'token': token, 'user': {'id': str(user['_id'])}})

    return jsonify({'message': 'Invalid credentials'}), 401


@auth_bp.route('/api/auth/verify/<token>', methods=['GET'])
def verify_email(token):
    """Verify email using time-limited token (1 hour)."""
    db = get_db()
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='email-verify', max_age=3600)
    except SignatureExpired:
        return jsonify({'message': 'Verification link expired'}), 400
    except BadSignature:
        return jsonify({'message': 'Invalid verification link'}), 400

    res = db.users.update_one({'email': email}, {'$set': {'is_verified': True}})
    if res.matched_count == 0:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'message': 'Email verified successfully'}), 200
