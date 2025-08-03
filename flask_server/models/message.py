import datetime

class Message:
    def __init__(self, user_id, title, body, msg_type='support', read=False, created_at=None, _id=None):
        self.user_id = user_id
        self.title = title
        self.body = body
        self.type = msg_type  # 'system', 'support', 'broadcast'
        self.read = read
        self.created_at = created_at or datetime.datetime.utcnow()
        self._id = _id

    def to_dict(self):
        return {
            '_id': str(self._id),
            'user_id': self.user_id,
            'title': self.title,
            'body': self.body,
            'type': self.type,
            'read': self.read,
            'createdAt': self.created_at.isoformat() + 'Z'
        }
