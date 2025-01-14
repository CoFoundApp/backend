#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new user
echo "Creating a new user..."
CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "ctestser@example.com",
        "password": "password123",
        "firstName": "John",
        "lastName": "Doe",
        "username": "jc20",
        "isAdmin": false
    }')
handle_response "$CREATE_USER_RESPONSE"

# Extract user ID from the response
USER_ID=$(echo "$CREATE_USER_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
echo "User ID: $USER_ID"
if [ -z "$USER_ID" ]; then
  echo "Failed to create user. Exiting..."
  echo "Deleting all users..."
  DELETE_ALL_USERS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users" -H "Content-Type: application/json")
  exit 1
fi
echo "User created with ID: $USER_ID"

# 2. Log in with the created user (email)
echo "Logging in with the created user (email)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "ctestser@example.com",
        "password": "password123"
    }')
handle_response "$LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

# 3. Log in with the created user (username)
echo "Logging in with the created user (username)..."
LOGIN_USERNAME_RESPONSE=$(curl -s -X POST "$BASE_URL/login/username" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "jc20",
        "password": "password123"
    }')
handle_response "$LOGIN_USERNAME_RESPONSE"

USERNAME_TOKEN=$(echo "$LOGIN_USERNAME_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

# 4. Validate the token (email login)
echo "Validating the token (email login)..."
CHECK_TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/login/checkToken" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$TOKEN\"
    }")
handle_response "$CHECK_TOKEN_RESPONSE"

# 5. Validate the token (username login)
echo "Validating the token (username login)..."
CHECK_USERNAME_TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/login/checkToken" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$USERNAME_TOKEN\"
    }")
handle_response "$CHECK_USERNAME_TOKEN_RESPONSE"

# 6. Delete the created user
echo "Deleting the created user..."
DELETE_USER_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$USER_ID" -H "Content-Type: application/json")
handle_response "$DELETE_USER_RESPONSE"

echo "Script execution completed."
