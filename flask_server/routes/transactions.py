from flask import Blueprint, jsonify, g, request
from database import get_db
from middleware import token_required
from bson import json_util, ObjectId
import json
import datetime

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions():
    db = get_db()
    user_id = g.user_id

    # Pagination
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 10))
    skip = (page - 1) * page_size

    # Filters
    filters = {'user_id': user_id}
    if 'category' in request.args:
        filters['category'] = request.args['category']
    if 'status' in request.args:
        filters['status'] = request.args['status']
    if 'dateFrom' in request.args or 'dateTo' in request.args:
        filters['date'] = {}
        if 'dateFrom' in request.args:
            filters['date']['$gte'] = datetime.datetime.fromisoformat(request.args['dateFrom'])
        if 'dateTo' in request.args:
            filters['date']['$lte'] = datetime.datetime.fromisoformat(request.args['dateTo'])
    if 'amountMin' in request.args or 'amountMax' in request.args:
        filters['amount'] = {}
        if 'amountMin' in request.args:
            filters['amount']['$gte'] = float(request.args['amountMin'])
        if 'amountMax' in request.args:
            filters['amount']['$lte'] = float(request.args['amountMax'])

    # Sorting
    sort_by = request.args.get('sortBy', 'date')
    sort_dir = 1 if request.args.get('sortDir', 'asc') == 'asc' else -1

    try:
        transactions_cursor = db.transactions.find(filters).sort(sort_by, sort_dir).skip(skip).limit(page_size)
        transactions = list(transactions_cursor)
        total_transactions = db.transactions.count_documents(filters)

        return jsonify({
            'transactions': json.loads(json_util.dumps(transactions)),
            'total': total_transactions,
            'page': page,
            'pageSize': page_size
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/api/transactions/upload', methods=['POST'])
@token_required
def upload_transactions():
    db = get_db()
    user_id = g.user_id
    data = request.get_json()

    if not isinstance(data, list):
        return jsonify({'message': 'JSON payload must be a list of transactions'}), 400

    new_transactions = []
    for tx_data in data:
        # Basic validation
        if not all(k in tx_data for k in ['amount', 'category', 'date']):
            continue  # Or return an error for this specific transaction

        tx_data['user_id'] = user_id
        # Convert date string to datetime object
        try:
            tx_data['date'] = datetime.datetime.fromisoformat(tx_data['date'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            # Handle cases where date is not a valid ISO string
            # For now, we'll skip this transaction
            continue
        new_transactions.append(tx_data)

    if not new_transactions:
        return jsonify({'message': 'No valid transactions to upload'}), 400

    try:
        db.transactions.insert_many(new_transactions)
        return jsonify({'message': 'Transactions uploaded successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
