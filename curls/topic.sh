#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Function to handle responses
handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new topic
echo "Creating a new topic..."
CREATE_TOPIC_RESPONSE=$(curl -X POST "$BASE_URL/topics" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Technology"
    }')
handle_response "$CREATE_TOPIC_RESPONSE"

# 2. Retrieve all topics
echo "Retrieving all topics..."
GET_ALL_TOPICS_RESPONSE=$(curl -s -X GET "$BASE_URL/topics" -H "Content-Type: application/json")
handle_response "$GET_ALL_TOPICS_RESPONSE"

# 3. Get topic by ID
echo "Retrieving topic by ID (id=1)..."
GET_TOPIC_RESPONSE=$(curl -s -X GET "$BASE_URL/topics/1" -H "Content-Type: application/json")
handle_response "$GET_TOPIC_RESPONSE"

# 4. Update topic by ID
echo "Updating topic with ID 1..."
UPDATE_TOPIC_RESPONSE=$(curl -X PUT "$BASE_URL/topics/1" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Updated Technology"
    }')
handle_response "$UPDATE_TOPIC_RESPONSE"

# 5. Delete topic by ID
echo "Deleting topic with ID 1..."
DELETE_TOPIC_RESPONSE=$(curl -s -X DELETE "$BASE_URL/topics/1" -H "Content-Type: application/json")
handle_response "$DELETE_TOPIC_RESPONSE"

# 6. Delete all topics
echo "Deleting all topics..."
DELETE_ALL_TOPICS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/topics" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_TOPICS_RESPONSE"

# 7. Retrieve all topics again to confirm deletion
echo "Retrieving all topics after deletion..."
GET_ALL_TOPICS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/topics" -H "Content-Type: application/json")
handle_response "$GET_ALL_TOPICS_AFTER_DELETION"

echo "Script execution completed."
