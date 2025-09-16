from flask import Blueprint, jsonify, current_app
from flask import g
from bson import ObjectId
from datetime import datetime, timedelta
import pandas as pd
import os
import json
from statsmodels.tsa.arima.model import ARIMA
from middleware import token_required

get_db = None  # Will be set by the app
forecast_bp = Blueprint('forecast', __name__)

def init_app(db_func):
    global get_db
    get_db = db_func

@forecast_bp.route('/forecast', methods=['GET'])
@token_required
def get_forecast():
    try:
        # Per-user transactions only; no global file fallback to avoid leaking data
        db = get_db()
        user_id = g.user_id
        transactions = list(db.transactions.find({
            'user_id': user_id
        }, {
            'date': 1,
            'amount': 1,
            '_id': 0,
            'category': 1,
            'type': 1
        }))

        if not transactions:
            return jsonify({
                'history': [],
                'forecast': None,
                'message': 'No transactions yet for forecasting'
            })

        # Normalize and filter transactions into a DataFrame
        # Prefer expenses: negative amounts, or type 'debit', or category 'expense'
        normalized = []
        for tx in transactions:
            amt = tx.get('amount')
            dt = tx.get('date')
            cat = str(tx.get('category', '')).lower()
            ttype = str(tx.get('type', '')).lower()
            # parse date to ISO
            try:
                date_val = pd.to_datetime(dt)
            except Exception:
                continue
            try:
                amt_val = float(amt)
            except Exception:
                continue
            is_expense = (amt_val < 0) or (ttype == 'debit') or ('expense' in cat)
            normalized.append({'date': date_val, 'amount': amt_val, 'is_expense': is_expense})

        if not normalized:
            return jsonify({
                'history': [],
                'forecast': None,
                'message': 'No valid transactions found for forecasting'
            })

        df = pd.DataFrame(normalized)
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Keep only expense rows
        df = df[df['is_expense']]
        # Use absolute values for expenses
        df['amount'] = df['amount'].abs()
        
        # Group by month and sum expenses
        monthly_expenses = df.groupby('month')['amount'].sum()
        
        if len(monthly_expenses) < 3:  # Need at least 3 data points for ARIMA
            return jsonify({
                'history': [{'month': str(m), 'expense': float(v)} for m, v in monthly_expenses.items()],
                'forecast': None,
                'message': 'Need at least 3 months of data for accurate forecasting'
            })
        
        # Convert to numeric values for ARIMA
        y = monthly_expenses.astype(float).values
        
        try:
            # Fit ARIMA model (simple configuration - can be tuned)
            model = ARIMA(y, order=(1, 1, 1))
            fit_model = model.fit()
            
            # Forecast next month
            forecast = fit_model.forecast(steps=1)
            next_month = monthly_expenses.index[-1] + 1
            
            # Prepare response
            history = [{
                'month': str(month),
                'expense': float(amount)
            } for month, amount in monthly_expenses.items()]
            
            forecast_value = float(forecast[0])
            
            return jsonify({
                'history': history,
                'forecast': {
                    'month': str(next_month),
                    'expense': forecast_value
                },
                'message': 'Forecast generated successfully'
            })
            
        except Exception as e:
            return jsonify({
                'error': f'Error in forecasting: {str(e)}',
                'history': [{'month': str(m), 'expense': float(v)} for m, v in monthly_expenses.items()],
                'forecast': None
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}',
            'message': 'Failed to generate forecast'
        }), 500
