// Page constants references the other pages in the app
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const CHANNELS = document.querySelector(".channels");
const THREAD = document.querySelector(".threads")



// run with flask run --reload --debug

// ----------------------------- Navigation Functions --------------------------

let showThis = (element) => {
    SPLASH.classList.add("hide");
    PROFILE.classList.add("hide");
    LOGIN.classList.add("hide");
    CHANNELS.classList.add("hide");
    THREAD.classList.add("hide");
  
    element.classList.remove("hide");
  }



function handleNavigation() {
    const path = window.location.pathname;
    const user = localStorage.getItem('username');
    const auth_key = localStorage.getItem('aichacamara_auth_key');

    if (path === "/") {
        if (!auth_key) {
            rememberDestination(path)
            showThis(LOGIN);
        } else {
            window.location.href = '/channels/1'
        }
    } else if (path === "/profile") {
        if (!auth_key) {
            rememberDestination(path)
            showThis(LOGIN);
        } else {
            document.querySelectorAll(".username").forEach(usernameElement => {
                usernameElement.textContent = `${user}`;
            });
            showThis(PROFILE);
        }
    } else if (path === "/login") {
        if (!auth_key) {
            rememberDestination(path)
            showThis(LOGIN);
        } else {
            window.location.href = '/channels/1'
        }
    } else if (path.startsWith("/channels/replies/")) {
        if (!auth_key) {
            rememberDestination(path)
            showThis(LOGIN);
        } else {
            showThis(THREAD);
            document.querySelectorAll(".username").forEach(usernameElement => {
                usernameElement.textContent = `${user}`;
            });
        }
    } else if (path.startsWith("/channels/")) {
        if (!auth_key) {
            rememberDestination(path)
            showThis(LOGIN);
        } else {
            const channelID = path.split('/channels/')[1];
            isValidChannel(channelID)
                .then(isValid => {
                    if (isValid) {
                        startQuerying(channelID);
                        showThis(CHANNELS);
                        displayChannels();
                        fetchMessages(channelID)
                        document.querySelectorAll(".username").forEach(usernameElement => {
                            usernameElement.textContent = `${user}`;
                        });
                    } else {
                        window.location.href = '/404.html';
                    }
                })
                .catch(error => {
                    console.error("Error validating channel:", error);
                    window.location.href = '/404.html';
                });
        }
    }
}

  


//---------------------------- Click Events -----------------------------------

function handleUIClickEvents() {


    const signupButton = document.getElementById("signup-button")
        signupButton.addEventListener("click", () => {
        handleUserSignup();
    })

    const loginButton = document.getElementById("login-button")
    loginButton.addEventListener('click', () => {
        handleUserLogin() 
      });
    
    const signupGo = document.getElementById("signup-go")
    signupGo.addEventListener("click", () =>
        window.location.href = "/login")

    const loginGo = document.getElementById("login-go")
    loginGo.addEventListener("click", () => 
        window.location.href = "/login")

    const logoutButton = document.getElementById("logout-button")
        logoutButton.addEventListener('click', () => {
            handleLogOut() 
        });

    const profileButton1 = document.getElementById("profile-btn")
        profileButton1.addEventListener("click", () => 
        window.location.href = "/profile")

    const profileButton2 = document.getElementById("profile-btn-2")
        profileButton2.addEventListener("click", () => 
        window.location.href = "/profile")

    const return1 = document.getElementById("go-back")
        return1.addEventListener("click", () => 
        window.location.href = "/channels/1")

    
    const updateUser = document.getElementById('updateuser');
    // Add event listener to update user button
    updateUser.addEventListener('click', () => {
        updateUsername();
    });
    
    const updatePass = document.getElementById('updatepass');
    // Add event listener to update password button
    updatePass.addEventListener('click', () => {
        updatePassword();
    });

    const postNewMessage = document.getElementById('post-message');
        postNewMessage.addEventListener('click', () => {
        postMessage();
    })

    const addChannelButton = document.getElementById("create-channel");
    const addChannelButton2 = document.getElementById("create-channel2");
        addChannelButton.addEventListener('click', () => {
            handleNewChannel();
            })
        addChannelButton2.addEventListener('click', () => {
        handleNewChannel();
        })

}



// ---------------------------- Sign Up Function -------------------------------

function handleUserSignup() {

    fetch('/api/signup',{
      method: 'POST',
      headers: {
        'Content-type':'application/json'}
    }).then(response => response.json())
    .then(data => {
  
    localStorage.setItem('username', data.name);
    localStorage.setItem('aichacamara_auth_key', data.auth_key);
  
      //TODO: IF THE USER was trying to go to another page before login do that
      window.location.href = "/profile";
    })
  }
  


