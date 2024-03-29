﻿define(['knockout', 'postbox', 'sammy', 'utils', 'global', 'player', 'jquery.scrollTo'], function (ko, postbox, Sammy, utils, global, player) {
    return function mainViewModel() {
        var self = this;
        // Navigation
        self.activeTab = ko.observable('tabLibrary');
        self.changeTab = function (tab) {
            utils.changeTab(tab);
        };

        // Client-Side Routes
        Sammy(function () {
            this.post('#', function (context) {
                return false;
            });

            this.get('#:tab', function () {
                var id = this.params.tab;
                self.activeTab(id);
            });

            // Default route
            this.get('', function () { this.app.runRoute('get', '#tabLibrary') });
        }).run();

        //self.changeLog = new ko.observableArray(global.changeLog).slice(1, 10);
        self.changeLog = new ko.observableArray(global.changeLog);
        self.changeLogShowMore = function () {
            $('ul#ChangeLog li.log').each(function (i, el) {
                $(el).show();
            });
            return false;
        }
        self.selectedSongs = new ko.observableArray([]);
        self.selectSong = function (data, event) {
            if (self.selectedSongs.indexOf(this) >= 0) {
                self.selectedSongs.remove(this);
                this.selected(false);
            } else {
                self.selectedSongs.push(this);
                this.selected(true);
            }
        }

        self.playingSong = ko.observable().subscribeTo("playing");
        /*
        self.playingSong.subscribe(function (newValue) {
        alert(JSON.stringify(newValue));
        });
        */
        self.queue = new ko.observableArray([]).syncWith("queue");
        self.queueTotal = ko.computed(function () {
            var total = 0;
            ko.utils.arrayForEach(self.queue(), function (item) {
                total += parseInt(item.duration());
            });
            if (self.queue().length > 0) {
                return self.queue().length + ' song(s), ' + utils.secondsToTime(total) + ' total time';
            } else {
                return '0 song(s), 00:00:00 total time';
            }
        });

        self.scrollToIndex = function (data, event) {
            var e = event;
            var source = e.target.id;
            if (source != 'Search' && source != 'ChatMsg' && source != 'AutoPlaylists') {
                var unicode = e.charCode ? e.charCode : e.keyCode;
                if (settings.Debug()) { console.log('Keycode Triggered: ' + unicode); }
                /*
                if (unicode == 49) {
                utils.changeTab('tabQueue');
                } else if (unicode == 50) {
                utils.changeTab('tabLibrary');
                } else if (unicode == 51) {
                utils.changeTab('tabArchive');
                } else if (unicode == 52) {
                utils.changeTab('tabPlaylists');
                } else if (unicode == 53) {
                utils.changeTab('tabPodcasts');
                } else if (unicode == 54) {
                utils.changeTab('tabSettings');
                }
                */
                if (unicode >= 65 && unicode <= 90 && $('#tabLibrary').is(':visible')) { // a-z
                    var key = utils.findKeyForCode(unicode);
                    if (key == 'x' || key == 'y' || key == 'z') {
                        key = 'x-z';
                    }
                    var el = '#' + key.toUpperCase();
                    if ($(el).length > 0) {
                        $('#SubsonicArtists').stop().scrollTo(el, 400);
                    }
                } else if (unicode == 39 || unicode == 176) { // right arrow
                    player.nextTrack();
                } else if (unicode == 37 || unicode == 177) { // back arrow
                    player.previousTrack();
                } else if (unicode == 32 || unicode == 179 || unicode == 0179) { // spacebar
                    player.playPauseSong();
                    return false;
                } else if (unicode == 36 && $('#tabLibrary').is(':visible')) { // home
                    $('#SubsonicArtists').stop().scrollTo('#MusicFolders', 400);
                }
                if (unicode == 189) { // dash - volume down
                    var volume = utils.getValue('Volume') ? parseFloat(utils.getValue('Volume')) : 1;
                    if (volume <= 1 && volume > 0 && source == '') {
                        volume += -.1;
                        $(player1).jPlayer({
                            volume: volume
                        });
                        utils.setValue('Volume', volume, true);
                        //updateMessage('Volume: ' + Math.round(volume * 100) + '%');
                    }
                }
                if (unicode == 187) { // equals - volume up
                    var volume = utils.getValue('Volume') ? parseFloat(utils.getValue('Volume')) : 1;
                    if (volume < 1 && volume >= 0 && source == '') {
                        volume += .1;
                        $(player1).jPlayer({
                            volume: volume
                        });
                        utils.setValue('Volume', volume, true);
                        //updateMessage('Volume: ' + Math.round(volume * 100) + '%');
                    }
                }
            }
            return true;
        };
        self.selectAll = function (data, event) {
            ko.utils.arrayForEach(self.queue(), function (item) {
                self.selectedSongs.push(item);
                item.selected(true);
            });
        }
        self.selectNone = function (data, event) {
            ko.utils.arrayForEach(self.queue(), function (item) {
                self.selectedSongs([]);
                item.selected(false);
            });
        }
        self.removeSelectedSongs = function (data, event) {
            ko.utils.arrayForEach(self.selectedSongs(), function (item) {
                self.queue.remove(item);
            });
        }
        self.emptyQueue = function (data, event) {
            self.selectedSongs([]);
            self.queue([]);
        }
        self.setupDemo = function (data, event) {
            var Username = "android-guest";
            var Password = "guest";
            var Server = "http://subsonic.org/demo";
            var Tab = "tabLibrary";
            if (utils.confirmDelete("Do you want to connect to the Subsonic Demo server?")) {
                settings.Username(Username);
                settings.Password(Password);
                settings.Server(Server);
                location.reload();
            }
        }

        // Player
        self.defaultPlay = function () { return player.defaultPlay; }

    }
});