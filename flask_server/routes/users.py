from flask import Blueprint, jsonify, request, current_app
from bson.objectid import ObjectId
from database import get_db
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
import os
from middleware import token_required

users_bp = Blueprint('users', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@users_bp.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    db = get_db()
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            user['_id'] = str(user['_id'])
            response_user = {
                'id': user['_id'],
                'name': user.get('name'),
                'email': user.get('email'),
                'role': user.get('role'),
                'profilePic': user.get('profile_pic'),
                'twoFAEnabled': user.get('two_fa_enabled'),
                'joinDate': user.get('join_date').isoformat() if user.get('join_date') else None
            }
            return jsonify(response_user)
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@users_bp.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    db = get_db()
    data = request.get_json()
    update_fields = {
        'name': data.get('name'),
        'email': data.get('email'),
    }
    update_fields = {k: v for k, v in update_fields.items() if v is not None}

    if not update_fields:
        return jsonify({'error': 'No update fields provided'}), 400

    try:
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_fields}
        )
        if result.matched_count:
            return jsonify({'message': 'User updated successfully'})
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@users_bp.route('/api/users/<user_id>/profile-pic', methods=['POST'])
def upload_profile_pic(user_id):
    db = get_db()
    if 'profilePic' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['profilePic']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        file_url = f'/uploads/{filename}'
        
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'profile_pic': file_url}}
        )
        
        if result.matched_count:
            return jsonify({'message': 'Profile picture updated', 'profilePic': file_url})
        else:
            return jsonify({'error': 'User not found'}), 404
    else:
        return jsonify({'error': 'File type not allowed'}), 400


@users_bp.route('/api/users/<user_id>/password', methods=['PUT'])
@token_required
def change_password(user_id):
    """Change password for the authenticated user. Requires current, new, confirm."""
    db = get_db()
    data = request.get_json() or {}
    current = data.get('current')
    new = data.get('new')
    confirm = data.get('confirm')

    if not all([current, new, confirm]):
        return jsonify({'message': 'Missing required fields'}), 400
    if new != confirm:
        return jsonify({'message': 'Passwords do not match'}), 400

    # Ensure the user exists
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Verify current password
    if not check_password_hash(user.get('password', ''), current):
        return jsonify({'message': 'Current password is incorrect'}), 401

    # Update to new hashed password
    hashed = generate_password_hash(new)
    db.users.update_one({'_id': ObjectId(user_id)}, {'$set': {'password': hashed}})
    return jsonify({'message': 'Password changed successfully'})
