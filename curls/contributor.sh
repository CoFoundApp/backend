#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new project and store its ID
echo "Creating a new project..."
CREATE_PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/projects" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "startingDate": "2025-01-01T08:00:00.000Z",
        "endingDate": "2025-12-31T17:00:00.000Z",
        "description": "A sample project description.",
        "title": "Sample Project"
    }')
handle_response "$CREATE_PROJECT_RESPONSE"

# Extract project ID from the response
PROJECT_ID=$(echo "$CREATE_PROJECT_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
  echo "Failed to create project or retrieve project ID. Exiting..."
  exit 1
fi
echo "Project created with ID: $PROJECT_ID"

# 2. Create a new contributor
echo "Creating a new contributor..."
CREATE_CONTRIBUTOR_RESPONSE=$(curl -s -X POST "$BASE_URL/contributors" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": 123,
        \"projectId\": $PROJECT_ID,
        \"startingDate\": \"2025-01-01T09:00:00.000Z\",
        \"endingDate\": \"2025-12-31T18:00:00.000Z\",
        \"role\": \"Developer\",
        \"mission\": \"Backend Development\"
    }")
handle_response "$CREATE_CONTRIBUTOR_RESPONSE"

# 3. Retrieve all contributors for the project
echo "Retrieving all contributors for project ID $PROJECT_ID..."
GET_ALL_CONTRIBUTORS_RESPONSE=$(curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/contributors" -H "Content-Type: application/json")
handle_response "$GET_ALL_CONTRIBUTORS_RESPONSE"

# 4. Retrieve contributor by ID (Assuming ID 1 for this example)
echo "Retrieving contributor by ID (id=1)..."
GET_CONTRIBUTOR_RESPONSE=$(curl -s -X GET "$BASE_URL/contributors/1" -H "Content-Type: application/json")
handle_response "$GET_CONTRIBUTOR_RESPONSE"

# 5. Update contributor by ID
echo "Updating contributor with ID 1..."
UPDATE_CONTRIBUTOR_RESPONSE=$(curl -s -X PUT "$BASE_URL/contributors/1" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": 123,
        \"projectId\": $PROJECT_ID,
        \"startingDate\": \"2025-01-01T09:00:00.000Z\",
        \"endingDate\": \"2025-06-30T18:00:00.000Z\",
        \"role\": \"Lead Developer\",
        \"mission\": \"Fullstack Development\"
    }")
handle_response "$UPDATE_CONTRIBUTOR_RESPONSE"

# 6. Delete contributor by ID
echo "Deleting contributor with ID 1..."
DELETE_CONTRIBUTOR_RESPONSE=$(curl -s -X DELETE "$BASE_URL/contributors/1" -H "Content-Type: application/json")
handle_response "$DELETE_CONTRIBUTOR_RESPONSE"

# 7. Delete all contributors
echo "Deleting all contributors..."
DELETE_ALL_CONTRIBUTORS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/contributors" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_CONTRIBUTORS_RESPONSE"

# 8. Confirm deletion by retrieving all contributors for project ID $PROJECT_ID
echo "Retrieving all contributors after deletion..."
GET_ALL_CONTRIBUTORS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/contributors" -H "Content-Type: application/json")
handle_response "$GET_ALL_CONTRIBUTORS_AFTER_DELETION"

echo "Script execution completed."
