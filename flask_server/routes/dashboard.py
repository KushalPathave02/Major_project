from flask import Blueprint, jsonify, g, request, current_app
from database import get_db
from middleware import token_required
from bson.objectid import ObjectId
import datetime
import os
import json

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    return jsonify({'message': 'Dashboard data placeholder'})

@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@token_required
def get_dashboard_summary():
    user_id = g.user_id

    expense_categories = [
        'rent', 'bills', 'groceries', 'travel', 'others', 'shopping', 'food', 
        'utilities', 'transport', 'medical', 'entertainment', 'subscriptions', 
        'education', 'emi', 'loan', 'insurance', 'tax', 'fuel', 'misc', 'expense'
    ]

    pipeline = [
        {'$match': {'user_id': user_id}},
        # Normalize fields for reliable aggregation
        {'$addFields': {
            'amountNum': {
                '$cond': [
                    {'$eq': [{'$type': '$amount'}, 'string']},
                    {'$toDouble': {'$ifNull': ['$amount', 0]}},
                    {'$ifNull': ['$amount', 0]}
                ]
            },
            'isExpense': {
                '$cond': [
                    {'$eq': [{'$toLower': {'$ifNull': ['$type', '']}}, 'expense']},
                    True,
                    {'$in': [{'$toLower': {'$ifNull': ['$category', '']}}, expense_categories]}
                ]
            }
        }},
        {'$group': {
            '_id': '$user_id',
            'total_revenue': {
                '$sum': {
                    '$cond': [
                        {'$eq': ['$isExpense', False]},
                        '$amountNum',
                        0
                    ]
                }
            },
            'total_expenses': {
                '$sum': {
                    '$cond': [
                        {'$eq': ['$isExpense', True]},
                        '$amountNum',
                        0
                    ]
                }
            },
            'transaction_count': {'$sum': 1}
        }}
    ]

    # Query MongoDB per-user only
    try:
        db = get_db()
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
    except Exception:
        pass

    # Safe defaults if no user data
    return jsonify({
        'revenue': 0,
        'expenses': 0,
        'savings': 0,
        'balance': 0,
        'transactionCount': 0
    })

@dashboard_bp.route('/api/dashboard/line-chart', methods=['GET'])
@token_required
def get_line_chart_data():
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
        # Ensure we have a date field to aggregate on; this avoids issues if some docs miss 'date'
        {'$match': {**filters, 'date': {'$type': 'date'}}},
        {'$addFields': {
            'amountNum': {
                '$cond': [
                    {'$eq': [{'$type': '$amount'}, 'string']},
                    {'$toDouble': {'$ifNull': ['$amount', 0]}},
                    {'$ifNull': ['$amount', 0]}
                ]
            },
            'isExpense': {
                '$cond': [
                    {'$eq': [{'$toLower': {'$ifNull': ['$type', '']}}, 'expense']},
                    True,
                    {'$in': [{'$toLower': {'$ifNull': ['$category', '']}}, expense_categories]}
                ]
            }
        }},
        {'$group': {
            '_id': {
                'year': {'$year': '$date'},
                'month': {'$month': '$date'}
            },
            'revenue': {
                '$sum': {
                    '$cond': [
                        {'$eq': ['$isExpense', False]},
                        '$amountNum',
                        0
                    ]
                }
            },
            'expenses': {
                '$sum': {
                    '$cond': [
                        {'$eq': ['$isExpense', True]},
                        '$amountNum',
                        0
                    ]
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

    # DB only per-user
    try:
        db = get_db()
        chart_data = list(db.transactions.aggregate(pipeline))
        if chart_data:
            return jsonify(chart_data)
    except Exception:
        pass

    # Safe fallback: last 6 months zeros for a new/empty user
    now = datetime.datetime.utcnow()
    months_in_year = [None, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    fallback = []
    for i in range(5, -1, -1):
        d = (now.replace(day=1) - datetime.timedelta(days=30*i))
        label = f"{months_in_year[d.month]} {d.year}"
        fallback.append({'month': label, 'revenue': 0, 'expenses': 0})
    return jsonify(fallback)
