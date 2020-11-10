#!/bin/bash

API="http://localhost:4741"
URL_PATH="/gemstones/:id"

curl "${API}${URL_PATH}/${ID}" \
  --include \
  --request PATCH \
  --header "Content-Type: application/json" \
--header "Authorization: Bearer ${TOKEN}" \
--data '{
  "gemstone": {
    "name": "'"${NAME}"'",
    "price": "'"${PRICE}"'",
    "owner": "'"${OWNER}"'"
    }
  }'

echo
