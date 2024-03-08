# This will run the flask app 

import string
import random
from datetime import datetime
import sqlite3
from flask import Flask, g, render_template
from flask import *
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('database/belay.db')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db


# TODO: figure out what this section of the database does
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None


# TODO: create session token
def new_user():
    # allows users to change thier password without authentication
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    
    # create a random session key and don;t insert it in into the user but return it and store as a local variable
    u = query_db('insert into users (name, password) ' + 
        'values (?, ?) returning id, name, password',
        (name, password),
        one=True)
    return u

# creates the authentication session token for users
def create_auth_key():
    auth_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return auth_key


@app.route('/')
@app.route('/profile')
@app.route('/signup')
@app.route('/channels')
@app.route('/login')
@app.route('/channels/replies/')
@app.route('/channels/replies/<reply_id>')
@app.route('/channels/<channel_id>')
def index(channel_id=None, reply_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404


# -------------------------------- API ROUTES ----------------------------------

# check for the user's authentication key
def check_auth_key(user_key):
    # if user key exists return true else false
    if not user_key:
        return False
    return True


#POST request to allow user's to signup, stores their information in the database
@app.route('/api/signup', methods=['POST'])
def create_new_user():

    u = new_user()
    # creates the session key
    auth_key = create_auth_key()
    
    user_dict = {}
    
    user_dict['id'] = u["id"]
    user_dict['name'] = u['name']
    user_dict['password'] = u['password'] 
    user_dict['auth_key'] = auth_key
    
    
    return jsonify(user_dict)


# POST request to check a user's login information
@app.route('/api/loginuser', methods=['POST'])
def login():
    # store username and auth_key for the user
    login_info = request.get_json()
    
    user = login_info.get("username")
    password = login_info.get("password")
    
    result = query_db('SELECT * FROM users WHERE name = ? AND password = ?;', [user, password], one=True)

    if result:
        auth_key = create_auth_key()
        username = result['name']
        # test pass bms37hp6td Sample User 1
        return jsonify({'success': True, 'auth_key': auth_key, 'username': username})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'})


#POST request to change username on profile page
@app.route('/api/profile/name', methods=['POST'])
def update_username():
    
    session_token = request.headers.get('Authorization')
    
    if check_auth_key(session_token):
        data = request.get_json()
        old_username = data.get("oldUsername")
        new_username = data.get("newUsername")
    
        
        # update username where the username was X before
        query_db('UPDATE users SET name = ? WHERE name = ?;', [new_username, old_username])
        return jsonify({'success': True, 'message': 'Username updated successfully', 'newUsername': new_username})
    else:
        # Return error response if API key/ SESSION is invalid (if no session key?)
        return jsonify({'success': False, 'message': 'Invalid API key'})


#POST request to change the user's password on the profile page
@app.route('/api/profile/pass', methods=['POST'])
def update_password():
    session_token = request.headers.get('Authorization')
    
    if check_auth_key(session_token):
        data = request.get_json()
        
        new_pass = data.get("newPassword")
        username = data.get("username")
        
        query_db('UPDATE users SET password = ? WHERE name = ?;', [new_pass, username])
        return jsonify({'success': True, 'message': 'Username updated successfully'})
    else:
        # Return error response if API key is invalid
        return jsonify({'success': False, 'message': 'Invalid API key'})    
    
    
#POST to post a new message to the channel
@app.route('/api/channels/<int:channel_id>/messages', methods=['POST'])
def post_message(channel_id):
    data = request.get_json()
    
    session_token = request.headers.get('Authorization')
    
    if check_auth_key(session_token):
        message = data.get("newMessage")
        username = data.get("username")
        
        # Retrieve user_id from the database
        user_id = query_db('SELECT id FROM users WHERE name = ?', [username], one=True)
        
        if user_id:
            # Insert the message into the messages table
            query_db('INSERT INTO messages (body, user_id, channel_id) VALUES (?, ?, ?)', [message, user_id['id'], channel_id])
            print('POSTED MESSAGE')
        else:
            print('User not found')
    
    return {}

#TODO:
#POST request to change the name of a channel (authenticated users)




#TODO:
#POST request to reply to a thread of messages
@app.route('/api/channels/replies/<int:reply_id>/messages', methods=['POST'])
def post_thread_reply(reply_id):
    
    session_token = request.headers.get('Authorization')
    data = request.get_json()
    
    if check_auth_key(session_token):
        
        message = data.get("body") 
        username = data.get("username")
        parent_id = data.get("replies_to")
        
        # Retrieve user_id from the database
        user_id = query_db('SELECT id FROM users WHERE name = ?', [username], one=True)
        
        channel_id = query_db('SELECT id FROM messages WHERE id = ?', [parent_id], one=True)
        
        if user_id:

            # Insert the new reply into the messages table with replies_to 
            query_db('INSERT INTO messages (body, user_id, channel_id, replies_to) VALUES (?, ?, ?, ?)', [message, user_id['id'], channel_id['id'], parent_id])
            print('POSTED MESSAGE')
        else:
            print('User not found')
        
    return {}



#POST request to add a new channel into the database (and return the ID?)
@app.route('/api/channels/newchannel', methods=['POST'])
def create_new_channel():
    
    session_token = request.headers.get('Authorization')
    
    if check_auth_key(session_token):
        current_channel_count = query_db('SELECT COUNT(*) AS total_count FROM channels')[0]
        
        value = current_channel_count['total_count']

        new_channel_name = f'Channel {value + 1}'
        
        c = query_db('INSERT INTO channels (name) VALUES (?)', [new_channel_name])

        new_channel_id = value + 1
        
        return jsonify({"success": True, "channel_id": new_channel_id})


#GET request to grab all of the channel's and list them in the sidebar 
@app.route('/api/channels/info', methods=['GET'])
def get_rooms():
    rooms = query_db('SELECT * FROM channels;', args=(), one=False)

    if rooms:
        rooms_list = [{"id": room["id"], "name": room["name"]}
                      for room in rooms]
        return jsonify({"success": True, "rooms": rooms_list})
    else:
        return jsonify({"success": False, "message": "No Rooms Found"}), 404
 

# GET request to grab a channels's information (upon click)
@app.route('/api/channels/<int:channel_id>/messages', methods=['GET'])
def get_channel_messages(channel_id):
    messages = query_db("SELECT messages.id, messages.body, messages.user_id, messages.channel_id, messages.replies_to, users.name AS name FROM messages JOIN users ON messages.user_id = users.id  WHERE messages.channel_id = ?;", [channel_id])
    
    if not messages:
        return jsonify({"success": False, "message": "No messages found for this room."}), 404
    else:
        messages_lst = []
        
        # Loop through SQL lite row objects and create list of dicts
        for row in messages:
            messages_dict = {}
            messages_dict['id'] = row['id']
            messages_dict ['user_id'] = row['user_id'] 
            messages_dict['channel_id'] = row['channel_id']
            messages_dict['body'] = row['body']
            messages_dict['author'] = row['name']
            
            if row['replies_to'] is None:
                messages_dict['replies_count'] = 0
            else:
                messages_dict['replies_count'] = 0
            
            messages_lst.append(messages_dict)
        return jsonify(messages_lst)



# GET request to check if a channel id exists in the database
@app.route('/api/channels/<int:channel_id>/valid', methods=['GET'])
def get_room_id(channel_id):
    
    channels = query_db('SELECT * FROM channels WHERE id = ?', [channel_id], one=True)
    print(channels)
    if channels:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Room not found"}), 404    


# GET request to get display all the messages (and reactions, and threads) in a channel
@app.route('/api/channels/replies/<int:reply_id>/messages', methods=['GET'])
def show_thread_messages(reply_id):
    
    parent_message = query_db("SELECT channel_id FROM messages WHERE id = ?;", [reply_id], one=True)
    
    parent_channel_id = parent_message['channel_id']
    
    # reply id to get the channel then show all of those messages
    messages = query_db("SELECT messages.id, messages.body, messages.user_id, messages.channel_id, messages.replies_to, users.name AS author FROM messages JOIN users ON messages.user_id = users.id  WHERE messages.channel_id = ? AND messages.replies_to IS NULL;", [parent_channel_id])
    
    if not messages:
        return jsonify({"success": False, "message": "No messages found for this room."}), 404
    else:
        messages_lst = []
        
        # Loop through SQL lite row objects and create list of dicts
        for row in messages:
            messages_dict = {}
            messages_dict['id'] = row['id']
            messages_dict ['user_id'] = row['user_id'] 
            messages_dict['channel_id'] = row['channel_id']
            messages_dict['body'] = row['body']
            messages_dict['author'] = row['author']
            messages_dict['replies_count'] = 0
            
            
            messages_lst.append(messages_dict)
            
        return jsonify(messages_lst)
    
 
 
# GET request for the channels in the threads page 
@app.route('/api/channels/replies/getchannels', methods=['GET'])
def get_thread_channels():
    
    rooms = query_db('SELECT * FROM channels;', args=(), one=False)

    if rooms:
        rooms_list = [{"id": room["id"], "name": room["name"]}
                      for room in rooms]
        return jsonify({"success": True, "rooms": rooms_list})
    else:
        return jsonify({"success": False, "message": "No Rooms Found"}), 404
 

# Get request to open and show replies
@app.route('/api/channels/replies/<int:reply_id>/getmessages', methods=['GET'])
def get_replies(reply_id):
    
    
    replies = query_db('SELECT messages.id, messages.user_id, messages.channel_id, messages.body, messages.replies_to, users.name AS name FROM messages JOIN users ON messages.user_id = users.id  WHERE messages.replies_to = ?;', [reply_id])
    
    if replies:
        reply_lst = []
        
        # Loop through SQL lite row objects and create list of dicts
        for row in replies:
            reply_dict = {}
            reply_dict['id'] = row['id']
            reply_dict ['user_id'] = row['user_id'] 
            reply_dict['channel_id'] = row['channel_id']
            reply_dict['body'] = row['body']
            reply_dict['author'] = row['name']
            reply_dict['replies_to'] = reply_id
            
            reply_lst.append(reply_dict)
        
        
        return jsonify(reply_lst)
    else: 
        return {}