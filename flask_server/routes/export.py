from flask import Blueprint, Response, g
from database import get_db
from middleware import token_required
import csv
import io

export_bp = Blueprint('export', __name__)

@export_bp.route('/api/export/transactions', methods=['GET'])
@token_required
def export_transactions():
    db = get_db()
    user_id = g.user_id

    transactions_cursor = db.transactions.find({'user_id': user_id})
    transactions_list = list(transactions_cursor)

    if not transactions_list:
        return Response("No transactions to export", status=204)

    # Use an in-memory string buffer
    output = io.StringIO()
    
    # Define the headers, ensuring consistent order
    header = ['_id', 'user_id', 'amount', 'date', 'category', 'description', 'status', 'type']
    writer = csv.DictWriter(output, fieldnames=header, extrasaction='ignore')

    # Write header
    writer.writeheader()

    # Write data
    for transaction in transactions_list:
        writer.writerow(transaction)

    # Seek to the beginning of the stream
    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment;filename=transactions.csv'}
    )
