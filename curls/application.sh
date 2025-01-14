#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a valid application
echo "Creating a valid application..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Valid application description",
    "userId": 1,
    "projectId": 101
  }')
handle_response "$CREATE_RESPONSE"

# Extract application ID
APP_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
if [ -z "$APP_ID" ]; then
  echo "Failed to create application. Exiting..."
  exit 1
fi
echo "Application created with ID: $APP_ID"

# 2. Create an invalid application
echo "Creating an invalid application (missing required fields)..."
INVALID_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "isRefused": false
  }')
handle_response "$INVALID_CREATE_RESPONSE"

# 3. Retrieve all applications
echo "Retrieving all applications..."
GET_ALL_RESPONSE=$(curl -s -X GET "$BASE_URL/applications" -H "Content-Type: application/json")
handle_response "$GET_ALL_RESPONSE"

# 4. Retrieve the created application by ID
echo "Retrieving the created application by ID ($APP_ID)..."
GET_BY_ID_RESPONSE=$(curl -s -X GET "$BASE_URL/applications/$APP_ID" -H "Content-Type: application/json")
handle_response "$GET_BY_ID_RESPONSE"

# 5. Update the application with valid data
echo "Updating the application with valid data..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "isRefused": true,
    "isAccepted": false,
    "description": "Updated application description",
    "userId": 2,
    "projectId": 102
  }')
handle_response "$UPDATE_RESPONSE"

# 6. Update the application with invalid data
echo "Updating the application with invalid data..."
INVALID_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "isAccepted": "invalid_boolean"
  }')
handle_response "$INVALID_UPDATE_RESPONSE"

# 7. Delete the application by ID
echo "Deleting the application by ID ($APP_ID)..."
DELETE_BY_ID_RESPONSE=$(curl -s -X DELETE "$BASE_URL/applications/$APP_ID" -H "Content-Type: application/json")
handle_response "$DELETE_BY_ID_RESPONSE"

# 8. Attempt to retrieve the deleted application
echo "Retrieving the deleted application to confirm deletion..."
GET_DELETED_RESPONSE=$(curl -s -X GET "$BASE_URL/applications/$APP_ID" -H "Content-Type: application/json")
handle_response "$GET_DELETED_RESPONSE"

# 9. Delete all applications
echo "Deleting all applications..."
DELETE_ALL_RESPONSE=$(curl -s -X DELETE "$BASE_URL/applications" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_RESPONSE"

# 10. Attempt to retrieve all applications after deletion
echo "Retrieving all applications after deletion..."
GET_ALL_AFTER_DELETE=$(curl -s -X GET "$BASE_URL/applications" -H "Content-Type: application/json")
handle_response "$GET_ALL_AFTER_DELETE"

echo "Script execution completed."
