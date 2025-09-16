from flask import Blueprint, jsonify, g, request, current_app
from database import get_db
from middleware import token_required
from bson import json_util, ObjectId
import json
import os
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
    # Do not connect to DB up-front to avoid failures when Mongo is unreachable.
    user_id = getattr(g, 'user_id', None)

    # Parse JSON safely; if Content-Type missing, try raw data
    data = None
    try:
        data = request.get_json(silent=True)
        if data is None and request.data:
            data = json.loads(request.data.decode('utf-8'))
    except Exception as e:
        # Still proceed to save raw text if present, but report issue
        data = None

    if data is None:
        return jsonify({'message': 'Missing or invalid JSON payload. Ensure Content-Type: application/json and a valid JSON body.'}), 400

    # Accept array or search common container keys
    payload_list = None
    if isinstance(data, list):
        payload_list = data
    elif isinstance(data, dict):
        for key in ['transactions', 'data', 'items', 'records', 'list']:
            if key in data and isinstance(data[key], list):
                payload_list = data[key]
                break
        if payload_list is None:
            # If dict looks like a single transaction, wrap it
            payload_list = [data]
    else:
        return jsonify({'message': 'Unsupported JSON structure'}), 400

    # 1) Save raw uploaded JSON to a single file for forecasting (always)
    try:
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        json_path = os.path.join(upload_folder, 'transactions.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(payload_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({'message': 'Failed to write uploaded file', 'error': str(e)}), 500

    # 2) Heuristically normalize transactions for DB (optional)
    def map_field(d: dict, keys):
        for k in keys:
            if k in d and d[k] not in [None, '']:
                return d[k]
        return None

    new_transactions = []
    for tx in payload_list:
        if not isinstance(tx, dict):
            continue
        amount = map_field(tx, ['amount', 'amt', 'value', 'transactionAmount'])
        category = map_field(tx, ['category', 'type', 'tag']) or 'uncategorized'
        date_val = map_field(tx, ['date', 'transactionDate', 'timestamp', 'time'])
        if date_val is None or amount is None:
            continue
        # Parse date: support ISO, or numeric epoch (sec/ms)
        parsed_date = None
        try:
            if isinstance(date_val, (int, float)):
                # Heuristic: treat > 10^12 as ms, else seconds
                ts = float(date_val)
                if ts > 1e12:
                    parsed_date = datetime.datetime.fromtimestamp(ts/1000.0)
                else:
                    parsed_date = datetime.datetime.fromtimestamp(ts)
            else:
                parsed_date = datetime.datetime.fromisoformat(str(date_val).replace('Z', '+00:00'))
        except Exception:
            continue
        # Parse amount -> float
        try:
            amount_val = float(amount)
        except Exception:
            continue

        doc = {
            'user_id': user_id,
            'amount': amount_val,
            'category': category,
            'date': parsed_date,
        }
        # Preserve optional fields if present
        for extra in ['status', 'description', 'merchant', 'type']:
            if extra in tx:
                doc[extra] = tx[extra]
        new_transactions.append(doc)

    # 3) Try DB insert, but do not fail the request if DB is down
    try:
        if new_transactions:
            db = get_db()
            db.transactions.insert_many(new_transactions)
            return jsonify({
                'message': 'Transactions uploaded successfully',
                'saved_to_file': True,
                'normalized_for_db': len(new_transactions)
            }), 201
        else:
            return jsonify({
                'message': 'Saved uploaded data to file for forecasting. No records were normalized for DB (field mapping/date parsing might not match).',
                'saved_to_file': True,
                'normalized_for_db': 0
            }), 201
    except Exception as db_err:
        return jsonify({
            'message': 'Transactions saved to file for forecasting. Skipped DB insert due to connection issue.',
            'saved_to_file': True,
            'normalized_for_db': len(new_transactions),
            'db_error': str(db_err)
        }), 201
