#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new project
echo "Creating a new project..."
CREATE_PROJECT_RESPONSE=$(curl -X POST "$BASE_URL/projects" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "startingDate": "2025-01-01T08:00:00.000Z",
        "endingDate": "2025-12-31T17:00:00.000Z",
        "description": "A sample project description.",
        "title": "Sample Project"
    }')
handle_response "$CREATE_PROJECT_RESPONSE"

# 2. Retrieve all projects
echo "Retrieving all projects..."
GET_ALL_PROJECTS_RESPONSE=$(curl -s -X GET "$BASE_URL/projects" -H "Content-Type: application/json")
handle_response "$GET_ALL_PROJECTS_RESPONSE"

# 3. Retrieve project by ID
echo "Retrieving project by ID (id=1)..."
GET_PROJECT_RESPONSE=$(curl -s -X GET "$BASE_URL/projects/1" -H "Content-Type: application/json")
handle_response "$GET_PROJECT_RESPONSE"

# 4. Update project by ID
echo "Updating project with ID 1..."
UPDATE_PROJECT_RESPONSE=$(curl -X PUT "$BASE_URL/projects/1" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "startingDate": "2025-01-01T08:00:00.000Z",
        "endingDate": "2025-06-30T17:00:00.000Z",
        "description": "Updated project description.",
        "title": "Updated Project Title"
    }')
handle_response "$UPDATE_PROJECT_RESPONSE"

# 5. Delete project by ID
echo "Deleting project with ID 1..."
DELETE_PROJECT_RESPONSE=$(curl -s -X DELETE "$BASE_URL/projects/1" -H "Content-Type: application/json")
handle_response "$DELETE_PROJECT_RESPONSE"

# 6. Delete all projects
echo "Deleting all projects..."
DELETE_ALL_PROJECTS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/projects" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_PROJECTS_RESPONSE"

# 7. Confirm deletion by retrieving all projects
echo "Retrieving all projects after deletion..."
GET_ALL_PROJECTS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/projects" -H "Content-Type: application/json")
handle_response "$GET_ALL_PROJECTS_AFTER_DELETION"

echo "Script execution completed."
