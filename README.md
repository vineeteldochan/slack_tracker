__**Slack Tracker**__

Calls/Receives Slack API's Team Accesslogs, Events API and Presence API and updates/inserts the rows into Mongo DB

---

__Dependencies__:

"async": "^2.6.0",
"chokidar": "^2.0.2",
"mongodb": "^3.0.4",
"request": "^2.85.0"

---

__**Method: GET**__

/slack/profile_get  := Get Profile information

/slack/presence_get := Get Presence Information

/slack/presence_get/user/:userid := Get Presence of another user

---


__**Method: POST**__

/slack/eventsapi := Slack sends information through this call [ events API ].

/slack/profile_set := Pass JSON body to update profile information.

/slack/presence_set/:presence := Call to update presence status.
