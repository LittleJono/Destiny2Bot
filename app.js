const Discord = require("discord.js");
const client = new Discord.Client();
const config = require('config');
const token = config.get('discord-token');
const apikey = config.get('destiny-api-key');
const request = require('request');
const fs = require('fs');
const async = require('async');

var listOfUsers = []

fs.readFile('users.txt', (err, data) => {
    if (err) throw err;
    listOfUsers = data.toString('utf8').split("\r\n");
    console.log(listOfUsers)
});

async function getNewUser(user, usersliced, channel) {
    var result = await doesUserExist(user, usersliced);
    if (result == 1) {
        listOfUsers.push(usersliced);
        fs.appendFile('users.txt', '\r\n' + usersliced, (err) => {
            if (err) throw err;
            console.log(usersliced + " was added to the list.");
        });
        var output = await getUserData(usersliced);
        console.log(output, "did it work")
        printStats(usersliced, channel);
    } else {
        channel.send("User not found.");
    }
}

function getUserData(user) {
    return new Promise(function(resolve, reject) {
        fs.readFile('users/' + user, (err, data) => {
            if (err) throw err;
            data = JSON.parse(data);
            var options = {
                url: 'https://www.bungie.net/platform/Destiny2/4/Account/' + data['destinyMembershipId'] + '/Stats/',
                headers: {
                    'X-API-Key': apikey
                }
            };
            request(options, function(error, response, body) {
                data["data"] = JSON.parse(body)["Response"];
                fs.writeFile("users/" + user, JSON.stringify(data, null, 4), (err) => {
                    if (err) throw err;
                    resolve(1);
                });
            })
        })
    })
}

function printStats(user, channel) {
    fs.readFile('users/' + user, (err, data) => {
        console.log(user, data)
        data = JSON.parse(data);

        try {
            channel.send({
                embed: {
                    color: 3447003,
                    title: (user.charAt(0).toUpperCase() + user.slice(1) + "'s PVP Stats"),
                    description: "These stats are from all characters combined.",
                    fields: [{
                        name: "Kills",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.kills.basic.value
                    }, {
                        name: "Assists",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.assists.basic.value
                    }, {
                        name: "Deaths",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.deaths.basic.value
                    }, {
                        name: "K/D",
                        value: (data.data.mergedAllCharacters.results.allPvP.allTime.kills.basic.value / data.data.mergedAllCharacters.results.allPvP.allTime.deaths.basic.value).toFixed(3)
                    }, {
                        name: "Headshot Kills",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.precisionKills.basic.value
                    }, {
                        name: "Revives",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.resurrectionsPerformed.basic.value
                    }, {
                        name: "Suicides",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.suicides.basic.value
                    }, {
                        name: "W/L ratio",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.winLossRatio.basic.displayValue
                    }, {
                        name: "Longest Killing Spree",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.longestKillSpree.basic.value
                    }, {
                        name: "Highest Light Level",
                        value: data.data.mergedAllCharacters.results.allPvP.allTime.highestLightLevel.basic.value
                    }]
                }
            });
        } catch (err) {
            channel.send("The user hasn't played any PVP yet.")
        }
    });
}

function doesUserExist(user, usersliced) {
    return new Promise(function(resolve, reject) {
        var options = {
            url: 'https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayer/4/' + encodeURIComponent(user),
            headers: {
                'X-API-Key': apikey
            }
        };
        request(options, function(error, response, body) {
            body = JSON.parse(body)
            results = body["Response"]
            if (results.length == 0) {
                resolve(0)
            }
            try {
                var newUser = {}
                newUser["battletag"] = user
                newUser["membershipId"] = results[0]["membershipId"];

                var options = {
                    url: 'https://www.bungie.net/Platform/User/GetMembershipsById/' + results[0]["membershipId"] + '/-1/',
                    headers: {
                        'X-API-Key': apikey
                    }
                };
                request(options, function(error, response, body) {
                    body = JSON.parse(body);
                    for (i in body.Response.destinyMemberships) {
                        if (body.Response.destinyMemberships[i].membershipType == 4) {
                            newUser["destinyMembershipId"] = body.Response.destinyMemberships[i].membershipId
                        }
                    }
                    fs.writeFile("users/" + usersliced, JSON.stringify(newUser, null, 4), (err) => {
                        if (err) throw err;
                        resolve(1);
                    });

                });
            } catch (err) {
                resolve(0);
            }
        });
    });
}

var counter = 0;

setInterval(function() {
    getUserData(listOfUsers[counter]);
    counter += 1;
    if (counter == listOfUsers.length) {
        counter = 0;
    }
}, 5000);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content.slice(0, 17).toLowerCase() === '.getdestinystats ') {
        var name = msg.content.slice(17).toLowerCase();
        if (name.indexOf('#') == -1) {
            nameSliced = name
        } else {
            nameSliced = name.slice(0, name.indexOf('#'));
        }
        position = listOfUsers.indexOf(nameSliced);
        if (position == -1) {
            if (name.indexOf('#') == -1) {
                msg.channel.send("This user hasn't been searched before, please include the battletag (E.g. 'Jono#1234')", name, nameSliced);
            } else {
                console.log("getting new user")
                getNewUser(name, nameSliced, msg.channel)
            }
        } else {
            printStats(nameSliced, msg.channel)
        }
    }
});

client.login(token);