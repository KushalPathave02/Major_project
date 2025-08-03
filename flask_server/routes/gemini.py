from flask import Blueprint, jsonify

gemini_bp = Blueprint('gemini', __name__)

@gemini_bp.route('/api/gemini-chat', methods=['POST'])
def chat():
    return jsonify({'message': 'Gemini chat placeholder'})
