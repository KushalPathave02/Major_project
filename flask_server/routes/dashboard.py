from flask import Blueprint, jsonify, g
from database import get_db
from middleware import token_required
from bson.objectid import ObjectId
import datetime

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    return jsonify({'message': 'Dashboard data placeholder'})

@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@token_required
def get_dashboard_summary():
    db = get_db()
    user_id = g.user_id

    expense_categories = [
        'rent', 'bills', 'groceries', 'travel', 'others', 'shopping', 'food', 
        'utilities', 'transport', 'medical', 'entertainment', 'subscriptions', 
        'education', 'emi', 'loan', 'insurance', 'tax', 'fuel', 'misc', 'expense'
    ]

    pipeline = [
        {'$match': {'user_id': user_id}},
        {'$group': {
            '_id': '$user_id',
            'total_revenue': {
                '$sum': {
                    '$cond': [{'$not': [{'$in': ['$category', expense_categories]}]}, '$amount', 0]
                }
            },
            'total_expenses': {
                '$sum': {
                    '$cond': [{'$in': ['$category', expense_categories]}, '$amount', 0]
                }
            },
            'transaction_count': {'$sum': 1}
        }}
    ]

    try:
        summary_data = list(db.transactions.aggregate(pipeline))
        if summary_data:
            data = summary_data[0]
            revenue = data.get('total_revenue', 0)
            expenses = data.get('total_expenses', 0)
            savings = revenue - expenses
            balance = savings # Assuming starting balance is 0
            count = data.get('transaction_count', 0)

            return jsonify({
                'revenue': revenue,
                'expenses': expenses,
                'savings': savings,
                'balance': balance,
                'transactionCount': count
            })
        else:
            return jsonify({
                'revenue': 0,
                'expenses': 0,
                'savings': 0,
                'balance': 0,
                'transactionCount': 0
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/api/dashboard/line-chart', methods=['GET'])
@token_required
def get_line_chart_data():
    db = get_db()
    user_id = g.user_id

    # Filters
    filters = {'user_id': user_id}
    if 'category' in request.args:
        filters['category'] = request.args['category']
    if 'status' in request.args:
        filters['status'] = request.args['status']

    expense_categories = [
        'rent', 'bills', 'groceries', 'travel', 'others', 'shopping', 'food', 
        'utilities', 'transport', 'medical', 'entertainment', 'subscriptions', 
        'education', 'emi', 'loan', 'insurance', 'tax', 'fuel', 'misc', 'expense'
    ]

    pipeline = [
        {'$match': filters},
        {'$group': {
            '_id': {
                'year': {'$year': '$date'},
                'month': {'$month': '$date'}
            },
            'revenue': {
                '$sum': {
                    '$cond': [{'$not': [{'$in': ['$category', expense_categories]}]}, '$amount', 0]
                }
            },
            'expenses': {
                '$sum': {
                    '$cond': [{'$in': ['$category', expense_categories]}, '$amount', 0]
                }
            }
        }},
        {'$sort': {'_id.year': 1, '_id.month': 1}},
        {'$project': {
            'month': {
                '$let': {
                    'vars': {
                        'months_in_year': [None, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    },
                    'in': {
                        '$concat': [
                            {'$$arrayElemAt': ['$$months_in_year', '$_id.month']},
                            ' ',
                            {'$toString': '$_id.year'}
                        ]
                    }
                }
            },
            'revenue': '$revenue',
            'expenses': '$expenses',
            '_id': 0
        }}
    ]

    try:
        chart_data = list(db.transactions.aggregate(pipeline))
        return jsonify(chart_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
