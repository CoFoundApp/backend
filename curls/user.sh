#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Function to handle responses
handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new user
echo "Creating a new user..."
CREATE_USER_RESPONSE=$(curl -X POST http://localhost:3000/api/users \
                         -H "Content-Type: application/json" \
                         -d '{
                           "isAdmin": true,
                           "email": "test@example.com",
                           "lastName": "Doe",
                           "firstName": "John",
                           "password": "password123",
                           "phoneNumber": 1234567890,
                           "username": "johndoe"
                         }'
)
handle_response "$CREATE_USER_RESPONSE"

# 2. Retrieve all users
echo "Retrieving all users..."
GET_ALL_USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users" -H "Content-Type: application/json")
handle_response "$GET_ALL_USERS_RESPONSE"

# 3. Get user by ID
echo "Retrieving user by ID (id=1)..."
GET_USER_RESPONSE=$(curl -s -X GET "$BASE_URL/users/1" -H "Content-Type: application/json")
handle_response "$GET_USER_RESPONSE"

# 4. Update user by ID
echo "Updating user with ID 1..."
UPDATE_USER_RESPONSE=$(curl -X PUT http://localhost:3000/api/users/1 \
                         -H "Content-Type: application/json" \
                         -d '{
                           "isAdmin": true,
                           "email": "updated@example.com",
                           "lastName": "Smith",
                           "firstName": "Jane",
                           "password": "newpassword",
                           "phoneNumber": 9876543210,
                           "username": "janesmith"
                         }'
)
handle_response "$UPDATE_USER_RESPONSE"

# 5. Delete user by ID
echo "Deleting user with ID 1..."
DELETE_USER_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/1" -H "Content-Type: application/json")
handle_response "$DELETE_USER_RESPONSE"

# 6. Delete all users
echo "Deleting all users..."
DELETE_ALL_USERS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_USERS_RESPONSE"

# 7. Retrieve all users again to confirm deletion
echo "Retrieving all users after deletion..."
GET_ALL_USERS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/users" -H "Content-Type: application/json")
handle_response "$GET_ALL_USERS_AFTER_DELETION"

echo "Script execution completed."