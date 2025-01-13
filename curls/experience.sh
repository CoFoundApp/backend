#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new experience
echo "Creating a new experience..."
CREATE_EXPERIENCE_RESPONSE=$(curl -s -X POST "$BASE_URL/experiences" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "description": "Worked as a Backend Developer.",
        "startingDate": "2022-01-01T08:00:00.000Z",
        "endingDate": "2023-01-01T17:00:00.000Z",
        "title": "Backend Developer",
        "location": "Remote",
        "role": "Developer"
    }')
handle_response "$CREATE_EXPERIENCE_RESPONSE"

# Extract experience ID from the response
EXPERIENCE_ID=$(echo "$CREATE_EXPERIENCE_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
if [ -z "$EXPERIENCE_ID" ]; then
  echo "Failed to create experience or retrieve experience ID. Exiting..."
  exit 1
fi
echo "Experience created with ID: $EXPERIENCE_ID"

# 2. Retrieve all experiences
echo "Retrieving all experiences..."
GET_ALL_EXPERIENCES_RESPONSE=$(curl -s -X GET "$BASE_URL/experiences" -H "Content-Type: application/json")
handle_response "$GET_ALL_EXPERIENCES_RESPONSE"

# 3. Retrieve experience by ID
echo "Retrieving experience by ID (id=$EXPERIENCE_ID)..."
GET_EXPERIENCE_RESPONSE=$(curl -s -X GET "$BASE_URL/experiences/$EXPERIENCE_ID" -H "Content-Type: application/json")
handle_response "$GET_EXPERIENCE_RESPONSE"

# 4. Update experience by ID
echo "Updating experience with ID $EXPERIENCE_ID..."
UPDATE_EXPERIENCE_RESPONSE=$(curl -s -X PUT "$BASE_URL/experiences/$EXPERIENCE_ID" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "description": "Updated role to Fullstack Developer.",
        "startingDate": "2022-01-01T08:00:00.000Z",
        "endingDate": "2024-01-01T17:00:00.000Z",
        "title": "Fullstack Developer",
        "location": "On-site",
        "role": "Fullstack Developer"
    }')
handle_response "$UPDATE_EXPERIENCE_RESPONSE"

# 5. Delete experience by ID
echo "Deleting experience with ID $EXPERIENCE_ID..."
DELETE_EXPERIENCE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/experiences/$EXPERIENCE_ID" -H "Content-Type: application/json")
handle_response "$DELETE_EXPERIENCE_RESPONSE"

# 6. Delete all experiences
echo "Deleting all experiences..."
DELETE_ALL_EXPERIENCES_RESPONSE=$(curl -s -X DELETE "$BASE_URL/experiences" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_EXPERIENCES_RESPONSE"

# 7. Confirm deletion by retrieving all experiences
echo "Retrieving all experiences after deletion..."
GET_ALL_EXPERIENCES_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/experiences" -H "Content-Type: application/json")
handle_response "$GET_ALL_EXPERIENCES_AFTER_DELETION"

echo "Script execution completed."
