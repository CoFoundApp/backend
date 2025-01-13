#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# Create a new profile
echo "Creating a new profile..."
CREATE_PROFILE_RESPONSE=$(curl -X POST "$BASE_URL/profiles" \
    -H "Content-Type: application/json" \
    -d '{
        "id": 1,
        "notifEmail": true,
        "notifPhone": false,
        "availability": "full-time",
        "location": "Remote",
        "userId": 123,
        "notifPush": true
    }')
handle_response "$CREATE_PROFILE_RESPONSE"

# Retrieve all profiles
echo "Retrieving all profiles..."
GET_ALL_PROFILES_RESPONSE=$(curl -s -X GET "$BASE_URL/profiles" -H "Content-Type: application/json")
handle_response "$GET_ALL_PROFILES_RESPONSE"

# Retrieve profile by ID
echo "Retrieving profile by ID (id=1)..."
GET_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/profiles/1" -H "Content-Type: application/json")
handle_response "$GET_PROFILE_RESPONSE"

# Update profile by ID
echo "Updating profile with ID 1..."
UPDATE_PROFILE_RESPONSE=$(curl -X PUT "$BASE_URL/profiles/1" \
    -H "Content-Type: application/json" \
    -d '{
        "notifEmail": false,
        "notifPhone": true,
        "availability": "part-time",
        "location": "On-site",
        "notifPush": false
    }')
handle_response "$UPDATE_PROFILE_RESPONSE"

# Delete profile by ID
echo "Deleting profile with ID 1..."
DELETE_PROFILE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/profiles/1" -H "Content-Type: application/json")
handle_response "$DELETE_PROFILE_RESPONSE"

# Confirm deletion by retrieving all profiles
echo "Retrieving all profiles after deletion..."
GET_ALL_PROFILES_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/profiles" -H "Content-Type: application/json")
handle_response "$GET_ALL_PROFILES_AFTER_DELETION"

echo "Script execution completed."
