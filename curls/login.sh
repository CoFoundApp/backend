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

# 2. Log in with the created user
echo "Logging in with the created user..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "ctestser@example.com",
        "password": "password123"
    }')
handle_response "$LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "Validating the token..."
CHECK_TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/login/checkToken" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$TOKEN\"
    }")
handle_response "$CHECK_TOKEN_RESPONSE"
echo "Deleting the created user..."
DELETE_USER_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$USER_ID" -H "Content-Type: application/json")

echo "Script execution completed."
