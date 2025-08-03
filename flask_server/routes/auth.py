from flask import Blueprint, jsonify, request, current_app
from database import get_db
from models.user import User
from werkzeug.security import check_password_hash
import jwt
import datetime

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
    user_data = new_user.__dict__
    user_data['password'] = new_user.password_hash
    del user_data['password_hash']

    db.users.insert_one(user_data)

    return jsonify({'message': 'User registered successfully'}), 201

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
