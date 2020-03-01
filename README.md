# What's this?
This is a project of mine designed to play audio files to multiple users connected to the same webpage, synchronizing them in the process. The synchronization works with "sessions", which aren't attributed to one user but contain a list of all connected members. Every member has the same permissions within it and can queue, skip, pause, play and unqueue songs. Since the sessions aren't owned by anyone, the original member can leave it and as long as one user is still in it, they can keep on listening. The webserver is written in Node.js and the frontend is written in HTML, CSS, JavaScript.

## Screenshot
![Web Interface](https://i.imgur.com/nZgbVwM.png)

## TODO
* Session Browser
* Song Popup Description