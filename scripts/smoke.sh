#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
created=$(curl --fail-with-body -sS "$BASE/api/sessions" -H 'Content-Type: application/json' -d '{"prompt":"How might we make campus life better?","teamName":"Smoke test"}')
id=$(jq -er '.sessionId' <<<"$created")
jq -e '.axes | length >= 4' <<<"$created" >/dev/null
curl --fail-with-body -sS "$BASE/api/sessions/$id/ideas" -H 'Content-Type: application/json' -d '{"texts":["An app with campus event reminders","An app with reminders for campus events","Campus events reminder app"],"source":"typed"}' | jq -e '.allIdeas | length == 3' >/dev/null
curl --fail-with-body -sS "$BASE/api/sessions/$id/ideas" -H 'Content-Type: application/json' -d '{"texts":["Campus calendar notification app","A phone app to notify students about events","A campus events app with alerts"],"source":"typed"}' | jq -e '.allIdeas | length == 6' >/dev/null
state=$(curl --fail-with-body -sS "$BASE/api/sessions/$id/state")
jq -e '(.ideas | length == 6) and (.provocations | length >= 1) and (.diversity >= 0 and .diversity <= 100)' <<<"$state" >/dev/null
provocation=$(jq -er '.provocations[0].id' <<<"$state")
curl --fail-with-body -sS -X PATCH "$BASE/api/provocations/$provocation" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq -e '.ok == true' >/dev/null
jq '{session: .session.id, diversity, questions: [.provocations[].text]}' <<<"$state"
echo 'Backend smoke passed.'