// ---------------------------- Login Function ---------------------------------

function handleUserLogin() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    fetch('/api/loginuser', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            const auth_key = data.auth_key;
            const username = data.username;

            localStorage.setItem('aichacamara_auth_key', auth_key);
            localStorage.setItem('username', username);

            const rememberedDestination = getRememberedDestination();
            if (rememberedDestination) {
                window.location.href = rememberedDestination;
                // Clear the remembered destination after redirecting
                localStorage.removeItem('destination');
            } else {
                // Redirect to the default destination
                window.location.href = '/channels/1';
            }
        } else {
            // Handle failed login attempt
            console.error(data.message);
            document.querySelector(".failed").style.display = "";
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


// ---------------------------- Logout Function --------------------------------

function handleLogOut () {
    // Remove AUTH_KEY Key and username from local storage and return the user to the LOGIN page
    localStorage.removeItem("aichacamara_auth_key");
    localStorage.removeItem("username");
    
    // Redirect User to Login Page
    window.location.href = "/login";
  }


// ------------------------- Document User History -----------------------------


// Function to allow page navigation documentation
function documentHistory() {
    const currentPage = window.location.pathname;
    const currentPageState = { page: currentPage };
    history.pushState(currentPageState, '', currentPage);
  
    console.log("Current page:", currentPage);
    console.log("Page state:", currentPageState);
  }
  
  
  // Event listener to document history on page navigation
  window.addEventListener('popstate', () => {
    documentHistory();
  });
  
  
  // Remembers the users destination if redirected 
  function rememberDestination(destination) {
    localStorage.setItem('destination', destination);
    console.log("location remembered!")
  }
  
  
  // Grabs the remembered destination
  function getRememberedDestination() {
    const destination = localStorage.getItem('destination');
    localStorage.removeItem('destination');
    return destination;
  }
  


// ----------------- Update Username and Password Functions --------------------


function updateUsername() {

    const authKey = localStorage.getItem('aichacamara_auth_key');
    const oldUsername = localStorage.getItem('username')
    const newUsername = document.getElementById('profileuser').value;
  
    fetch('/api/profile/name', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': authKey
          },
          body: JSON.stringify({ 
            newUsername: newUsername,
            oldUsername: oldUsername
          })
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to update username');
        }
        return response.json();
      })
      .then(data => {
        // Update local storage with the new username
        localStorage.removeItem("username");
        localStorage.setItem('username', data.newUsername);
        location.reload();
      })
    }
  
  

  function updatePassword() {
  
    const authKey = localStorage.getItem('aichacamara_auth_key');
    const newPassword = document.getElementById('profilepass').value;
    const username = localStorage.getItem('username')
  
    fetch('/api/profile/pass', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': authKey
      },
      body: JSON.stringify({ 
        newPassword: newPassword,
        username: username
      })
  }).then(response => {
    if (!response.ok) {
      throw new Error('Failed to update password');
    }
    return response.json();
  })
  .then(data => {
    // Password updated!
    console.log('Password updated successfully');
  })}
  


// -----------------Post Messages & Channel Polling ----------------------------

function startQuerying(channelID) {
    fetchMessages(channelID);
    queryInterval = setInterval(() => {
      fetchMessages(channelID);
    }, 500); 
  }
  
  
  let stopQuerying = () => {
    clearInterval(queryInterval);
  }


