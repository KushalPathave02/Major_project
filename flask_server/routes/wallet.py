from flask import Blueprint, jsonify, request, g
from database import get_db
from middleware import token_required
from bson.objectid import ObjectId
from bson.errors import InvalidId
import datetime

wallet_bp = Blueprint('wallet', __name__)

# Get wallet balance
@wallet_bp.route('/api/wallet/<user_id>/balance', methods=['GET'])
@token_required
def get_wallet_balance(user_id):
    if g.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400

    user = db.users.find_one({'_id': oid})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'walletBalance': user.get('wallet_balance', 0)})

# New: balance for current user (no user_id in path)
@wallet_bp.route('/api/wallet/balance', methods=['GET'])
@token_required
def get_wallet_balance_me():
    user_id = g.user_id
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400
    user = db.users.find_one({'_id': oid})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'walletBalance': user.get('wallet_balance', 0)})

# Get wallet transaction history
@wallet_bp.route('/api/wallet/<user_id>/history', methods=['GET'])
@token_required
def get_wallet_history(user_id):
    if g.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    db = get_db()
    try:
        ObjectId(user_id)  # validate id
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400

    wallet_txns_cursor = db.transactions.find({
        'user_id': user_id,
        'category': {'$in': ['wallet_add', 'wallet_withdraw']}
    }).sort('date', -1)

    transactions_list = []
    for txn in wallet_txns_cursor:
        txn['_id'] = str(txn['_id'])
        transactions_list.append(txn)

    return jsonify({'transactions': transactions_list})

# New: history for current user (no user_id in path)
@wallet_bp.route('/api/wallet/history', methods=['GET'])
@token_required
def get_wallet_history_me():
    user_id = g.user_id
    db = get_db()
    try:
        ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400
    wallet_txns_cursor = db.transactions.find({
        'user_id': user_id,
        'category': {'$in': ['wallet_add', 'wallet_withdraw']}
    }).sort('date', -1)
    transactions_list = []
    for txn in wallet_txns_cursor:
        txn['_id'] = str(txn['_id'])
        transactions_list.append(txn)
    return jsonify({'transactions': transactions_list})

# Add money to wallet
@wallet_bp.route('/api/wallet/<user_id>/add', methods=['POST'])
@token_required
def add_to_wallet(user_id):
    if g.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    amount = data.get('amount')
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400

    result = db.users.update_one(
        {'_id': oid},
        {'$inc': {'wallet_balance': amount}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'User not found'}), 404

    db.transactions.insert_one({
        'user_id': user_id,
        'amount': amount,
        'category': 'wallet_add',
        'date': datetime.datetime.utcnow(),
        'description': 'Added to wallet',
        'status': 'completed',
        'type': 'income'
    })

    user = db.users.find_one({'_id': oid})
    return jsonify({'walletBalance': user.get('wallet_balance')})

# New: add for current user (no user_id in path)
@wallet_bp.route('/api/wallet/add', methods=['POST'])
@token_required
def add_to_wallet_me():
    user_id = g.user_id
    data = request.get_json()
    amount = data.get('amount')
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400
    result = db.users.update_one({'_id': oid}, {'$inc': {'wallet_balance': amount}})
    if result.matched_count == 0:
        return jsonify({'error': 'User not found'}), 404
    db.transactions.insert_one({
        'user_id': user_id,
        'amount': amount,
        'category': 'wallet_add',
        'date': datetime.datetime.utcnow(),
        'description': 'Added to wallet',
        'status': 'completed',
        'type': 'income'
    })
    user = db.users.find_one({'_id': oid})
    return jsonify({'walletBalance': user.get('wallet_balance')})

# Withdraw money from wallet
@wallet_bp.route('/api/wallet/<user_id>/withdraw', methods=['POST'])
@token_required
def withdraw_from_wallet(user_id):
    if g.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    amount = data.get('amount')
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400

    user = db.users.find_one({'_id': oid})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.get('wallet_balance', 0) < amount:
        return jsonify({'error': 'Insufficient funds'}), 400

    db.users.update_one({'_id': oid}, {'$inc': {'wallet_balance': -amount}})

    db.transactions.insert_one({
        'user_id': user_id,
        'amount': amount,
        'category': 'wallet_withdraw',
        'date': datetime.datetime.utcnow(),
        'description': 'Withdrawn from wallet',
        'status': 'completed',
        'type': 'expense'
    })

    updated_user = db.users.find_one({'_id': oid})
    return jsonify({'walletBalance': updated_user.get('wallet_balance')})

# New: withdraw for current user (no user_id in path)
@wallet_bp.route('/api/wallet/withdraw', methods=['POST'])
@token_required
def withdraw_from_wallet_me():
    user_id = g.user_id
    data = request.get_json()
    amount = data.get('amount')
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({'error': 'Invalid user id'}), 400
    user = db.users.find_one({'_id': oid})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.get('wallet_balance', 0) < amount:
        return jsonify({'error': 'Insufficient funds'}), 400
    db.users.update_one({'_id': oid}, {'$inc': {'wallet_balance': -amount}})
    db.transactions.insert_one({
        'user_id': user_id,
        'amount': amount,
        'category': 'wallet_withdraw',
        'date': datetime.datetime.utcnow(),
        'description': 'Withdrawn from wallet',
        'status': 'completed',
        'type': 'expense'
    })
    updated_user = db.users.find_one({'_id': oid})
    return jsonify({'walletBalance': updated_user.get('wallet_balance')})
