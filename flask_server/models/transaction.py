import datetime

class Transaction:
    def __init__(self, user_id, amount, category, date=None, type='expense', status='completed', description=''):
        self.user_id = user_id
        self.amount = amount
        self.category = category
        self.date = date or datetime.datetime.utcnow()
        self.type = type
        self.status = status
        self.description = description

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'amount': self.amount,
            'category': self.category,
            'date': self.date.isoformat(),
            'type': self.type,
            'status': self.status,
            'description': self.description
        }
