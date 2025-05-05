from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import os
import requests
import json
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_key_for_synthify_ai_app')

# API configuration
API_BASE_URL = 'https://4jfkn4rhq3ksrwomdduiwq2xwe0yqdnr.lambda-url.us-east-1.on.aws'

# In-memory user storage (replace with database in production)
users = {}
generated_files = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['GET', 'POST'])
def generate():
    # Check if user is logged in
    if 'user_email' not in session:
        return redirect(url_for('signup'))
    
    if request.method == 'POST':
        # Extract form data
        column_names = request.form.getlist('columnName[]')
        column_types = request.form.getlist('columnType[]')
        
        # Create column_name dictionary
        column_name_data = {}
        for i in range(len(column_names)):
            name = column_names[i].strip()
            if name:
                column_name_data[name] = column_types[i]
        
        # Validate input
        if not column_name_data:
            return jsonify({"status": "error", "message": "Please define at least one column with a name."}), 400
        
        # Construct payload
        payload = {
            "column_name": column_name_data,
            "example1": request.form.get('example1', '').strip(),
            "example2": request.form.get('example2', '').strip(),
            "example3": request.form.get('example3', '').strip(),
            "query": request.form.get('query', '').strip(),
            "num_records": int(request.form.get('num_records', 10))
        }
        
        try:
            # Log the request for debugging
            print(f"Sending request to API: {API_BASE_URL}/generate_response_schema")
            print(f"Payload: {json.dumps(payload)}")
            
            # Configure requests with timeouts and detailed error handling
            response = requests.post(
                f"{API_BASE_URL}/generate_response_schema", 
                json=payload,
                timeout=30  # 30-second timeout
            )
            
            # Log response status for debugging
            print(f"API response status: {response.status_code}")
            
            # Raise exception for error status codes
            response.raise_for_status()
            
            # Get the response data
            response_data = response.json()
            print(f"API response data received: {response_data.keys()}")
            
            # Store the result for the current session
            file_id = str(uuid.uuid4())
            
            # Ensure the URL is included in the response
            if 'url' not in response_data:
                s3_uri = f"https://datagenration.s3.us-east-1.amazonaws.com/{file_id}.csv"
                response_data['url'] = {"s3_uri": s3_uri}
            
            generated_files[file_id] = {
                'data': response_data,
                'timestamp': datetime.now().isoformat(),
                'filename': f"data_{file_id[:8]}.json"
            }
            
            return jsonify(response_data)
        except requests.Timeout:
            error_msg = "API request timed out. The server might be experiencing high load."
            print(f"ERROR: {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 504
        except requests.RequestException as e:
            error_msg = f"API Error: {str(e)}"
            print(f"ERROR: {error_msg}")
            
            # Try to extract more detailed error information if available
            response_text = ""
            try:
                if hasattr(e, 'response') and e.response is not None:
                    response_text = e.response.text
                    print(f"API Error Response: {response_text}")
            except:
                pass
                
            return jsonify({
                "status": "error", 
                "message": error_msg,
                "details": response_text
            }), 500
        except Exception as e:
            error_msg = f"Unexpected error processing API response: {str(e)}"
            print(f"ERROR: {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 500
    
    return render_template('generate.html')

@app.route('/list_files')
def list_files():
    if not generated_files:
        return jsonify({"status": "success", "files": []})
    
    files = [file_data['filename'] for file_id, file_data in generated_files.items()]
    return jsonify({"status": "success", "files": files})

@app.route('/download/<filename>')
def download_file(filename):
    # Find the file in our storage
    for file_id, file_data in generated_files.items():
        if file_data['filename'] == filename:
            # Make sure the URL is included in the response
            if 'data' in file_data and 'url' not in file_data['data']:
                # If the API response doesn't have a URL structure, add it
                s3_uri = f"https://datagenration.s3.us-east-1.amazonaws.com/{file_id}.csv"
                file_data['data']['url'] = {"s3_uri": s3_uri}
            
            return jsonify(file_data['data'])
    
    return jsonify({"status": "error", "message": "File not found"}), 404

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if email in users and check_password_hash(users[email]['password'], password):
            session['user_email'] = email
            return redirect(url_for('generate'))
        else:
            error = "Invalid email or password"
    
    return render_template('login.html', error=error)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    error = None
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirmPassword')
        
        if email in users:
            error = "Email already registered"
        elif password != confirm_password:
            error = "Passwords do not match"
        elif len(password) < 8:
            error = "Password must be at least 8 characters"
        else:
            users[email] = {
                'first_name': request.form.get('firstName'),
                'last_name': request.form.get('lastName'),
                'company': request.form.get('company'),
                'password': generate_password_hash(password),
                'created_at': datetime.now().isoformat()
            }
            
            session['user_email'] = email
            return redirect(url_for('generate'))
    
    return render_template('signup.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user_email', None)
    return redirect(url_for('index'))

@app.route('/use_cases')
def use_cases():
    return render_template('use_cases.html')

@app.route('/resources')
def resources():
    return render_template('resources.html')

@app.route('/company')
def company():
    return render_template('company.html')

@app.route('/pricing')
def pricing():
    return render_template('pricing.html')

@app.route('/docs')
def docs():
    return render_template('docs.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

if __name__ == '__main__':
    app.run(debug=True) 