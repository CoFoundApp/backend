#!/bin/bash

BASE_URL="http://localhost:3000/api"

handle_response() {
  local response="$1"
  echo "Response: $response"
  echo "------------------------------------"
}

# 1. Create a new notification
echo "Creating a new notification..."
CREATE_NOTIFICATION_RESPONSE=$(curl -X POST "$BASE_URL/notifications" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "emitterProjectId": 456,
        "emitterUserId": 789,
        "link": "http://example.com",
        "seen": false,
        "description": "New notification example",
        "emissionDate": "2025-01-13T19:45:00.000Z"
    }')
handle_response "$CREATE_NOTIFICATION_RESPONSE"

# 2. Retrieve all notifications
echo "Retrieving all notifications..."
GET_ALL_NOTIFICATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications" -H "Content-Type: application/json")
handle_response "$GET_ALL_NOTIFICATIONS_RESPONSE"

# 3. Retrieve notification by ID
echo "Retrieving notification by ID (id=1)..."
GET_NOTIFICATION_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications/1" -H "Content-Type: application/json")
handle_response "$GET_NOTIFICATION_RESPONSE"

# 4. Update notification by ID
echo "Updating notification with ID 1..."
UPDATE_NOTIFICATION_RESPONSE=$(curl -X PUT "$BASE_URL/notifications/1" \
    -H "Content-Type: application/json" \
    -d '{
        "userId": 123,
        "emitterProjectId": 456,
        "emitterUserId": 789,
        "link": "http://example-updated.com",
        "seen": true,
        "description": "Updated notification example",
        "emissionDate": "2025-01-13T20:00:00.000Z"
    }')
handle_response "$UPDATE_NOTIFICATION_RESPONSE"

# 5. Delete notification by ID
echo "Deleting notification with ID 1..."
DELETE_NOTIFICATION_RESPONSE=$(curl -s -X DELETE "$BASE_URL/notifications/1" -H "Content-Type: application/json")
handle_response "$DELETE_NOTIFICATION_RESPONSE"

# 6. Delete all notifications
echo "Deleting all notifications..."
DELETE_ALL_NOTIFICATIONS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/notifications" -H "Content-Type: application/json")
handle_response "$DELETE_ALL_NOTIFICATIONS_RESPONSE"

# 7. Confirm deletion by retrieving all notifications
echo "Retrieving all notifications after deletion..."
GET_ALL_NOTIFICATIONS_AFTER_DELETION=$(curl -s -X GET "$BASE_URL/notifications" -H "Content-Type: application/json")
handle_response "$GET_ALL_NOTIFICATIONS_AFTER_DELETION"

echo "Script execution completed."
