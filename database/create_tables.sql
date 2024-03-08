-- users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(40) UNIQUE NOT NULL,
    password VARCHAR(40) NOT NULL
);

-- channels table
CREATE TABLE channels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

-- messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    body TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    replies_to INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (replies_to) REFERENCES messages(id)
);

-- message reactions
CREATE TABLE reactions (
    id INTEGER PRIMARY KEY,
    emoji TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- user message interactions
CREATE TABLE user_message_interaction (
    user_id INTEGER,
    message_id INTEGER,
    channel_id INTEGER,
    last_seen_timestamp DATETIME,
    PRIMARY KEY (user_id, message_id, channel_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);
