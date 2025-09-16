from flask import Blueprint, jsonify, request, g
from database import get_db
from middleware import token_required
from models.message import Message
from bson.objectid import ObjectId
import datetime

messages_bp = Blueprint('messages', __name__)

# GET all messages for the user
@messages_bp.route('/api/messages', methods=['GET'])
@token_required
def get_messages():
    db = get_db()
    user_id = g.user_id
    
    # In a real app, you might also fetch broadcast messages (e.g., user_id: null)
    messages_cursor = db.messages.find({'user_id': user_id}).sort('createdAt', -1)
    
    messages_list = []
    for msg in messages_cursor:
        message_obj = Message(
            _id=msg.get('_id'),
            user_id=msg.get('user_id'),
            title=msg.get('title'),
            body=msg.get('body'),
            msg_type=msg.get('type', 'support'),
            read=msg.get('read', False),
            created_at=msg.get('createdAt')
        )
        messages_list.append(message_obj.to_dict())
        
    return jsonify(messages_list)

# POST a new support request
@messages_bp.route('/api/messages/support', methods=['POST'])
@token_required
def create_support_request():
    db = get_db()
    user_id = g.user_id
    data = request.get_json()

    if not data or not data.get('title') or not data.get('body'):
        return jsonify({'message': 'Title and body are required'}), 400

    new_message = Message(
        user_id=user_id,
        title=data['title'],
        body=data['body'],
        msg_type='support'
    )

    try:
        db.messages.insert_one({
            'user_id': new_message.user_id,
            'title': new_message.title,
            'body': new_message.body,
            'type': new_message.type,
            'read': new_message.read,
            'createdAt': new_message.created_at
        })
        return jsonify({'message': 'Support request created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# POST a new feedback entry
@messages_bp.route('/api/messages/feedback', methods=['POST'])
@token_required
def create_feedback():
    db = get_db()
    user_id = g.user_id
    data = request.get_json() or {}

    body = data.get('body') or data.get('message')
    rating = data.get('rating')  # optional, 1-5

    if not body:
        return jsonify({'message': 'Feedback body is required'}), 400

    # Build a message-like document to reuse the messages collection
    doc = {
        'user_id': user_id,
        'title': 'Feedback',
        'body': body,
        'type': 'feedback',
        'read': False,
        'createdAt': datetime.datetime.utcnow(),
    }
    if rating is not None:
        try:
            r = int(rating)
            if 1 <= r <= 5:
                doc['rating'] = r
        except Exception:
            # Ignore invalid rating
            pass

    try:
        db.messages.insert_one(doc)
        return jsonify({'message': 'Feedback submitted successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# PATCH to mark a message as read
@messages_bp.route('/api/messages/<message_id>/read', methods=['PATCH'])
@token_required
def mark_message_as_read(message_id):
    db = get_db()
    user_id = g.user_id

    try:
        result = db.messages.update_one(
            {'_id': ObjectId(message_id), 'user_id': user_id},
            {'$set': {'read': True}}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Message not found or not owned by user'}), 404
        
        return jsonify({'message': 'Message marked as read'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
