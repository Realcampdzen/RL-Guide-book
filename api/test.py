from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Vercel!", "status": "working"})

@app.route('/api/test')
def test_api():
    return jsonify({"message": "API is working!", "status": "success"})

# Vercel требует именно эту переменную
application = app

if __name__ == "__main__":
    app.run()
