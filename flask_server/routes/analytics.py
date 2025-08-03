from flask import Blueprint, jsonify, g
from database import get_db
from middleware import token_required
from bson.objectid import ObjectId
import datetime
from dateutil.relativedelta import relativedelta

analytics_bp = Blueprint('analytics', __name__)

EXPENSE_CATEGORIES = [
    'rent', 'bills', 'groceries', 'travel', 'others', 'shopping', 'food', 
    'utilities', 'transport', 'medical', 'entertainment', 'subscriptions', 
    'education', 'emi', 'loan', 'insurance', 'tax', 'fuel', 'misc', 'expense'
]

@analytics_bp.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics_data():
    db = get_db()
    user_id = g.user_id

    try:
        # 1. Monthly Trend
        monthly_trend_pipeline = [
            {'$match': {'user_id': user_id}},
            {'$group': {
                '_id': {'year': {'$year': '$date'}, 'month': {'$month': '$date'}},
                'revenue': {'$sum': {'$cond': [{'$not': [{'$in': ['$category', EXPENSE_CATEGORIES]}]}, '$amount', 0]}},
                'expense': {'$sum': {'$cond': [{'$in': ['$category', EXPENSE_CATEGORIES]}, '$amount', 0]}}
            }},
            {'$sort': {'_id.year': 1, '_id.month': 1}},
            {'$project': {
                'month': {'$concat': [
                    {'$let': {'vars': {'months': [None, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']},
                              'in': {'$arrayElemAt': ['$$months', '$_id.month']}}},
                    ' ',
                    {'$toString': '$_id.year'}
                ]},
                'revenue': '$revenue',
                'expense': '$expense',
                '_id': 0
            }}
        ]
        monthly_trend = list(db.transactions.aggregate(monthly_trend_pipeline))

        # 2. Category Breakdown
        category_breakdown_pipeline = [
            {'$match': {'user_id': user_id}},
            {'$group': {'_id': '$category', 'amount': {'$sum': '$amount'}}},
            {'$project': {'category': '$_id', 'amount': '$amount', '_id': 0}}
        ]
        category_breakdown = list(db.transactions.aggregate(category_breakdown_pipeline))

        # 3. Top Expenses (This Month)
        today = datetime.datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        top_expenses_pipeline = [
            {'$match': {
                'user_id': user_id,
                'date': {'$gte': start_of_month},
                'category': {'$in': EXPENSE_CATEGORIES}
            }},
            {'$group': {'_id': '$category', 'amount': {'$sum': '$amount'}}},
            {'$sort': {'amount': -1}},
            {'$limit': 5},
            {'$project': {'category': '$_id', 'amount': '$amount', '_id': 0}}
        ]
        top_expenses = list(db.transactions.aggregate(top_expenses_pipeline))

        # 4. Spend Change
        start_of_last_month = start_of_month - relativedelta(months=1)
        end_of_last_month = start_of_month - relativedelta(seconds=1)
        
        this_month_spend_pipeline = [
            {'$match': {'user_id': user_id, 'date': {'$gte': start_of_month}, 'category': {'$in': EXPENSE_CATEGORIES}}},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]
        last_month_spend_pipeline = [
            {'$match': {'user_id': user_id, 'date': {'$gte': start_of_last_month, '$lte': end_of_last_month}, 'category': {'$in': EXPENSE_CATEGORIES}}},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]

        this_month_result = list(db.transactions.aggregate(this_month_spend_pipeline))
        last_month_result = list(db.transactions.aggregate(last_month_spend_pipeline))
        
        this_month_spend = this_month_result[0]['total'] if this_month_result else 0
        last_month_spend = last_month_result[0]['total'] if last_month_result else 0

        spend_change = None
        if last_month_spend > 0:
            percent_change = ((this_month_spend - last_month_spend) / last_month_spend) * 100
            spend_change = {'percent': round(percent_change), 'more': percent_change > 0}
        elif this_month_spend > 0:
             spend_change = {'percent': 100, 'more': True} # Infinite increase

        return jsonify({
            'monthlyTrend': monthly_trend,
            'categoryBreakdown': category_breakdown,
            'topExpenses': top_expenses,
            'spendChange': spend_change
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
