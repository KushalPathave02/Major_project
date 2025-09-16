from werkzeug.security import generate_password_hash, check_password_hash
import datetime

class User:
    def __init__(self, name, email, password, role='user', profile_pic='', two_fa_enabled=False, join_date=None, wallet_balance=0.0, _id=None):
        self.name = name
        self.email = email
        self.password_hash = self.set_password(password)
        self.role = role
        self.profile_pic = profile_pic
        self.two_fa_enabled = two_fa_enabled
        self.join_date = join_date or datetime.datetime.utcnow()
        self.wallet_balance = wallet_balance
        self._id = _id

    def set_password(self, password):
        return generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        result = {
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'profilePic': self.profile_pic,
            'twoFAEnabled': self.two_fa_enabled,
            'joinDate': self.join_date.isoformat() + 'Z',
            'wallet_balance': self.wallet_balance,
            'walletBalance': self.wallet_balance
        }
        if self._id is not None:
            result['_id'] = str(self._id)
        return result
