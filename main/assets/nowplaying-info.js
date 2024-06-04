#!/usr/bin/osascript -l JavaScript
"use strict";
function run() {
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;
    var output = JSON.stringify({ error: "No music player is running" }, null, 4);
    if (Application("Music").running()) {
        var itunes = Application("Music");
        var track = itunes.currentTrack;
        var state = itunes.playerState();
        if (state != "playing" && state != "paused") {
            return "null";
        }
        track = track.properties();
        Object.keys(track).forEach(function (name) {
            if (name.startsWith("purchase") || (name.endsWith("ID") && name != "databaseID")) {
                track[name] = undefined;
            }
            try {
                if (name === "location")
                    track[name] = track[name].toString();
            }
            catch (e) {
                // failed to extract location...
            }
        });
        track.state = state;
        return JSON.stringify(track, null, 4);
    }
    return output;
}
