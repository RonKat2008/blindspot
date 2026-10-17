#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
created=$(curl --fail-with-body -sS "$BASE/api/sessions" -H 'Content-Type: application/json' -d '{"prompt":"How might we make campus life better?","teamName":"Smoke test"}')
id=$(jq -er '.sessionId' <<<"$created")
jq -e '.axes | length >= 4' <<<"$created" >/dev/null
curl --fail-with-body -sS "$BASE/api/sessions/$id/ideas" -H 'Content-Type: application/json' -d '{"texts":["An app with campus event reminders","An app with reminders for campus events","Campus events reminder app"],"source":"typed","positions":[{"x":120,"y":80},null,null],"color":"yellow"}' | jq -e '.allIdeas | length == 3' >/dev/null
curl --fail-with-body -sS "$BASE/api/sessions/$id/ideas" -H 'Content-Type: application/json' -d '{"texts":["Campus calendar notification app","A phone app to notify students about events","A campus events app with alerts"],"source":"typed"}' | jq -e '.allIdeas | length == 6' >/dev/null
state=$(curl --fail-with-body -sS "$BASE/api/sessions/$id/state")
# Slow question generation finishes after the POST response; poll for it.
for attempt in {1..30}; do
  if jq -e '.provocations | length >= 1' <<<"$state" >/dev/null; then break; fi
  sleep 1
  state=$(curl --fail-with-body -sS "$BASE/api/sessions/$id/state")
done
jq -e '(.ideas | length == 6) and (.provocations | length >= 1) and (.diversity >= 0 and .diversity <= 100) and (.ideas[0].board == {x:120,y:80}) and (.ideas[0].color == "yellow") and (.edges | type == "array") and (.clusters | type == "array") and (.islands | type == "array") and ([.ideas[] | has("embedding")] | any | not)' <<<"$state" >/dev/null
idea=$(jq -er '.ideas[0].id' <<<"$state")
curl --fail-with-body -sS -X PATCH "$BASE/api/ideas/$idea" -H 'Content-Type: application/json' -d '{"board":{"x":340,"y":-20}}' | jq -e '.ok == true' >/dev/null
curl --fail-with-body -sS "$BASE/api/sessions/$id/state" | jq -e '.ideas[0].board == {x:340,y:-20}' >/dev/null
bad_status=$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/ideas/$idea" -H 'Content-Type: application/json' -d '{"board":{"x":"bad","y":0}}')
[[ "$bad_status" == 400 ]]
# Metadata PATCH is independent of board positioning and accepts false to clear a shortlist.
curl --fail-with-body -sS -X PATCH "$BASE/api/ideas/$idea" -H 'Content-Type: application/json' -d '{"kind":"assumption","shortlisted":true}' | jq -e '.ok == true' >/dev/null
curl --fail-with-body -sS -X PATCH "$BASE/api/ideas/$idea" -H 'Content-Type: application/json' -d '{"shortlisted":false}' | jq -e '.ok == true' >/dev/null
bad_status=$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/ideas/$idea" -H 'Content-Type: application/json' -d '{}')
[[ "$bad_status" == 400 ]]
curl --fail-with-body -sS "$BASE/api/sessions/$id/state" | jq -e '.ideas[0].kind == "assumption" and .ideas[0].shortlisted == false' >/dev/null
# Find a pair that is absent from the sparse AI graph and ask about the human link.
pair=$(jq -c '[.ideas[].id] as $ids | .edges as $edges | first(range(0; $ids|length) as $i | range($i+1; $ids|length) as $j | {a:$ids[$i],b:$ids[$j]} | select(. as $p | any($edges[]; (.a == $p.a and .b == $p.b) or (.a == $p.b and .b == $p.a)) | not))' <<<"$state")
curl --fail-with-body -sS "$BASE/api/provocations/bridge" -H 'Content-Type: application/json' -d "$(jq -c --arg s "$id" '. + {sessionId:$s}' <<<"$pair")" | jq -e '.provocation.type == "bridge" and (.provocation.why.ideaIds | length == 2)' >/dev/null
# A self-link never creates a bridge provocation.
curl --fail-with-body -sS "$BASE/api/provocations/bridge" -H 'Content-Type: application/json' -d "$(jq -nc --arg s "$id" --arg a "$idea" '{sessionId:$s,a:$a,b:$a}')" | jq -e '.provocation == null' >/dev/null
provocation=$(jq -er '.provocations[0].id' <<<"$state")
curl --fail-with-body -sS -X PATCH "$BASE/api/provocations/$provocation" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq -e '.ok == true' >/dev/null
jq '{session: .session.id, diversity, questions: [.provocations[].text]}' <<<"$state"
echo 'Backend smoke passed.'
