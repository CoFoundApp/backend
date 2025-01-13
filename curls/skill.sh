#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new skill
echo "Creating a new skill..."
CREATE_SKILL_RESPONSE=$(curl -X POST "$BASE_URL/skills" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "JavaScript"
    }')
handle_response "$CREATE_SKILL_RESPONSE"

# 2. Retrieve all skills
echo "Retrieving all skills..."
GET_ALL_SKILLS_RESPONSE=$(curl -s -X GET "$BASE_URL/skills" -H "Content-Type: application/json")
handle_response "$GET_ALL_SKILLS_RESPONSE"

# 3. Retrieve skill by ID
echo "Retrieving skill by ID (id=1)..."
GET_SKILL_RESPONSE=$(curl -s -X GET "$BASE_URL/skills/1" -H "Content-Type: application/json")
handle_response "$GET_SKILL_RESPONSE"

# 4. Update skill by ID
echo "Updating skill with ID 1..."
UPDATE_SKILL_RESPONSE=$(curl -X PUT "$BASE_URL/skills/1" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "TypeScript"
    }')
handle_response "$UPDATE_SKILL_RESPONSE"

# 5. Delete skill by ID
echo "Deleting skill with ID 1..."
DELETE_SKILL_RESPONSE=$(curl -s -X DELETE "$BASE_URL/skills/1" -H "Content-Type: application/json")
handle_response "$DELETE_SKILL_RESPONSE"

# 6. Delete all skills
echo "Deleting all skills..."
DELETE_ALL_SKILLS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/skills" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_SKILLS_RESPONSE"

# 7. Confirm deletion by retrieving all skills
echo "Retrieving all skills after deletion..."
GET_ALL_SKILLS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/skills" -H "Content-Type: application/json")
handle_response "$GET_ALL_SKILLS_AFTER_DELETION"

echo "Script execution completed."