function postMessage() {
    const path = window.location.pathname;
  
    const channelID = path.split('/channels/')[1];
    const newMessage = document.getElementById("textInput").value;
    const authKey = localStorage.getItem("aichacamara_auth_key")
    const username = localStorage.getItem("username")
  
    fetch(`/api/channels/${channelID}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-type':'application/json',
        'Authorization': authKey
      },
      
      body:JSON.stringify({ 
        newMessage: newMessage,
        channel_id: channelID,
        username: username
      })
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to post message');
      }
      console.log(response)
      // If the message is successfully posted, fetch and display updated messages
      fetchMessages(channelID);
    })
    .catch(error => {
      console.error('Error posting message:', error);
    });
  }


  function fetchMessages(channelID) {
    fetch(`/api/channels/${channelID}/messages`)
      .then(response => response.json())
      .then(messages => {
        // Check if there are actual messages
        if (messages.length === 0) {
          clearDummyMessages(); // Clear dummy messages
        } else {
          displayMessages(messages); // Display actual messages
        }
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
      });
  }

  function displayNoMessagesMessage() {
    // Get the element where you want to display the message
    const messagesContainer = document.getElementById('message-box');
    // Create a message element
    const messageElement = document.createElement('p');
    messageElement.textContent = 'No messages yet. You are the first!';
    // Append the message element to the container
    messagesContainer.appendChild(messageElement);
}

  
  function displayMessages(messages) {
    let ChatDiv = document.getElementById("message-box");
    ChatDiv.innerHTML = ""; 
    console.log(messages)
  
    messages.forEach(single_message => {
      let messageElement = document.createElement("message");
  
      let authorElement = document.createElement("author");
      authorElement.textContent = single_message.author;
  
      let contentElement = document.createElement("content");
      contentElement.textContent = single_message.body;

      let buttonElement = document.createElement("button");
      buttonElement.textContent = `${single_message.replies_count} replies`

      messageElement.appendChild(authorElement);
      //messageElement.appendChild(document.createElement('br'));
      messageElement.appendChild(contentElement);
      messageElement.appendChild(buttonElement)
      messageElement.appendChild(document.createElement('br'))
      messageElement.appendChild(document.createElement('br'))

      const replyButtons = [
        { id: 'thumbsup', emoji: '👍', count: 0 },
        { id: 'thumbsdown', emoji: '👎', count: 0 },
        { id: 'lol', emoji: '😂', count: 0 },

      ]

      replyButtons.forEach(button => {
        const buttonElement = document.createElement('button');
        buttonElement.classList.add('reaction');
        buttonElement.id = button.id;
        buttonElement.textContent = `${button.count} ${button.emoji}`;
        messageElement.appendChild(buttonElement);
    });
  
   
        const separator = document.createElement('hr');
        messageElement.appendChild(separator)
  
      // Append the message element to the chat container
      ChatDiv.appendChild(messageElement);
      
    });
  }



  function clearDummyMessages() {
    let noMessagesDiv = document.getElementById("messages-2col");
    noMessagesDiv.innerHTML = ""; // Clear the container
    noMessagesDiv.style.display = "block";
  }  



// ----------------------------- Display Channel Info --------------------------

// Function to check if a channel ID is valid and show 404.html page if not
async function isValidChannel(channelID) {
    try {
        // Fetch the chhannel info from the server
        const response = await fetch(`/api/channels/${channelID}/valid`);
        const data = await response.json();
        
        // Check if the response indicates success and contains room information
        return data.success;
    } catch (error) {
        console.error('Error checking channel ID:', error);
        return false; 
    }
  }


function displayChannels() {
    fetch('/api/channels/info').then(response => response.json()) 
    .then(data => {
      if (data.success) {

        const channelsContainer = document.getElementById('channels-2col');
            channelsContainer.innerHTML = ''; // Clear previous content
            
            // Loop through each channel and create HTML elements
            data.rooms.forEach(channel => {
                const channelOption = document.createElement('div');
                channelOption.classList.add('channel-option');
                channelOption.setAttribute('number', channel.id);

                const nameElement = document.createElement('name');
                nameElement.textContent = channel.name;

                const unreadElement = document.createElement('unread');
                unreadElement.textContent = '0 unread';;

                // Append name and unread elements to the channel option
                channelOption.appendChild(nameElement);
                channelOption.appendChild(document.createElement('br')); // Add line break
                channelOption.appendChild(unreadElement);

                // Append channel option to the channels container
                channelsContainer.appendChild(channelOption);

      channelOption.addEventListener('click', () => {
        roomID = channel.id
        console.log(`Going to channel ${roomID} !`);
        window.location.href = `/channels/${roomID}`
        fetchMessages(roomID)
      });
    });
  } else {
    console.log(data.message)   
  }
})
    .catch(error => {
      console.error('Error fetching channels:', error);
    });
  }


//  POST to create a new channel
function handleNewChannel() {  
    const authKey = localStorage.getItem("aichacamara_auth_key")
  
    fetch('/api/channels/newchannel',
    {
      method: 'POST',
      headers: {
        'Content-type':'application/json',
        'Authorization': authKey
      }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to create new channel');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log(data)
            const newChannelId = data.channel_id;
            // Redirect to the new channel page
            window.location.href = `/channels/${newChannelId}`;
        } else {
            console.error('Failed to create new channel:', data.message);
            // Optionally handle the failure case
        }
    })
    .catch(error => {
        console.error('Error creating new channel:', error);
        // Optionally handle the error
    });
}


// ----------------------------- Page Load Functions ---------------------------

window.addEventListener("DOMContentLoaded", () => {
    handleUIClickEvents();
    handleNavigation();
})

window.addEventListener("popstate", () => {
    stopQuerying();
})