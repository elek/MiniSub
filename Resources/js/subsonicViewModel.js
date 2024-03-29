﻿define(['knockout', 'postbox', 'mapping', 'global', 'utils', 'model', 'player'], function (ko, postbox, mapping, global, utils, model, player) {
    self = this;
    self.index = new ko.observableArray([]);
    self.shortcut = new ko.observableArray([]);
    self.album = new ko.observableArray([]);
    self.song = new ko.observableArray([]).syncWith("song"); ;
    self.templateToUse = ko.observable();

    self.settings = global.settings;
    self.queue = new ko.observableArray([]).syncWith("queue");
    self.selectedArtist = ko.observable();
    self.selectedAlbum = ko.observable();
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
    self.addSongsToQueue = function (data, event) {
        ko.utils.arrayForEach(self.selectedSongs(), function (item) {
            self.queue.push(item);
            item.selected(false);
        });
        utils.updateMessage(self.selectedSongs().length + ' Song(s) Added to Queue', true);
    }

    self.ping = function (data, event) {
        $.ajax({
            url: settings.BaseURL() + '/ping.view?' + self.settings.BaseParams(),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].status == 'ok') {
                    self.settings.ApiVersion(data["subsonic-response"].version);
                } else {
                    if (typeof data["subsonic-response"].error != 'undefined') {
                        alert(data["subsonic-response"].error.message);
                    }
                }
            },
            error: function () {
                utils.changeTab('tabSettings');
                alert('Unable to connect to Subsonic server');
            }
        });
    }

    self.getArtists = function (data, event) {
        var url, id;
        if (utils.getValue('MusicFolders')) {
            id = utils.getValue('MusicFolders');
        }
        if (id) {
            url = self.settings.BaseURL() + '/getIndexes.view?' + self.settings.BaseParams() + '&musicFolderId=' + id;
        } else {
            url = self.settings.BaseURL() + '/getIndexes.view?' + self.settings.BaseParams();
        }
        var map = {
            create: function (options) {
                var artist = options.data.artist;
                var artists = [];
                if (artist.length > 0) {
                    artists = artist;
                } else {
                    artists[0] = artist;
                }
                return new model.Index(options.data.name, artists);
            }
        }
        var map_shortcut = {
            'shortcut': {
                create: function (options) {
                    return new model.Artist(options.data.id, options.data.name);
                }
            }
        }
        $.ajax({
            url: url,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            done: function () { if (self.settings.Debug()) { console.log("DONE!"); } },
            error: function () { if (self.settings.Debug()) { console.log("ERROR!"); } },
            success: function (data) {
                var indexes = [];
                if (data["subsonic-response"].indexes.index.length > 0) {
                    indexes = data["subsonic-response"].indexes.index;
                } else {
                    indexes[0] = data["subsonic-response"].indexes.index;
                }
                var shortcuts = [];
                if (typeof data["subsonic-response"].indexes.shortcut != 'undefined') {
                    if (data["subsonic-response"].indexes.shortcut.length > 0) {
                        shortcuts = data["subsonic-response"].indexes.shortcut;
                    } else {
                        shortcuts[0] = data["subsonic-response"].indexes.shortcut;
                    }
                }
                mapping.fromJS(shortcuts, map_shortcut, self.shortcut);
                mapping.fromJS(indexes, map, self.index);
            }
        });
    };
    self.albumMapping = {
        create: function (options) {
            var album = options.data;
            var coverart, starred;
            if (typeof album.coverArt != 'undefined') {
                coverart = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&size=50&id=' + album.coverArt;
            }
            if (typeof album.starred !== 'undefined') { starred = true; } else { starred = false; }
            return new model.Album(album.id, album.parent, album.album, album.artist, coverart, album.created, starred, '');
        }
    }
    self.AutoAlbums = new ko.observableArray([
            { id: "random", name: "Random" },
            { id: "newest", name: "Recently Added" },
            { id: "starred", name: "Starred" },
            { id: "highest", name: "Top Rated" },
            { id: "frequent", name: "Most Played" },
            { id: "recent", name: "Recently Played" }
        ]);
    self.selectedAutoAlbum = ko.observable();
    self.getAlbums = function (data, event) {
        self.selectedAutoAlbum(null);
        self.selectedArtist(data);
        var id = event.currentTarget.id;
        var url = self.settings.BaseURL() + '/getMusicDirectory.view?' + self.settings.BaseParams() + '&id=' + id;
        $.ajax({
            url: url,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                var items = [];
                if (data["subsonic-response"].directory.child.length > 0) {
                    items = data["subsonic-response"].directory.child;
                } else {
                    items[0] = data["subsonic-response"].directory.child;
                }
                //alert(JSON.stringify(getMusicDirectory["subsonic-response"].directory.child));
                self.album.removeAll();
                self.templateToUse('album-template');
                mapping.fromJS(items, self.albumMapping, self.album);
            }
        });
    };
    self.getAlbumsByTag = function (data, Event) { // Gets albums by ID3 tag
        var id = event.currentTarget.id;
        $('#AutoAlbumContainer li').removeClass('selected');
        $('#ArtistContainer li').removeClass('selected');
        $(this).addClass('selected');
        var map = {
            create: function (options) {
                var album = options.data;
                var coverart, starred;
                if (typeof album.coverArt != 'undefined') {
                    coverart = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&size=50&id=' + album.coverArt;
                }
                if (typeof album.starred !== 'undefined') { starred = true; } else { starred = false; }
                return new model.Album(album.id, album.parent, album.name, album.artist, coverart, album.created, starred, '');
            }
        }
        $.ajax({
            url: self.settings.BaseURL() + '/getArtist.view?' + self.settings.BaseParams() + '&id=' + id,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].artist !== undefined) {
                    var children = [];
                    if (data["subsonic-response"].artist.album.length > 0) {
                        children = data["subsonic-response"].artist.album;
                    } else {
                        children[0] = data["subsonic-response"].artist.album;
                    }
                    self.album.removeAll();
                    self.templateToUse('album-template');
                    mapping.fromJS(children, map, self.album);
                }
            }
        });
    }
    self.offset = ko.observable(0);
    self.getAlbumListBy = function (offset) {
        self.selectedArtist(null);
        self.selectedAutoAlbum(this);
        var id = this.id;
        var size, url;
        if (offset > 0) {
            self.offset(offset);
            url = self.settings.BaseURL() + '/getAlbumList.view?' + self.settings.BaseParams() + '&size=' + self.settings.AutoAlbumSize().toString() + '&type=' + id + '&offset=' + offset
        } else {
            url = self.settings.BaseURL() + '/getAlbumList.view?' + self.settings.BaseParams() + '&size=' + self.settings.AutoAlbumSize().toString() + '&type=' + id
        }
        $.ajax({
            url: url,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                var albums = [];
                if (typeof data["subsonic-response"].albumList.album != 'undefined') {
                    if (data["subsonic-response"].albumList.album.length > 0) {
                        albums = data["subsonic-response"].albumList.album;
                    } else {
                        albums[0] = data["subsonic-response"].albumList.album;
                    }
                    self.album.removeAll();
                    self.templateToUse('album-template');
                    mapping.fromJS(albums, self.albumMapping, self.album);
                }
            }
        });
    };
    self.songMapping = global.songMapping;
    self.getSongs = function (id, action) {
        self.selectedAlbum(this);
        //id = this.id();
        var url = self.settings.BaseURL() + '/getMusicDirectory.view?' + self.settings.BaseParams() + '&id=' + id;
        $.ajax({
            url: url,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                var items = [];
                if (typeof data["subsonic-response"].directory.child != 'undefined') {
                    if (data["subsonic-response"].directory.child.length > 0) {
                        items = data["subsonic-response"].directory.child;
                    } else {
                        items[0] = data["subsonic-response"].directory.child;
                    }
                }
                //alert(JSON.stringify(getMusicDirectory["subsonic-response"].directory.child));
                if (action == 'add') {
                    var songs = mapping.fromJS(items, self.songMapping);
                    ko.utils.arrayForEach(songs(), function (item) {
                        self.queue.push(item);
                    });
                    utils.updateMessage(songs().length + ' Song(s) Added to Queue', true);
                } else if (action == 'play') {
                    mapping.fromJS(items, self.songMapping, self.queue);
                    var next = self.queue()[0];
                    require("player").playSong(false, next);
                    utils.updateMessage(self.queue().length + ' Song(s) Added to Queue', true);
                } else {
                    self.song.removeAll();
                    mapping.fromJS(items, self.songMapping, self.song);
                }
            }
        });
    };
    self.getSongsByTag = function (data, event) { // Gets songs by ID3 tag
        var id = event.currentTarget.id;
        $.ajax({
            url: self.settings.BaseURL() + '/getAlbum.view?' + self.settings.BaseParams() + '&id=' + id,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].album !== undefined) {
                    var children = [];
                    if (data["subsonic-response"].album.song.length > 0) {
                        children = data["subsonic-response"].album.song;
                    } else {
                        children[0] = data["subsonic-response"].album.song;
                    }
                    self.song.removeAll();
                    mapping.fromJS(children, self.songMapping, self.song);
                }
            }
        });
    };
    self.getRandomSongs = function (action, genre, folder) {
        if (self.settings.Debug()) { console.log('action:' + action + ', genre:' + genre + ', folder:' + folder); }
        var size = self.settings.AutoPlaylistSize();
        var genreParams = '';
        if (genre != '' && genre != 'Random') {
            genreParams = '&genre=' + genre;
        }
        folderParams = '';
        if (typeof folder == 'number' && folder == 0 && folder != 'all') {
            folderParams = '&musicFolderId=' + folder;
        } else if (folder != '' && folder != 'all') {
            folderParams = '&musicFolderId=' + folder;
        }
        $.ajax({
            url: self.settings.BaseURL() + '/getRandomSongs.view?' + self.settings.BaseParams() + '&size=' + size + genreParams + folderParams,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (typeof data["subsonic-response"].randomSongs.song != 'undefined') {
                    var items = [];
                    if (data["subsonic-response"].randomSongs.song.length > 0) {
                        items = data["subsonic-response"].randomSongs.song;
                    } else {
                        items[0] = data["subsonic-response"].randomSongs.song;
                    }
                    if (action == 'add') {
                        var songs = mapping.fromJS(items, self.songMapping);
                        self.queue.push.apply(self.queue, songs());
                        utils.updateMessage(songs().length + ' Song(s) Added to Queue', true);
                    } else if (action == 'play') {
                        var songs = mapping.fromJS(items, self.songMapping);
                        self.queue.push.apply(self.queue, songs());
                        require("player").nextTrack();
                        utils.updateMessage(self.queue().length + ' Song(s) Added to Queue', true);
                    } else {
                        mapping.fromJS(items, self.songMapping, self.song);
                    }
                }
            }
        });
    }
    self.search = function (data, event) {
        var query = $('#Search').val();
        if (query != '') {
            var type = $('#SearchType').val();
            $.ajax({
                url: self.settings.BaseURL() + '/search2.view?' + self.settings.BaseParams() + '&query=' + query,
                method: 'GET',
                dataType: self.settings.Protocol(),
                timeout: 10000,
                success: function (data) {
                    if (data["subsonic-response"].searchResult2 !== "") {
                        var header;
                        var children = [];
                        if (type === 'song') {
                            if (data["subsonic-response"].searchResult2.song !== undefined) {
                                if (data["subsonic-response"].searchResult2.song.length > 0) {
                                    children = data["subsonic-response"].searchResult2.song;
                                } else {
                                    children[0] = data["subsonic-response"].searchResult2.song;
                                }
                                self.song.removeAll();
                                mapping.fromJS(children, self.songMapping, self.song);
                            }
                        }
                        if (type === 'album') {
                            if (data["subsonic-response"].searchResult2.album !== undefined) {
                                if (data["subsonic-response"].searchResult2.album.length > 0) {
                                    children = data["subsonic-response"].searchResult2.album;
                                } else {
                                    children[0] = data["subsonic-response"].searchResult2.album;
                                }
                                self.album.removeAll();
                                self.templateToUse('album-template');
                                mapping.fromJS(children, self.albumMapping, self.album);
                            }
                        }
                    }
                }
            });
            $('#Search').val("");
        }
    }
    self.updateFavorite = function (data, event) {
        var url;
        var id = data.id();
        if (typeof id !== 'undefined') {
            if (data.starred()) {
                data.starred(false);
                url = self.settings.BaseURL() + '/unstar.view?' + self.settings.BaseParams() + '&id=' + id;
            } else {
                data.starred(true);
                url = self.settings.BaseURL() + '/star.view?' + self.settings.BaseParams() + '&id=' + id;
            }
            $.ajax({
                url: url,
                method: 'GET',
                dataType: self.settings.Protocol(),
                timeout: 10000,
                success: function () {
                    utils.updateMessage('Favorite Updated!', true);
                }
            });
        }
    }
    self.scrollToTop = function () {
        $('#Artists').stop().scrollTo('#auto', 400);
    };
    self.selectAll = function (data, event) {
        ko.utils.arrayForEach(self.song(), function (item) {
            self.selectedSongs.push(item);
            item.selected(true);
        });
    }
    self.selectNone = function (data, event) {
        ko.utils.arrayForEach(self.song(), function (item) {
            self.selectedSongs([]);
            item.selected(false);
        });
    }
    self.MusicFolders = new ko.observableArray([]);
    self.selectedMusicFolders = ko.observable();
    self.getMusicFolders = function (data, event) {
        var map = {
            create: function (options) {
                var option = options.data;
                return new model.Option(option.id, option.name);
            }
        }
        $.ajax({
            url: self.settings.BaseURL() + '/getMusicFolders.view?' + self.settings.BaseParams(),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].musicFolders.musicFolder !== undefined) {
                    var folders = [];
                    if (data["subsonic-response"].musicFolders.musicFolder.length > 0) {
                        folders = data["subsonic-response"].musicFolders.musicFolder;
                    } else {
                        folders[0] = data["subsonic-response"].musicFolders.musicFolder;
                    }

                    mapping.fromJS(folders, map, self.MusicFolders);
                    if (utils.getValue('MusicFolders')) {
                        self.selectedMusicFolders(utils.getValue('MusicFolders'));
                    }
                } else {
                }
            }
        });
    }
    self.selectedMusicFolders.subscribe(function (newValue) {
        if (utils.getValue('MusicFolders') != newValue) {
            if (typeof newValue != 'undefined') {
                utils.setValue('MusicFolders', newValue, true);
            } else {
                utils.setValue('MusicFolders', null, true);
            }
            //alert(newValue);
            self.getArtists(newValue);
        }
    });
    self.rescanLibrary = function (data, event) {
        $.ajax({
            url: self.settings.BaseURL() + '/getUser.view?' + self.settings.BaseParams() + '&username=' + utils.getValue('username'),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].user.adminRole == true) {
                    $.get(utils.getValue('Server') + '/musicFolderSettings.view?scanNow');
                } else {
                    alert('You are not logged in as an admin user!');
                }
            }
        });
    }
    /* Podcasts */
    self.getPodcasts = function (refresh) {
        if (self.settings.Debug()) { console.log("LOAD PODCASTS"); }
        var map = {
            create: function (options) {
                var album = options.data;
                var coverart, starred;
                if (typeof album.coverArt != 'undefined') {
                    coverart = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&size=50&id=' + album.coverArt;
                }
                if (typeof album.starred !== 'undefined') { starred = true; } else { starred = false; }
                return new model.Album(album.id, null, album.title, null, coverart, null, starred, '');
            }
        }
        /*
        var mapping = {
        create: function (options) {
        var artist = options.data;
        return new model.Artist(artist.id, artist.title);
        }
        };
        */
        $.ajax({
            url: self.settings.BaseURL() + '/getPodcasts.view?' + self.settings.BaseParams(),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].podcasts.channel !== undefined) {
                    var podcasts = [];
                    if (data["subsonic-response"].podcasts.channel.length > 0) {
                        podcasts = data["subsonic-response"].podcasts.channel;
                    } else {
                        podcasts[0] = data["subsonic-response"].podcasts.channel;
                    }
                    self.album.removeAll();
                    self.templateToUse('podcast-template');
                    mapping.fromJS(podcasts, map, self.album);
                }
            }
        });
    }
    self.getPodcast = function (action) {
        self.selectedAlbum(this);
        id = this.id();
        var map = {
            create: function (options) {
                var song = options.data;
                var url, track, rating, starred, contenttype, suffix, description;
                var specs = '', coverartthumb = '', coverartfull = '';
                if (typeof song.coverArt != 'undefined') {
                    coverartthumb = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&size=60&id=' + song.coverArt;
                    coverartfull = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&id=' + song.coverArt;
                }
                if (typeof song.description == 'undefined') { description = ''; } else { description = song.description; }
                if (typeof song.track == 'undefined') { track = '&nbsp;'; } else { track = song.track; }
                if (typeof song.starred !== 'undefined') { starred = true; } else { starred = false; }
                if (song.bitRate !== undefined) { specs += song.bitRate + ' Kbps'; }
                if (song.transcodedSuffix !== undefined) { specs += ', transcoding:' + song.suffix + ' > ' + song.transcodedSuffix; } else { specs += ', ' + song.suffix; }
                if (song.transcodedSuffix !== undefined) { suffix = song.transcodedSuffix; } else { suffix = song.suffix; }
                if (suffix == 'ogg') { suffix = 'oga'; }
                var salt = Math.floor(Math.random() * 100000);
                url = self.settings.BaseURL() + '/stream.view?' + self.settings.BaseParams() + '&id=' + song.streamId + '&salt=' + salt;
                return new model.Song(song.streamId, song.parent, track, song.title, song.artist, song.artistId, song.album, song.albumId, coverartthumb, coverartfull, song.duration, song.userRating, starred, suffix, specs, url, 0, description);
            }
        }
        $.ajax({
            url: self.settings.BaseURL() + '/getPodcasts.view?' + self.settings.BaseParams(),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].podcasts.channel !== undefined) {
                    var podcasts = [];
                    if (data["subsonic-response"].podcasts.channel.length > 0) {
                        podcasts = data["subsonic-response"].podcasts.channel;
                    } else {
                        podcasts[0] = data["subsonic-response"].podcasts.channel;
                    }
                    var channel = [];
                    $.each(podcasts, function (i, item) {
                        if (item.id == id) {
                            channel = item;
                        }
                    });

                    if (typeof channel.episode != 'undefined') {
                        var episodes = ko.utils.arrayFilter(channel.episode, function (item) {
                            return (item.status != "skipped") // Skip podcasts that are not yet downloaded                            
                        });
                        if (action == 'add') {
                            var songs = mapping.fromJS(episodes, map, self.queue);
                            utils.updateMessage(songs().length + ' Song(s) Added to Queue', true);
                        } else if (action == 'play') {
                            mapping.fromJS(episodes, map, self.queue);
                            var next = self.queue()[0];
                            require("player").playSong(false, next);
                            utils.updateMessage(self.queue().length + ' Song(s) Added to Queue', true);
                        } else {
                            //mapping.fromJS(channel.episode, mapping, self.album);
                            mapping.fromJS(episodes, map, self.song);
                        }
                    }
                }
            }
        });
    }
    /* End Podcasts */

    /* Playlists */
    self.getPlaylists = function (refresh) {
        if (self.settings.Debug()) { console.log("LOAD PLAYLISTS"); }
        var map = {
            create: function (options) {
                var album = options.data;
                var coverart, starred;
                if (typeof album.coverArt != 'undefined') {
                    coverart = self.settings.BaseURL() + '/getCoverArt.view?' + self.settings.BaseParams() + '&size=50&id=' + album.coverArt;
                }
                if (typeof album.starred !== 'undefined') { starred = true; } else { starred = false; }
                return new model.Album(album.id, null, album.name, null, coverart, null, starred, '');
            }
        }
        $.ajax({
            url: self.settings.BaseURL() + '/getPlaylists.view?' + self.settings.BaseParams(),
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].playlists.playlist !== undefined) {
                    var playlists = [];
                    if (data["subsonic-response"].playlists.playlist.length > 0) {
                        playlists = data["subsonic-response"].playlists.playlist;
                    } else {
                        playlists[0] = data["subsonic-response"].playlists.playlist;
                    }
                    self.album.removeAll();
                    self.templateToUse('playlist-template');
                    mapping.fromJS(playlists, map, self.album);
                }
            }
        });
    }
    self.getPlaylist = function (action) {
        self.selectedAlbum(this);
        id = this.id();
        $.ajax({
            url: self.settings.BaseURL() + '/getPlaylist.view?' + self.settings.BaseParams() + '&id=' + id,
            method: 'GET',
            dataType: self.settings.Protocol(),
            timeout: 10000,
            success: function (data) {
                if (data["subsonic-response"].playlist.entry !== undefined) {
                    var children = [];
                    var playlist = data["subsonic-response"].playlist;
                    if (playlist.entry.length > 0) {
                        children = playlist.entry;
                    } else {
                        children[0] = playlist.entry;
                    }
                    if (action == 'add') {
                        var songs = mapping.fromJS(children, self.songMapping);
                        self.queue.push.apply(self.queue, songs());
                        utils.updateMessage(songs().length + ' Song(s) Added to Queue', true);
                    } else if (action == 'play') {
                        mapping.fromJS(children, self.songMapping, self.queue);
                        var next = self.queue()[0];
                        require("player").playSong(false, next);
                        utils.updateMessage(self.queue().length + ' Song(s) Added to Queue', true);
                    } else {
                        mapping.fromJS(children, self.songMapping, self.song);
                    }
                }
            }
        });
    }
    /* End Playlists */

    self.toggleAccordion = function (id) {
        var el = '#' + id;
        if (id == 'playlistsAccordion') {
            self.getPlaylists();
        }
        if (id == 'podcastsAccordion') {
            self.getPodcasts();
        }
        // show the content only if it is hidden        
        if ($(el).nextAll('.accordionItemContents').is(":hidden")) {
            utils.setValue('SubsonicAccordion', id, false);
            //open the content          
            $(el).nextAll('.accordionItemContents').slideDown("fast");
            //close previously opened content           
            $('.accordion').find('.opened').closest('.accordionItem').find('.accordionItemContents').slideUp("fast");
            // remove the "opened" class from previously opened content         
            $('.accordion').find('.opened').removeClass('opened');
            //add class to mark the clicked item is opened          
            $(el).addClass("opened");
        } else {
            utils.setValue('SubsonicAccordion', null, false);
            $(el).nextAll('.accordionItemContents').slideUp("fast");
            $('.accordion').find('.opened').removeClass('opened');
        }
    }

    // Init for page load
    if (utils.getValue('SubsonicAccordion')) {
        var id = utils.getValue('SubsonicAccordion');
        self.toggleAccordion(id);
    }
    if (settings.Server() != '' && settings.Username() != '' && settings.Password() != '') {
        self.ping();
        self.getMusicFolders();
        self.getArtists();
    } else {
        utils.changeTab("tabSettings");
    }

    return {
        index: self.index,
        shortcut: self.shortcut,
        album: self.album,
        song: self.song,
        templateToUse: self.templateToUse,
        selectedArtist: self.selectedArtist,
        selectedAlbum: self.selectedAlbum,
        selectedSongs: self.selectedSongs,
        selectSong: self.selectSong,
        addSongsToQueue: self.addSongsToQueue,
        getArtists: self.getArtists,
        AutoAlbums: self.AutoAlbums,
        selectedAutoAlbum: self.selectedAutoAlbum,
        getAlbums: self.getAlbums,
        offset: self.offset,
        getAlbumListBy: self.getAlbumListBy,
        getSongs: self.getSongs,
        getRandomSongs: self.getRandomSongs,
        search: self.search,
        updateFavorite: self.updateFavorite,
        MusicFolders: self.MusicFolders,
        selectedMusicFolders: self.selectedMusicFolders,
        getMusicFolders: self.getMusicFolders,
        scrollToTop: self.scrollToTop,
        selectAll: self.selectAll,
        selectNone: self.selectNone,
        rescanLibrary: self.rescanLibrary,
        getPodcasts: self.getPodcasts,
        getPodcast: self.getPodcast,
        getPlaylists: self.getPlaylists,
        getPlaylist: self.getPlaylist,
        toggleAccordion: self.toggleAccordion
    };

});