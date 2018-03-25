Slack Tracker

Calls Slack API's Team Accesslogs and updates/inserts the rows into Mongo DB

Dependencies:
"async": "^2.6.0",
"chokidar": "^2.0.2",
"mongodb": "^3.0.4",
"request": "^2.85.0"


Method: GET

/slack/profile_get  := Get Profile information

/slack/presence_get := Get Presence Information

/slack/presence_get/user/:userid := Get Presence of another user


Method: POST

/slack/eventsapi := Slack sends information through this call [ events API ].

/slack/profile_set := Pass JSON body to update profile information.

/slack/presence_set/:presence := Call to update presence status.
