//! phase.js
//! version 0.1
//! author: Aaren C

/* jshint shadow:true */

define(['item', 'phone', 'vendor/socketcluster.min', 'jquery', 'vendor/moment', 'vendor/mobiledetect', 'bootstrap'], function(Item, Phone, socketCluster, $, moment, MobileDetect) {
  $(function() {
    $('[data-toggle="tooltip"]').tooltip();
  });

  // Prevent links opening in app
  var shell = _require('electron').shell;

  // open links externally by default (in the users default web browser)
  $(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
  });

  // Identification Information
  var nick = "";
  var mySystemName = "";
  var myAvatar = "img/default.png";

  var users = [];
  var tUsers = [];
  var options = {
    hostname: "t.dark-gaming.com",
    secure: true,
    protocol: 'https',
    port: 3001
  };
  var socket = socketCluster.connect(options);
  window.wssocket = socket;
  var notificationRead = true;
  var notificationTimeout = null;
  var sound = [];
  var chatsound;
  var g_discussions = [];
  var oldestDiscussionMessageID = [];
  var discussionMessages = [];
  var discussionUsers = [];
  var discussionCreator = [];
  var isMod = [];
  var receivedSaved = [];
  var earliestMessageIndex = -1;
  var earliestSearchID = -1;
  var discussionListMoused = false;
  var discussionListReceived = false;

  // Settings
  var setting_isLiveTypingDisplaying = true;
  var setting_isEnabledVoiceAlert = false;
  var setting_discussionAlertEnabled = []; // Index = discID

  // Live Updated Avatars
  var updatedAvatars = [];

  // Live Typing
  var discussionLiveTyping = [];
  var lastMessageInput = "";
  var wasCommandPrefix = false;

  var threadMessages = [];
  var threadReceivedSaved = [];
  var threadListReceived = false;

  var tUsersOnlineReceived = false;
  var inprogressMessages = []; // communicator input for each discussion

  var addUserTemplate = '<i id="adduser-discussion" class="fa fa-plus" data-container="body" data-toggle="tooltip" title="Add User to Discussion"></i>';
  var removeUserTemplate = '<i class="removeuser-discussion fa fa-minus" data-toggle="tooltip" data-placement="left" title="Remove User from Discussion"></i>';
  var leaveDiscussionTemplate = '<i class="leaveuser-discussion fa fa-minus" data-toggle="tooltip" data-placement="left" title="Leave Discussion"></i>';

  var waitingScroll = false;
  var lastNotification = null;
  var editQueueIconTimeouts = [];

  // Calls
  var phone = new Phone();

  // States
  var selectedDiscID = -1;
  var searchDiscID = -1;
  var deepHistoryDiscID = -1;
  var oldestDeepHistoryID = -1;
  var newestDeepHistoryID = -1;
  var waitingOnHistory = [];
  var waitingOnSearch = false;
  var waitingOnDeepHistory = false;
  var newSearchSubmission = true;
  var messageViewStates = {
    normal: 0, // Simply viewing messages
    search: 1, // Viewing results of a search
    deepHistory: 2 // Viewing older messages without direct connection to newest
  };
  var currentMessageViewState = messageViewStates.normal;

  // Autocomplete
  var autocompleteSelected = 0;

  // Errors
  socket.on('error', function(e) {
    console.log("Error with socket connection: " + e);
  });

  $.fn.scrollTo = function(target, options, callback) {
    if (typeof options == 'function' && arguments.length == 2) {
      callback = options;
      options = target;
    }
    var settings = $.extend({
      scrollTarget: target,
      offsetTop: 50,
      duration: 500,
      easing: 'swing'
    }, options);
    return this.each(function() {
      var scrollPane = $(this);
      var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
      var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
      scrollPane.scrollTop(scrollY - scrollTarget.height());
    });
  };

  // Shortcuts
  requirejs(['vendor/jquery.hotkeys'], function() {
    $(document).bind('keydown', 'ctrl+q', function() {
      toggleDiscussionListView();
    });
  });

  function notifyMe(discID, username, msg, title) {
    if (lastNotification !== null) {
      lastNotification.close();
    }

    var notification = new Notification(title, {
      icon: 'img/128.png',
      body: username + ": " + msg,
      id: 'darkgamingphase'
    });

    lastNotification = notification;

    notification.onclick = function() {
      _require('electron').remote.getCurrentWindow().focus();
      switchDiscussion($('#disc' + discID));
      waitingScroll = true;
      lastNotification = null;
    };

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(function() {
      // Possibly set by focusing on page
      if (lastNotification !== null) {
        notification.close();
        if (notification == lastNotification)
          lastNotification = null;
      }
    }, 15000);

    if (setting_isEnabledVoiceAlert)
      responsiveVoice.speak(username + " said: " + msg);
  }

  function callNotify(username) {
    if (lastNotification !== null) {
      lastNotification.close();
    }

    var notification = new Notification("Phase Voice", {
      icon: 'img/128.png',
      body: username + " is calling.",
      id: 'darkgamingphase'
    });

    notification.onclick = function() {
      _require('electron').remote.getCurrentWindow().focus();
    };

    lastNotification = notification;

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(function() {
      // Possibly set by focusing on page
      if (lastNotification !== null) {
        notification.close();
        if (notification == lastNotification)
          lastNotification = null;
      }
    }, 7000);

    if (setting_isEnabledVoiceAlert)
      responsiveVoice.speak(username + " is calling you on Phase.");
  }

  function strip_bbcode(text) {
    var search = [
      // Slight problem with [url] conflict "/(?<!.)((http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?)/",
      /\[notag\](\[)(.*?)\[\/notag\]/i,
      /\[b\](.*?)\[\/b\]/gi,
      /\[i\](.*?)\[\/i\]/gi,
      /\[u\](.*?)\[\/u\]/gi,
      /\[ul\](.*?)\[\/ul\]/gi,
      /\[li\](.*?)\[\/li\]/gi,
      /\[s\](.*?)\[\/s\]/,
      /\[img\](.*?)\[\/img\]/gi,
      /\[url=(.*?)\](.*?)\[\/url\]/gi,
      /\[url\](.*?)\[\/url\]/gi,
      /\[quote=(.*?)\](.*?)\[\/quote\]/gi,
      /\[center\](.*?)\[\/center\]/gi,
      //'/\[youtube](.*?)?v=(.*?)\[\/youtube\]/',
      //ASCII
      /&amp;#91;/gi,
      //smileys
      /\:\)/gi,
      /\:\(/gi,
      /\&gt\;:D/gi,
      /\:D/gi,
      /\:P/gi,
      /\;\)/gi,
      /\(evil\)/gi,
      /\(bash\)/gi,
      /\(poolparty\)/gi,
      /\(party\)/gi,
      /\(hi\)/gi,
      /\(knuckles\)/gi,
      /\:O/gi,
      /\\\o\//gi,
      /\[#(.*?)\]/gi,
      /\[color=(.*?)\](.*?)\[\/color\]/gi,
      /\[colour=(.*?)\](.*?)\[\/colour\]/gi
    ];

    var replace = [
      // "<a href=\"$2\">$2</a>",
      '$2',
      '$1',
      '$1',
      '$1',
      '$1',
      '$1',
      '$1',
      '$1',
      '$1',
      '$1', // This is now handled by linkify
      '$2',
      '$1',
      //'<iframe width="560" height="315" src="//www.youtube-nocookie.com/embed/$2?rel=0" frameborder="0" allowfullscreen></iframe>',
      //ASCII
      '[',
      //smileys
      ':)',
      ':(',
      '>:D',
      ':D',
      ':P',
      ';)',
      '(evil)',
      '(bash)',
      '(poolparty)',
      '(party)',
      '(hi)',
      '(knuckles)',
      ':O',
      '\\o/',
      '&#$1;',
      '$2',
      '$2'

    ];

    for (var index in search) {
      text = text.replace(search[index], replace[index]);
    }

    return text;
  }

  function getItemNameFromID(id) {
    if (id > 0) {
      return Item.IDs[id];
    } else if (id < 0) {
      return Item.NIDs[id];
    } else {
      // Return at least something...
      return "Beenade";
    }
  }

  function getItemImageNameFromID(id) {
    // Fallback
    if (typeof Item.IDs[id] === 'undefined' && typeof Item.NIDs[id] === 'undefined')
      return "Beenade";

    if (id > 0) {
      return encodeURIComponent(Item.IDs[id].replace(/ /g, '_'));
    } else if (id < 0) {
      return encodeURIComponent(Item.NIDs[id].replace(/ /g, '_'));
    } else {
      // Return at least something...
      return "Beenade";
    }
  }

  // avatarLoad is used to load avatars when a discussion switched to. This is
  // important as it means that any updated avatars from messages already saved
  // will get automatically updated.
  function avatarLoad(text) {
    // Replace text with avatar image.
    // The capture group is the userID
    var search = [
      /\{avatar:(.*?)\}/g
    ];

    var replace = [
      function(match, capture) {
        return updatedAvatars[capture];
      }
    ];

    for (var index in search) {
      text = text.replace(search[index], replace[index]);
    }
    return text;
  }

  function bbcode(text) {
    if (typeof text === 'undefined' || text === null)
      return text;
    //text = strip_tags(text);
    text = text.replace(/\r?\n/g, '<br />');

    var videoSearch = [
      // Videos
      /(?:(?:http|https):\/\/)?(?:www\.)?((?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^\s&]+)([^\s]*))/g,
      /(?:(?:http|https):\/\/)?((?:www\.)?(?:vimeo\.com)\/(.+))/g,
      /(?:(?:http|https):\/\/)?((?:dailymotion\.com|dai\.ly)\/(.+))/g
    ];

    var videoReplace = [
      '<a href="https://$1" target="_blank">$1</a><br /><div class="youtube-container"><div class="youtube-player" data-id="$2"><img class="youtube-thumb autoLinkedImage" src="https://i.ytimg.com/vi/$2/hqdefault.jpg"><div class="play-button"></div></div></div>',
      '<a href="https://$1" target="_blank">$1</a><br /><iframe src="//player.vimeo.com/video/$2" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe><br />',
      '<a href="https://$1" target="_blank">$1</a><br /><iframe frameborder="0" width="560" height="315" src="https://www.dailymotion.com/embed/video/$2?logo=0&foreground=ffffff&highlight=1bb4c6&background=000000" allowfullscreen></iframe><br />',
    ];

    var search = [
      // Slight problem with [url] conflict "/(?<!.)((http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?)/",
      /\[notag\](\[)(.*?)\[\/notag\]/i,
      /\[b\](.*?)\[\/b\]/gi,
      /\[i\](.*?)\[\/i\]/gi,
      /\[u\](.*?)\[\/u\]/gi,
      /\[ul\](.*?)\[\/ul\]/gi,
      /\[li\](.*?)\[\/li\]/gi,
      /\[s\](.*?)\[\/s\]/,
      /\[img\](.*?)\[\/img\]/gi,
      /\[url=(.*?)\](.*?)\[\/url\]/gi,
      /\[url\](.*?)\[\/url\]/gi,
      /\[center\](.*?)\[\/center\]/gi,
      //'/\[youtube](.*?)?v=(.*?)\[\/youtube\]/',
      //ASCII
      /&amp;#91;/gi,
      //(https:\/\/|http:\/\/)?(www\.)?([-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}?)(\.[a-z]{2,4})\b(\/(?:[-a-zA-Z0-9@:%_\+.~#&\/\/=])+)?([-a-zA-Z0-9@:%_\+~#?&\/\/=])?(\.(?:jpe?g|gif|png))?
      // URL
      /((https:\/\/|http:\/\/)?(www\.)?([a-zA-Z0-9-](?:[a-zA-Z0-9-]|([.])(?!\5)){2,256}?)(\.[a-z]{2,4})(:\d+)?(\/(?:[^\s\n])*?)?(\?[^\s\n]+)?(\.(?:jpe?g|gif|png))?)($|\s|\n|"|&quot;)/gi,

      //smileys
      /\:\)/gi,
      /\:\(/gi,
      /\&gt\;:D/gi,
      /\:D/gi,
      /\:P/gi,
      /(^|\s);\)/gi,
      /\(evil\)/gi,
      /\(bash\)/gi,
      /\(poolparty\)/gi,
      /\(party\)/gi,
      /\(hi\)/gi,
      /\(knuckles\)/gi,
      /\:O/gi,
      /\\\o\//gi,
      /\[#(.*?)\]/gi,
      /\[color=(.*?)\](.*?)\[\/color\]/gi,
      /\[colour=(.*?)\](.*?)\[\/colour\]/gi,
      /:kappa:/gi,

      // Terraria Chat Tags
      /\[i(?:.*?):(\d+)\]/g,

      // Avatars
      /\{avatar:(\d+)\}/g
    ];

    var replace = [
      // "<a href=\"$2\">$2</a>",
      '&#91;$2',
      '<b>$1</b>',
      '<i>$1</i>',
      '<u>$1</u>',
      '</p><ul>$1</ul><p>',
      '<li>$1</li>',
      '<span style="text-decoration:line-through;">$1</span>',
      '<a href="$1" target="_blank"><img class="post-image" src="$1" /></a>',
      '<a href="$1" target="_blank">$2</a>',
      '$1', // This is now handled by linkify
      '</p><p class="center">$1</p><p class="p_hbreak">',
      //'<iframe width="560" height="315" src="//www.youtube-nocookie.com/embed/$2?rel=0" frameborder="0" allowfullscreen></iframe>',
      //ASCII
      '[',
      // URL and/or video
      function(match, link, protocol, www, domain, regexDotGroup, tld, port, filepath, getParams, imageExtension, endChar) {
        //console.log(match);
        var videoSearchLength = videoSearch.length;
        var videoSites = ["youtube", "youtu", "dailymotion", "vimeo"];
        var output = link + endChar;
        if (videoSites.indexOf(domain) > -1 && (typeof getParams !== 'undefined' && getParams.length > 0 || domain == "youtu" && tld == ".be")) {
          for (var i = 0; i < videoSearchLength; i++) {
            output = output.replace(videoSearch[i], videoReplace[i]);
          }
        } else if (typeof imageExtension !== 'undefined' && imageExtension.length > 0) {
          var exp = /((\b((https?|ftp|file):\/\/)?[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])\.(?:jpe?g|gif|png))/ig;
          output = link.replace(exp, "<a href='$1'>$1</a><br><img class=\"autoLinkedImage\" src='$1'/>") + endChar;
        } else {
          if (typeof protocol !== 'undefined' && protocol.length > 0) {
            output = '<a href="' + link + '" target="_blank">' + link + '</a>' + endChar;
          } else {
            output = '<a href="http://' + link + '" target="_blank">' + link + '</a>' + endChar;
          }
        }

        return output;
      },
      //smileys
      '<img title=":)" src="https://dark-gaming.com/smileys/smile_face.gif" style="width: 15px">',
      '<img title=":(" src="https://dark-gaming.com/smileys/sad_face.gif" style="width: 15px">',
      '<img title=">&#58;D" src="https://dark-gaming.com/smileys/evil_face.gif" style="width: 15px">',
      '<img title=":D" src="https://dark-gaming.com/smileys/grin_face.gif" style="width: 15px">',
      '<img title=":P" src="https://dark-gaming.com/smileys/tongue_face.gif" style="width: 15px">',
      '$1<img title=";)" src="https://dark-gaming.com/smileys/wink_face.gif" style="width: 15px">',
      '<img title="(evil)" src="https://dark-gaming.com/smileys/evil_face.gif" style="width: 15px">',
      '<img title="(bash)" src="https://dark-gaming.com/smileys/bash_face.gif" style="width: 15px">',
      '<img title="(poolparty)" src="https://dark-gaming.com/smileys/poolparty.gif" style="width: 15px">',
      '<img title="(party)" src="https://dark-gaming.com/smileys/party.gif" style="width: 15px">',
      '<img title="(hi)" src="https://dark-gaming.com/smileys/hi.gif" style="width: 15px">',
      '<img title="(knuckles)" src="https://dark-gaming.com/smileys/games_knuckles.gif" style="width: 15px">',
      '<img title=":O" src="https://dark-gaming.com/smileys/suprised_face.gif" style="width: 15px">',
      '<img title="\o/" src="https://dark-gaming.com/smileys/duop.gif" style="width: 15px">',
      '&#$1;',
      '<span style="color:$1;">$2</span>',
      '<span style="color:$1;">$2</span>',
      '<img title=":kappa:" src="img/kappa.png" style="width: 30px; height: 30px" />',

      // Terraria Chat Tags
      function(match, capture) {
        return '<img class="autoLinkedImage terrariaItem" data-toggle="tooltip" data-placement="right" title="Terraria Item: ' + getItemNameFromID(capture - 1) + '" src="https://t.dark-gaming.com/view/items_images/' + getItemImageNameFromID(capture - 1) + '.png" />';
      }
    ];

    for (var index in search) {
      text = text.replace(search[index], replace[index]);
    }

    // This only allows "<br />" (new lines) if the new line is not inside a <ul> and/or <li>
    text = text.replace("/(?!(\<ul\>|\<li\>|\<\/li\>).*?)\\n(?!((?!<).)*?(\<\/ul\>|\<\/li\>|\<li\>))/is", ' <br />');
    return text;
  }

  // Custom scrollbar
  var chatScrollManuallyHandled = false;
  var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel";
  document.addEventListener(mousewheelevt, function(e) {
    var deltaY = e.deltaY;
    //HOIK 
    if ($('#phase-main-chat:hover').length > 0) {
      var fraction = ($('#phase-main-chat-messages')[0].scrollTop + e.deltaY) / ($('#phase-main-chat-messages')[0].scrollHeight - $('#phase-main-chat-messages')[0].offsetHeight);
      if (fraction > 1) {
        fraction = 1;
      } else if (fraction < 0) {
        fraction = 0;
      }
      var total = ($('#phase-main-chat-scroller')[0].offsetHeight - $('#thumb').height()) * fraction;

      var thumbTop = parseInt($('#thumb')[0].style.top);
      var topDelta = Math.abs(total - thumbTop) !== 0 ? Math.abs(total - thumbTop) : 0.1;
      var inverseSpeed = 30 / topDelta;
      var maxInverseSpeed = 0.5;
      if (inverseSpeed > maxInverseSpeed) {
        inverseSpeed = maxInverseSpeed;
      }

      $('#thumb').finish().css("top", thumbTop + "px").animate({ 'top': total + "px" }, 400 * inverseSpeed);

      var top = parseInt($('#phase-main-chat-messages')[0].style.top);
      $('#phase-main-chat-messages').finish().css("top", top + "px").animate({
        scrollTop: $('#phase-main-chat-messages')[0].scrollTop + e.deltaY
      }, 100, 'swing');

      chatScrollManuallyHandled = true;
    }
  }, false);

  function updateChatScroll() {
    var displayedMessages = $('#phase-main-chat-messages').children().length;
    var baseDisplayedMessages = 40;
    var baseHeight = 160;
    var tScrollHeight = ($('#phase-main-chat-messages').prop('scrollHeight'));

    var height;
    var tDifference = tScrollHeight - $('#phase-main-chat-messages').height();
    var scrollerHeight = $('#phase-main-chat-scroller').height();
    if (tScrollHeight > 0 && tDifference > 0) {
      height = scrollerHeight / tScrollHeight * scrollerHeight;
    } else {
      height = scrollerHeight;
    }
    if (height > scrollerHeight || height === 0) {
      height = scrollerHeight;
    }
    $('#thumb').height(height + "px");

    if (height === scrollerHeight) {
      $('#phase-main-chat-scroller').css('width', '0');
    } else {
      $('#phase-main-chat-scroller').css('width', '8px');
    }

    var fraction;
    if ($('#phase-main-chat-messages')[0].scrollTop === 0) {
      fraction = 0;
    } else {
      fraction = ($('#phase-main-chat-messages')[0].scrollTop) / ($('#phase-main-chat-messages')[0].scrollHeight - $('#phase-main-chat-messages')[0].offsetHeight);
      if (fraction > 1) {
        fraction = 1;
      } else if (fraction < 0) {
        fraction = 0;
      }
    }

    var total = ($('#phase-main-chat-scroller')[0].offsetHeight - $('#thumb').height()) * fraction;
    $('#thumb').css('top', total + 'px');
  }

  $('#phase-main-chat-messages').on('DOMNodeInserted DOMNodeRemoved', function() {
    updateChatScroll();
  });

  $(window).on('resize', function() {
    updateChatScroll();
  });

  // end custom scrollbar

  $('body').on('click', '.youtube-player', function() {
    displayYoutubeVideo($(this));
  });

  function displayYoutubeVideo(elem) {
    var videoID = elem.attr('data-id');
    var parent = elem.parent();
    elem.remove();
    parent.append('<iframe width="640" height="360" src="https://www.youtube.com/embed/' + videoID + '?modestbranding=1&rel=0&autoplay=1&wmode=transparent&theme=light&color=white" frameborder="0" allowfullscreen></iframe>');
  }

  function strip_tags(input, allowed) {
    allowed = (((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
      .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
      commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '')
      .replace(tags, function($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
      });
  }

  function htmlspecialchars(string, quote_style, charset, double_encode) {
    if (typeof(string) == 'undefined' || string === null) {
      StackTrace.get()
        .then(function(stack) { log.info(stack) })
        .catch(function(err) {});
      return string;
    }

    var optTemp = 0,
      i = 0,
      noquotes = false;
    if (typeof quote_style === 'undefined' || quote_style === null) {
      quote_style = 2;
    }
    string = string.toString();
    if (double_encode !== false) { // Put this first to avoid double-encoding
      string = string.replace(/&/g, '&amp;');
    }
    string = string.replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    var OPTS = {
      'ENT_NOQUOTES': 0,
      'ENT_HTML_QUOTE_SINGLE': 1,
      'ENT_HTML_QUOTE_DOUBLE': 2,
      'ENT_COMPAT': 2,
      'ENT_QUOTES': 3,
      'ENT_IGNORE': 4
    };
    if (quote_style === 0) {
      noquotes = true;
    }
    if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
      quote_style = [].concat(quote_style);
      for (i = 0; i < quote_style.length; i++) {
        // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
        if (OPTS[quote_style[i]] === 0) {
          noquotes = true;
        } else if (OPTS[quote_style[i]]) {
          optTemp = optTemp | OPTS[quote_style[i]];
        }
      }
      quote_style = optTemp;
    }
    if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
      string = string.replace(/'/g, '&#039;');
    }
    if (!noquotes) {
      string = string.replace(/"/g, '&quot;');
    }

    return string;
  }

  // Currently only matches a URL with an image extension
  function replaceURLWithImage(text) {
    if (typeof(text) === 'undefined')
      return text;

    var exp = /((\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])+\.(?:jpe?g|gif|png))/ig;
    return text.replace(exp, "<a href='$1'>$1</a><br><img class=\"autoLinkedImage\" src='$1'/>");
  }

  // Used to scroll to the bottom of the chat list
  function scrollChatByHeight(height) {
    var chat = document.getElementById('phase-main-chat-messages');
    chat.scrollTop += height;
    updateChatScroll();
  }

  // Returns the images matched from text but only matches one with an image extension
  function getImageURLFromText(text) {
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])+\.(?:jpe?g|gif|png)/ig;
    return text.match(exp, "<img src='$1'/>");
  }

  // Gets the cookies for session authentication
  function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
  }

  function IsValidImageUrl(url, cb) {
    $("<img>", {
      src: url,
      error: function() {
        cb(false);
      },
      load: function() {
        cb(true);
      }
    });
  }

  // ALGORITHM
  // Sorting and Searching
  function swap(items, first, second) {
    var temp = items[first];
    items[first] = items[second];
    items[second] = temp;
  }

  function compare(a, b, lower, ignorecase) {
    if (typeof(lower) !== 'boolean')
      lower = true;

    if (lower) {
      return ignorecase ? a.toLower() < b.toLower() : a < b;
    } else {
      return ignorecase ? a.toLower() > b.toLower() : a > b;
    }
  }

  function partition(items, ascending, ignorecase, left, right) {
    var pivot = items[Math.floor((right + left) / 2)];

    while (left <= right) {
      // We don't need to move anything on the
      // left of the pivot if it is already less
      // than it
      while (compare(items[left], pivot, ascending, ignorecase)) {
        left++;
      }

      // We do not need to mvoe anything on the
      // right of the pivot if it is alreay greater
      // than it
      while (compare(items[right], pivot, !ascending, ignorecase)) {
        right--;
      }

      // At the left and right positions (if not equal)
      // there will be 2 items that are on the wrong side,
      // therefore they need to be swapped
      if (left <= right) {
        swap(items, left, right);
        left++;
        right--;
      }
    }

    return left;
  }

  // Recursive Quicksort. Partitions elements into two groups until there are only
  // two items in the "current group", and then it compares them and swaps if necessary
  function sortItems(items, ascending, ignorecase, left, right) {
    if (typeof(ascending) != 'boolean')
      ascending = true;

    if (typeof(ignorecase) != 'boolean')
      ignorecase = true;

    // Quicksort
    var index;

    if (typeof(left) !== 'number')
      left = 0;

    if (typeof(right) !== 'number')
      right = items.length - 1;

    // It's only necessary to sort if there is more than 1 item
    // Partition only when we have more than 2 elements in the list
    if (items.length > 2) {
      index = partition(items, ascending, ignorecase, left, right);

      if (left < index - 1) {
        sortItems(items, ascending, ignorecase, left, index - 1);
      }

      if (index < right) {
        sortItems(items, ascending, ignorecase, index, right);
      }
    } else if (items.length === 2) {
      if (!compare(items[0], items[1], ascending, ignorecase))
        swap(items, 0, 1);
    }

    return items;
  }

  // Recursive Quicksort. Same as above, but it uses .name and .systemName
  // object on comparisons as required.
  function discUsersSwap(items, first, second) {
    var temp = items[first];
    items[first] = items[second];
    items[second] = temp;
  }

  function discUsersCompare(a, b, lower, ignorecase) {
    if (typeof(lower) !== 'boolean')
      lower = true;

    if (lower) {
      return a.name + a.systemName < b.name + b.systemName;
    } else {
      return a.name + a.systemName > b.name + b.systemName;
    }
  }

  function discUsersPartition(items, ascending, ignorecase, left, right) {
    var pivot = items[Math.floor((right + left) / 2)];

    while (left <= right) {
      // We don't need to move anything on the
      // left of the pivot if it is already less
      // than it
      while (discUsersCompare(items[left], pivot, ascending, ignorecase)) {
        left++;
      }

      // We do not need to mvoe anything on the
      // right of the pivot if it is alreay greater
      // than it
      while (discUsersCompare(items[right], pivot, !ascending, ignorecase)) {
        right--;
      }

      // At the left and right positions (if not equal)
      // there will be 2 items that are on the wrong side,
      // therefore they need to be swapped
      if (left <= right) {
        discUsersSwap(items, left, right);
        left++;
        right--;
      }
    }

    return left;
  }

  function discUsersSort(items, ascending, ignorecase, left, right) {
    if (typeof(items) === 'undefined')
      return items;

    if (typeof(ascending) != 'boolean')
      ascending = true;

    if (typeof(ignorecase) != 'boolean')
      ignorecase = true;

    // Quicksort
    var index;

    if (typeof(left) !== 'number')
      left = 0;

    if (typeof(right) !== 'number')
      right = items.length - 1;

    // It's only necessary to sort if there is more than 1 item
    if (items.length > 2) {
      index = discUsersPartition(items, ascending, ignorecase, left, right);

      if (left < index - 1) {
        discUsersSort(items, ascending, ignorecase, left, index - 1);
      }

      if (index < right) {
        discUsersSort(items, ascending, ignorecase, index, right);
      }
    } else if (items.length === 2) {
      if (!discUsersCompare(items[0].name.toLowerCase() + items[0].systemName.toLowerCase(), items[1].name.toLowerCase() + items[1].systemName.toLowerCase(), ascending, ignorecase))
        discUsersSwap(items, 0, 1);
    }

    return items;
  }
  // End Sorting and Searching

  // Switching Discussions
  function switchDiscussion(elem) {
    if (!elem.hasClass('selected')) {
      var id, discID;
      id = discID = elem.attr('id').substr(4);

      // Store our current input into array for when they click back
      if ($('.selected').attr('id')) {
        inprogressMessages[selectedDiscID] = $('#chat-textarea').val();
      }

      selectedDiscID = id;
      searchDiscID = id;

      // Set View State
      currentMessageViewState = messageViewStates.normal;

      // Reset search variables
      earliestSearchID = -1;
      newSearchSubmission = true;

      $('#disc' + selectedDiscID).find('.discussion-alert').hide();
      hideSpinner(discID);
      if (elem.hasClass('unread'))
        elem.removeClass('unread');

      // Clear search
      $('#input-search').val('');
      $('#input-search').hide();

      // Clear current display
      $('#phase-main-chat-messages-list').html('');
      $('#chat-list-inprogress').html('');

      // Change message input field to contain previous input (which defaults to "")
      $('#chat-textarea').val(inprogressMessages[selectedDiscID]);

      // Update was commandPrefix to ensure our live typing state
      // is correct
      if (typeof inprogressMessages[selectedDiscID] !== 'undefined' && inprogressMessages[selectedDiscID][0] === '/') {
        wasCommandPrefix = true;
      } else {
        wasCommandPrefix = false;
      }

      // Change stored lastMessageInput (for live typing)
      lastMessageInput = typeof inprogressMessages[selectedDiscID] !== 'undefined' ? inprogressMessages[selectedDiscID] : "";

      // Set status of alert icon
      if (setting_discussionAlertEnabled[discID]) {
        $('#alert-bell').removeClass('alert-bell-inactive').addClass('alert-bell-active');
        $('#alert-bell').attr('title', 'Disable Alerts for this discussion').tooltip('fixTitle');
      } else {
        $('#alert-bell').addClass('alert-bell-inactive').removeClass('alert-bell-active');
        $('#alert-bell').attr('title', 'Enable Alerts for this discussion').tooltip('fixTitle');
      }

      $('.selected').removeClass('selected');
      elem.addClass('selected');
      $('#edit_users_panel').hide();
      $('#rename_discussion_panel').hide();

      // Thread or Phase Discussion
      if (elem.attr('id').substr(0, 4) == 'disc') {
        $('#phase-nav-discussiontitle-edit').text($('.selected').children('.discussion-title').text());

        // If we've not received some history, retrieve some
        if (!receivedSaved[id]) {
          socket.emit('discussion users', id);
          socket.emit('discussion messages', id);
        } else {
          var openInviteDiscussion = discussionUsers[id][0] == '<b>Everyone</b>' ? false : true; // At this time all non-global are open
          if (openInviteDiscussion) {
            $('#people-section-discussion').find('#adduser-discussion').remove();
            $('#people-section-discussion').children('.people-section-name').append(addUserTemplate);
          } else {
            $('#people-section-discussion').find('#adduser-discussion').remove();
          }

          updateDiscussionUsers(id);

          // We just need to display the data already stored
          if (typeof(discussionMessages[id]) !== 'undefined') {
            var lowestMessageIndex = discussionMessages[id].length - 40 >= 0 ? discussionMessages[id].length - 40 : 0;
            var html = "";
            for (var i = lowestMessageIndex; i < discussionMessages[id].length; i++) {
              html += discussionMessages[id][i];
            }

            // Set html, scroll chat by image
            $('#phase-main-chat-messages-list').html(avatarLoad(html)).find('.autoLinkedImage').each(function() {
              getImageSize($(this), function(width, height) {
                scrollChatByHeight(height);
              });
            });
            earliestMessageIndex = lowestMessageIndex;
          }

          // Load in live-typing
          var liveTypingElem;
          var username;
          var systemName;
          var avatar;
          var discussionUsersLength;
          for (var userID in discussionLiveTyping[discID]) {
            if (discussionLiveTyping[discID][userID] !== "" && discussionLiveTyping[discID][userID].length > 0) {
              avatar = "https://dark-gaming.com/img/default.png";
              discussionUsersLength = typeof discussionUsers[discID] !== 'undefined' ? discussionUsers[discID].length : 0;
              for (var i = 0; i < discussionUsersLength; i++) {
                if (discussionUsers[discID][i].userID == userID) {
                  username = discussionUsers[discID][i].name;
                  systemName = discussionUsers[discID][i].systemName;
                  if (typeof updatedAvatars[userID] !== 'undefined') {
                    avatar = updatedAvatars[userID];
                  } else if (typeof discussionUsers[discID][i].avatar !== 'undefined') {
                    avatar = discussionUsers[discID][i].avatar;
                  }
                  break;
                }
              }

              $('#chat-list-inprogress').append(inProgressMessageFormat(userID, username, systemName, avatar));
              inProgressMessage = document.getElementById('user' + userID);
              var message = $(inProgressMessage).find('.chat-message-content');
              message.text(discussionLiveTyping[discID][userID]);
            }
          }

          // Scroll 'em down
          var chat = document.getElementById('phase-main-chat-messages');
          chat.scrollTop = chat.scrollHeight;
          updateChatScroll();
        }
      }
    }
  }

  $('#phase-main-discussionslist').on('click', '.discussion', function() {
    switchDiscussion($(this));
  }).mouseenter(function() {
    discussionListMoused = true;
  }).mouseleave(function() {
    discussionListMoused = false;
  });

  // Server tells us the users in a discussion
  socket.on('discussion users', function(data) {
    var discID = data.discID,
      names = data.users;
    discussionUsers[discID] = names[1];

    if (selectedDiscID == discID) {
      var openInviteDiscussion = discussionUsers[discID][0] == '<b>Everyone</b>' ? false : true; // At this time all non-global are open
      if (openInviteDiscussion) {
        $('#people-section-discussion').find('#adduser-discussion').remove();
        $('#people-section-discussion').children('.people-section-name').append(addUserTemplate);
      } else {
        $('#people-section-discussion').find('#adduser-discussion').remove();
      }
    }

    sortDiscussionUsers(discID);
    updateIsMod(discID);
    updateDiscussionUsers(discID);

    // Load in live-typing
    var liveTypingElem;
    var username;
    var systemName;
    var avatar;
    var discussionUsersLength;
    for (var userID in discussionLiveTyping[discID]) {
      if (discussionLiveTyping[discID][userID] !== "" && discussionLiveTyping[discID][userID].length > 0) {
        avatar = "https://dark-gaming.com/img/default.png";
        discussionUsersLength = typeof discussionUsers[discID] !== 'undefined' ? discussionUsers[discID].length : 0;
        for (var i = 0; i < discussionUsersLength; i++) {
          if (discussionUsers[discID][i].userID == userID) {
            username = discussionUsers[discID][i].name;
            systemName = discussionUsers[discID][i].systemName;
            if (typeof updatedAvatars[userID] !== 'undefined') {
              avatar = updatedAvatars[userID];
            } else if (typeof discussionUsers[discID][i].avatar !== 'undefined') {
              avatar = discussionUsers[discID][i].avatar;
            }
            break;
          }
        }

        $('#chat-list-inprogress').append(inProgressMessageFormat(userID, username, systemName, avatar));
        inProgressMessage = document.getElementById('user' + userID);
        var message = $(inProgressMessage).find('.chat-message-content');
        message.text(discussionLiveTyping[discID][userID]);
      }
    }

    // Scroll 'em down
    var chat = document.getElementById('phase-main-chat-messages');
    chat.scrollTop = chat.scrollHeight;
    updateChatScroll();
  });

  function getTimeString(timestamp) {
    return moment(timestamp * 1000).calendar(null, {
      sameDay: "[Today at] LT",
      lastWeek: "dddd [at] LT",
      sameElse: "dddd Do MMM, YYYY"
    });
  }

  function isUserOnline(user) {
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name == user.name && users[i].systemName == user.systemName)
        return true;
    }

    return false;
  }

  function updateIsMod(discID) {
    var me = getDiscussionUserByID(discID, myuserID, nick, mySystemName);
    if (me !== false) {
      isMod[discID] = me.mod;
    }
  }

  function getDiscussionUserByName(discID, username, systemName) {
    if (typeof discussionUsers[discID] === 'undefined' || discussionUsers[discID].length === 0)
      return false;

    var low = 0;
    var high = discussionUsers[discID].length - 1;
    var mid;
    var found = null;
    while (found === null) {
      mid = Math.floor((high + low) / 2);
      if (low === mid) {
        if (discussionUsers[discID][mid].name === username && discussionUsers[discID][mid].systemName === systemName) {
          found = discussionUsers[discID][mid];
        } else {
          found = false;
        }
      } else {
        if (discussionUsers[discID][mid].name === username && discussionUsers[discID][mid].systemName === systemName) {
          found = discussionUsers[discID][mid];
        } else {
          if (discussionUsers[discID][mid].name + discussionUsers[discID][mid].systemName < username + systemName) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
      }
    }

    return found;
  }

  // The Discussion User list is sorted by name+systemName Ascending (a-z)
  function getDiscussionUserByID(discID, userID, username, systemName) {
    if (typeof discussionUsers[discID] === 'undefined' && discussionUsers[discID].length === 0)
      return;

    var low = 0;
    var high = discussionUsers[discID].length - 1;
    var mid;
    var found = null;
    while (found === null) {
      mid = Math.floor((high + low) / 2);

      // Last element in search has been reached
      if (low === mid) {
        if (discussionUsers[discID][mid].userID === userID) {
          found = discussionUsers[discID][mid];
        } else {
          // The element does not match, therefore no such user id
          // in Discussion Users list
          found = false;
        }
      } else {
        if (discussionUsers[discID][mid].userID === userID) {
          // Match; Set found to this element
          found = discussionUsers[discID][mid];
        } else {
          if (discussionUsers[discID][mid].name + discussionUsers[discID][mid].systemName < username + systemName) {
            // The element is further in the list compared to the current element
            low = mid + 1;
          } else {
            // The element is earlier in the list compared to the current element
            high = mid - 1;
          }
        }
      }
    }

    // Returns either the element or false
    return found;
  }

  function checkDiscussionUsersChange(name, status) {
    var discID = selectedDiscID;

    if (discID > 0) {
      sortDiscussionUsers(discID);
      updateDiscussionUsers(discID);
    }
  }

  function sortDiscussionUsers(discID) {
    discussionUsers[discID] = discUsersSort(discussionUsers[discID], true);
  }

  function updateDiscussionUsers(discID) {
    if (discussionUsers[discID]) {
      // If it isn't selected, then we should not update the list, as they probably
      // clicked on another discussion
      if (selectedDiscID != discID)
        return;

      var section = $('#people-section-discussion');
      var sectionList = section.children(".people-section-list").children('ul');

      // Clear List
      sectionList.html('');

      var status;
      var discussionUsersLength = discussionUsers[discID].length;
      var onlineCount = 0;
      var onlineUsers = [];
      var busyUsers = [];
      var offlineUsers = [];
      var globalDiscussion = discussionUsers[discID].length == 1 && discussionUsers[discID] == '<b>Everyone</b\>';

      if (globalDiscussion) {
        status = '<i class="fa fa-circle" data-toggle="tooltip" data-placement="left" title="Online"></i>';
        onlineUsers.push($('<li id="discussionuser-' + i + '">').html('<span class="people-username">' + discussionUsers[discID][0].name + '</span>' + status));
        onlineCount = 1;
      } else {
        var formatName;
        var mod;
        var avatar;
        for (var i = 0; i < discussionUsersLength; i++) {
          if (discussionUsers[discID][i].name === null)
            continue;

          status = "";
          if (typeof updatedAvatars[discussionUsers[discID][i].userID] !== 'undefined') {
            avatar = updatedAvatars[discussionUsers[discID][i].userID];
          } else {
            if (typeof discussionUsers[discID][i].avatar !== 'undefined') {
              avatar = discussionUsers[discID][i].avatar;
            } else {
              avatar = 'img/default.png';
            }
          }

          avatar = avatar.replace(/^\//, 'https://t.dark-gaming.com:3001/');

          // Set mod string
          if (discussionCreator[discID] === myuserID) {
            mod = discussionUsers[discID][i].mod ? discussionUsers[discID][i].userID !== myuserID ? '<span class="mod demote-mod" data-toggle="tooltip" data-placement="left" title="Click to demote this user">&#9812;</span>' : '<span class="mod" data-toggle="tooltip" data-placement="left" title="Discussion Moderator">&#9812;</span>' : '<span class="add-mod" data-toggle="tooltip" data-placement="left" title="Make user Moderator">&#9812;</span>';
          } else {
            mod = discussionUsers[discID][i].mod ? '<span class="mod" data-toggle="tooltip" data-placement="left" title="Discussion Moderator">&#9812;</span>' : '';
          }

          formatName = discussionUsers[discID][i].systemName == mySystemName ? '<span class="username">' + htmlspecialchars(discussionUsers[discID][i].name) + '</span>' : '<span class="username">' + htmlspecialchars(discussionUsers[discID][i].name) + '</span><i class="systemName">@' + discussionUsers[discID][i].systemName + "</i>";
          if (isUserOnline(discussionUsers[discID][i])) {
            onlineCount++;
            status = '<i class="fa fa-circle" data-toggle="tooltip" data-placement="left" title="Online"></i>';

            if (discussionUsers[discID][i].name == nick && discussionUsers[discID][i].systemName == mySystemName) {
              onlineUsers.push($('<li id="discussionuser-' + i + '">').html('<div class="people_user_avatar"><img class="avatar_' + discussionUsers[discID][i].userID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username"><span class="username">' + htmlspecialchars(discussionUsers[discID][i].name) + '</span></span></div>' + status + leaveDiscussionTemplate + mod));
            } else {
              if (discussionCreator[discID] != myuserID && !isMod[discID])
                onlineUsers.push($('<li id="discussionuser-' + i + '">').html('<div class="people_user_avatar"><img class="avatar_' + discussionUsers[discID][i].userID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username">' + formatName + '</span></div>' + status + mod));
              else
                onlineUsers.push($('<li id="discussionuser-' + i + '">').html('<div class="people_user_avatar"><img class="avatar_' + discussionUsers[discID][i].userID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username">' + formatName + '</span></div>' + status + removeUserTemplate + mod));
            }
          } else {
            status = '<i class="fa fa-circle user-status-offline" data-toggle="tooltip" data-placement="left" title="Offline"></i>';
            if (discussionCreator[discID] != myuserID && !isMod[discID])
              offlineUsers.push($('<li id="discussionuser-' + i + '">').html('<div class="people_user_avatar"><img class="avatar_' + discussionUsers[discID][i].userID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username">' + formatName + '</span></div>' + status + mod));
            else
              offlineUsers.push($('<li id="discussionuser-' + i + '">').html('<div class="people_user_avatar"><img class="avatar_' + discussionUsers[discID][i].userID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username">' + formatName + '</span></div>' + status + removeUserTemplate + mod));
          }
        }
      }

      var onlineUsersLength = onlineUsers.length;
      for (var i = 0; i < onlineUsersLength; i++) {
        sectionList.append(onlineUsers[i]);
      }

      var offlineUsersLength = offlineUsers.length;
      for (var i = 0; i < offlineUsersLength; i++) {
        sectionList.append(offlineUsers[i]);
      }

      $('#people-section-discussion-count').text(onlineCount + " / " + discussionUsersLength);

      // This allows the bootstrap tooltips to work on the new DOM elements
      $('[data-toggle="tooltip"]').tooltip();
    }
  }

  /* CLICK EVENTS */

  $('body').on('click', '#edit_users', function() {
    var discName = $('.selected').children('.subject').text();
    discName = discName.length > 9 ? discName.substr(0, 9) + '...' : discName;
    $('#edit_users_discussionName').text(discName);
    $('#edit_users_panel').show();
  }).on('click', '#edit_users_cancel', function() {
    $('#edit_users_panel').hide();
  });

  $('body').on('click', '#rename_discussion', function() {
    var discID = selectedDiscID;
    var discName = $('.selected').children('.subject').text();
    discName = discName.length > 9 ? discName.substr(0, 9) + '...' : discName;
    $('#rename_discussion_discussionName').text(discName);
    $('#rename_discussion_panel').show();
  }).on('click', '#rename_discussion_cancel', function() {
    $('#rename_discussion_panel').hide();
  });

  $('body').on('click', '#leave_discussion', function() {
    var discID = selectedDiscID;
    if (discussionCreator[discID] != nick) {
      socket.emit('discussion user leave', discID);
    }
  });


  // -----
  // Add a Discussion
  // -----
  function addDiscussionInitiate() {
    // Remove selected to ensure scroll checks do not insert messages
    selectedDiscID = -1;
    $('.selected').removeClass('selected');

    // Replace text with input tag
    $('#phase-nav-discussiontitle-edit').html('<input placeholder="Enter a Discussion Name..." id="phase-nav-discussiontitle_input" type="text" style="width: 100%; background: none; border: none; position: relative; bottom: 3px;"/>');

    // Clear current chat messages list
    $('#chat-list').html('');

    // Focus on the new input field
    $('#phase-nav-discussiontitle_input').focus();

    // Await enter key
    $('#phase-nav-discussiontitle_input').on('keyup', function(e) {
      if (e.keyCode == 13) {
        var name = $('#phase-nav-discussiontitle_input').val();
        $('#phase-nav-discussiontitle-edit').text(name);
        socket.emit('discussion add', name);
      }
    });
  }

  $('body').on('mousedown', function(e) {
    var avatarForm = $("#phase-avatar-form");

    if (!avatarForm.is(e.target) && // if the target of the click isn't the container...
      avatarForm.has(e.target).length === 0) // ... nor a descendant of the container
    {
      avatarForm.hide();
    }
  });

  function toggleDiscussionListView() {
    var normal = $('#phase-main').find('#phase-main-discussions');
    var modified = $('#phase-main').find('#phase-main-discussions_alt-display');
    if (normal.length) {
      normal.attr("id", "phase-main-discussions_alt-display");
    } else {
      modified.attr("id", "phase-main-discussions");
    }
  }

  $('body').on('click', '#change-discussionlist-view', function() {
    toggleDiscussionListView();
  });

  $('body').on('click', '#add-discussion', function() {
    addDiscussionInitiate();
  });

  // Shortcuts
  $('body').on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey) {
      switch (e.keyCode) {
        case 83:
          searchMessagesInitiate();
          break;
        case 88:
          addDiscussionInitiate();
          break;
        case 90:
          addUserInitiate();
          break;
      }
    }
  });

  $('body').on('click', '#add-discussion-button_create', function() {
    $('#add-discussion-choice').hide();
    $('#add-discussion-create').show();
  });

  $('body').on('click', '.people-section', function() {
    var arrow = $(this).children('.people-section-name').children('.glyphicon');
    var elementList = $(this).children('.people-section-list');
    if (arrow.hasClass('glyphicon-chevron-down')) {
      arrow.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
      elementList.show();
    } else {
      arrow.addClass('glyphicon-chevron-down').removeClass('glyphicon-chevron-up');
      elementList.hide();
    }
  });

  // ------
  // Adding a User to a Discussion
  // -----

  function addUserInitiate() {
    var list = $('#people-section-discussion').find('ul');
    var list_div = list.parent();
    autocompleteSelected = 0;
    list_div.show();
    list.append('<li><input placeholder="Enter a username..." id="adduser-discussion_input" type="text" /></li><div id="autocomplete"><ul></ul></div>');
    $('#adduser-discussion_input').focus().on('input', function() {
      if ($(this).val().length < 1) {
        $('#autocomplete').children('ul').html('');
      } else {
        socket.emit('search autocomplete username', {
          terms: $(this).val()
        });
      }
      autocompleteSelected = 0;
    }).on('blur', function() {
      $('#autocomplete').hide();
    }).on('focus', function() {
      $('#autocomplete').show();
    }).on('keydown', function(e) {
      switch (e.keyCode) {
        // UP Arr
        case 38:
          autocompleteSelected -= 1;

          if (autocompleteSelected < 0)
            autocompleteSelected = $('#autocomplete ul li').length;
          break;

          // DOWN Arr
        case 40:
          autocompleteSelected += 1;

          if (autocompleteSelected > $('#autocomplete ul li').length)
            autocompleteSelected = 0;
          break;

          // ENTER
        case 13:
          if (autocompleteSelected > 0) {
            var selected = $('#autocomplete ul').find('li:eq(' + parseInt(autocompleteSelected - 1) + ')');
            if (typeof selected !== 'undefined') {
              $(this).val(selected.html());
            }
          }
          break;
      }

      $('#autocomplete ul').children('.highlighted').removeClass('highlighted');
      if (autocompleteSelected > 0) {
        var current = $('#autocomplete ul').find('li:eq(' + parseInt(autocompleteSelected - 1) + ')');
        if (typeof current !== 'undefined') {
          current.addClass('highlighted');
        }
      }
    });

    $('#adduser-discussion_input').on('keyup', function(e) {
      if (e.keyCode == 13) {
        addUserRequest();
      }
    }).on('blur', function() {
      if (typeof($(this).pendingResponse) !== 'undefined')
        $(this).parent('li').remove();
    });

    var chat = list.get(0);
    chat.scrollTop = chat.scrollHeight;
    updateChatScroll();
  }

  function addUserRequest() {
    var entireInput = $('#adduser-discussion_input').val();
    var splitLocation = entireInput.lastIndexOf('@');
    var username = splitLocation > -1 ? entireInput.substr(0, splitLocation) : entireInput;
    var systemName = splitLocation > -1 ? entireInput.substr(splitLocation + 1) : mySystemName;
    $('#adduser-discussion_input').pendingResponse = true;
    $('#adduser-discussion_input').blur();

    var discID = selectedDiscID;
    socket.emit('discussion user add', {
      discID: discID,
      username: username,
      systemName: systemName
    });
  }

  $('body').on('mousedown', '#people-section-discussion #autocomplete li', function() {
    $('#adduser-discussion_input').val($(this).html());
    addUserRequest();
  });

  $('body').on('click', '#adduser-discussion', function(e) {
    addUserInitiate();

    // Stop the user list from opening (above onclick event function)
    e.stopPropagation();
  });

  // ----
  // Adding a User to a Call
  // ----
  function addCallUserInitiate() {
    var list = $('#people-section-call').find('ul');
    var list_div = list.parent();
    autocompleteSelected = 0;
    list_div.show();
    list.append('<li><input placeholder="Enter a username..." id="adduser-call_input" type="text" /></li><div id="autocomplete"><ul></ul></div>');
    $('#adduser-call_input').focus().on('input', function() {
      if ($(this).val().length < 1) {
        $('#autocomplete').children('ul').html('');
      } else {
        socket.emit('search autocomplete username', {
          terms: $(this).val()
        });
      }
      autocompleteSelected = 0;
    }).on('blur', function() {
      $('#autocomplete').hide();
    }).on('focus', function() {
      $('#autocomplete').show();
    }).on('keydown', function(e) {
      switch (e.keyCode) {
        // UP Arr
        case 38:
          autocompleteSelected -= 1;

          if (autocompleteSelected < 0)
            autocompleteSelected = $('#autocomplete ul li').length;
          break;

          // DOWN Arr
        case 40:
          autocompleteSelected += 1;

          if (autocompleteSelected > $('#autocomplete ul li').length)
            autocompleteSelected = 0;
          break;

          // ENTER
        case 13:
          if (autocompleteSelected > 0) {
            var selected = $('#autocomplete ul').find('li:eq(' + parseInt(autocompleteSelected - 1) + ')');
            if (typeof selected !== 'undefined') {
              $(this).val(selected.html());
            }
          }
          break;
      }

      $('#autocomplete ul').children('.highlighted').removeClass('highlighted');
      if (autocompleteSelected > 0) {
        var current = $('#autocomplete ul').find('li:eq(' + parseInt(autocompleteSelected - 1) + ')');
        if (typeof current !== 'undefined') {
          current.addClass('highlighted');
        }
      }
    });

    $('#adduser-call_input').on('keyup', function(e) {
      if (e.keyCode == 13) {
        addCallUserRequest();
      }
    }).on('blur', function() {
      if (typeof($(this).pendingResponse) !== 'undefined')
        $(this).parent('li').remove();
    });

    var chat = list.get(0);
    chat.scrollTop = chat.scrollHeight;
    updateChatScroll();
  }

  function addCallUserRequest() {
    var entireInput = $('#adduser-call_input').val();
    var splitLocation = entireInput.lastIndexOf('@');
    var username = splitLocation > -1 ? entireInput.substr(0, splitLocation) : entireInput;
    var systemName = splitLocation > -1 ? entireInput.substr(splitLocation + 1) : mySystemName;
    $('#adduser-call_input').parent().remove();
    $('#people-section-call #autocomplete').remove();

    if ($('#people-section-call ul li').length === 0) {
      $('#people-section-call ul').append('<li id="calluser-' + myuserID + '"><div class="people_user_avatar"><img class="avatar_' + myuserID + '" src="' + myAvatar + '"></div><div class="people_user_right"><span class="people-username"><span class="username">' + htmlspecialchars(nick) + '</span></span></div></li>');
      $('#people-section-call-count').text('1');
    }

    var discID = selectedDiscID;
    socket.emit('call group request', {
      username: username,
      systemName: systemName,
      peerID: phone.peer.id
    });
  }

  $('body').on('mousedown', '#people-section-call #autocomplete li', function() {
    $('#adduser-call_input').val($(this).html());
    addCallUserRequest();
  });

  $('body').on('click', '#adduser-call', function(e) {
    addCallUserInitiate();
    e.stopPropagation();
  });

  // ----
  // Removing a User from a Discussion
  // ----

  $('body').on('click', '.removeuser-discussion', function(e) {
    var username = $(this).parent().find('.username').text();
    var systemNameElement = $(this).parent().find('.systemName');
    var systemName = systemNameElement.length > 0 ? systemNameElement.text().substr(1) : mySystemName;
    $(this).parent().css({
      'background-color': '#FF3B3B',
      'color': '#fff'
    });

    var discID = selectedDiscID;
    socket.emit('discussion user remove', {
      discID: discID,
      username: username,
      systemName: systemName
    });
  });

  $('body').on('click', '.leaveuser-discussion', function(e) {
    $(this).parent().css({
      'background-color': '#FF3B3B',
      'color': '#fff'
    });

    var discID = selectedDiscID;
    socket.emit('discussion user leave', discID);
  });

  $('body').on('click', '.add-mod', function() {
    var username = $(this).parent().find('.username').text();
    var systemNameElement = $(this).parent().find('.systemName');
    var systemName = systemNameElement.length > 0 ? systemNameElement.text().substr(1) : mySystemName;
    $(this).removeClass('add-mod').addClass('mod').addClass('demote-mod');
    $(this).attr('title', 'Click to demote user').tooltip('fixTitle').tooltip('show');

    var discID = selectedDiscID;
    socket.emit('discussion user mod', {
      discID: discID,
      username: username,
      systemName: systemName
    });
  });

  $('body').on('click', '.demote-mod', function() {
    var username = $(this).parent().find('.username').text();
    var systemNameElement = $(this).parent().find('.systemName');
    var systemName = systemNameElement.length > 0 ? systemNameElement.text().substr(1) : mySystemName;
    $(this).removeClass('mod').removeClass('demote-mod').addClass('add-mod');
    $(this).attr('title', 'Make user Moderator').tooltip('fixTitle').tooltip('show');

    var discID = selectedDiscID;
    socket.emit('discussion user demote', {
      discID: discID,
      username: username,
      systemName: systemName
    });
  });

  // ----
  // Renaming a Discussion
  // ----

  $('body').on('click', '#phase-nav-discussiontitle', function(e) {
    var inputAlreadyExists = $('#phase-nav-discussiontitle_input').length > 0;

    // Not necessary anymore as people can now rename
    // but just for themselves
    /* if (discussionCreator[selectedDiscID] !== myuserID)
      return;*/

    if (!inputAlreadyExists) {
      var currentName = $('#phase-nav-discussiontitle-edit').text();
      $('#phase-nav-discussiontitle-edit').html('<input placeholder="Enter a Discussion Name..." id="phase-nav-discussiontitle_input" type="text" value="' + currentName + '" />');
    }

    $('#phase-nav-discussiontitle_input').focus();

    // Set caret to end
    var val = $('#phase-nav-discussiontitle_input').val();
    $('#phase-nav-discussiontitle_input').val('');
    $('#phase-nav-discussiontitle_input').val(val);

    $('#phase-nav-discussiontitle_input').on('keyup', function(e) {
      if (e.keyCode == 13) {
        var name = $('#phase-nav-discussiontitle_input').val();
        $('#phase-nav-discussiontitle-edit').text(name);
        socket.emit('discussion rename', {
          discID: selectedDiscID,
          name: name
        });

        $('.selected').children('.discussion-title').text(name);

        $('#phase-nav-discussiontitle_input').remove();
      }
    }).on('blur', function(e) {
      $('#phase-nav-discussiontitle-edit').text(currentName);
      $('#phase-nav-discussiontitle_input').remove();
    });
  });

  // Person wants to toggle alerts
  $('#alert-bell').on('click', function() {
    if (setting_discussionAlertEnabled[selectedDiscID]) {
      $(this).removeClass('alert-bell-active').addClass('alert-bell-inactive');
    } else {
      $(this).addClass('alert-bell-active').removeClass('alert-bell-inactive');
    }

    // Toggle
    setting_discussionAlertEnabled[selectedDiscID] = !setting_discussionAlertEnabled[selectedDiscID];
    socket.emit('setting-change_alert-discussion', {
      discID: selectedDiscID,
      enabled: setting_discussionAlertEnabled[selectedDiscID]
    });
  });

  function searchMessagesInitiate() {
    if ($('#input-search').is(":visible") && $('#input-search').val().length > 0) {
      // Submit search
    } else {
      $('#input-search').show();
      $('#input-search').focus();
    }
  }

  // Person wants to search
  $('#message-search').on('click', function() {
    searchMessagesInitiate();
  });

  $('#input-search').on('blur', function() {
    if ($(this).val().length < 1) {
      $(this).hide();
    }
  });

  $('#input-search-form').on('submit', function(e) {
    e.preventDefault();
    waitingOnSearch = true;
    newSearchSubmission = true;
    socket.emit('search discussion messages', {
      discID: searchDiscID,
      terms: $('#input-search').val()
    });
  });

  /* Settings */
  // Opening Avatar Setting
  $('body').on('click', '#settings-avatar', function() {
    $('#phase-avatar-form').show();
  });

  // Uploading Avatar
  $('body').on('submit', '#phase-avatar-form form', function(e) {
    e.preventDefault();

    $('#phase-avatar-form-status').val('Uploading...');
    var avatarFile = $('#userPhoto');
    var data = new FormData();
    $.each(avatarFile[0].files, function(i, file) {
      data.append('userPhoto', file);
    });
    $.ajax({
      url: '/api/avatar',
      type: 'POST',
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      success: function(data) {
        $('#phase-avatar-form').hide();
      }
    });
  });

  $('body').on('click', '#settings-livetyping', function() {
    setting_isLiveTypingDisplaying = !setting_isLiveTypingDisplaying;
    var stateText = setting_isLiveTypingDisplaying ? 'Hide' : 'Show';
    $('#settings-livetyping-state').text(stateText);

    var bottom = true;
    var chat = document.getElementById('content-chat');
    if (setting_isLiveTypingDisplaying) {
      if (chat.scrollTop < (chat.scrollHeight - chat.offsetHeight - 50))
        bottom = false;
    }

    $('#chat-messages-inprogress').toggle();

    if (bottom) {
      chat.scrollTop = chat.scrollHeight;
      updateChatScroll();
    }
  });

  $('body').on('click', '#settings-voicealert', function() {
    setting_isEnabledVoiceAlert = !setting_isEnabledVoiceAlert;
    var stateText = setting_isEnabledVoiceAlert ? 'Disable' : 'Enable';
    $('#settings-voicealert-state').text(stateText);
  });

  /* End Settings */

  // This is to prevent the list from toggling when you are clicking on the
  // actual user list and not the grey title bar thing
  $('body').on('click', '.people-section-list', function(e) {
    e.stopPropagation();
  });

  $('#rename_discussion_panel').children('form').submit(function() {
    var name = $('#rename_discussion_name').val();
    if (name.length < 1 || name.length > 45)
      return false;

    var discID = selectedDiscID;
    if (discussionCreator[discID] == nick) {
      socket.emit('discussion rename', discID, name);
    }

    $('#rename_discussion_panel').hide();
    return false;
  });


  $('#add_discussion_panel').children('form').submit(function() {
    var name = $('#add_discussion_name').val();
    if (name.length < 1 || name.length > 45)
      return false;

    socket.emit('discussion add', name);

    $('#add_discussion_panel').hide();
    return false;
  });

  $('#edit_users_panel').children('form').submit(function() {
    var username = $('#edit_users_name').val();
    if (username == nick) {
      return false;
    }

    var discID = selectedDiscID;
    var action = $('#edit_users_option').find(":selected").text();
    var index;

    if (discussionUsers[discID] && discussionUsers[discID][0] != '<b>Everyone</b>') {
      if (action == "Add") {
        for (index in discussionUsers[discID]) {
          if (discussionUsers[discID][index] == username)
            return false;
        }

        // All checks passed, send request
        socket.emit('discussion user add', {
          'discID': discID,
          'username': username
        });
      } else {
        var match = false;
        for (index in discussionUsers[discID]) {
          if (discussionUsers[discID][index] == username) {
            match = true;
            break;
          }
        }

        if (!match) return false;

        // All checks passed, send request
        socket.emit('discussion user remove', discID, username);
        //index = discussionUsers[discID].indexOf(username);
        //discussionUsers[discID].splice(index, 1);
      }
    } else {
      return false;
    }

    $('#edit_users_panel').hide();
    return false;
  });

  /* Receiving Discussion Changes */

  socket.on('new discussion', function(data) {
    if (!$('#disc' + data.discID).length) {
      var message = strip_tags(data.lastMessage);
      $('#discussion_list').prepend('<div class="discussion" id="disc' + data.discID + '"><p class="subject">' + data.name + '</p><p class="recent_message">' + message + '</p></div>');
    }
  });

  socket.on('remove discussion', function(discID) {
    $('#disc' + discID).remove();
    discussionUsers[discID] = null;
    discussionCreator[discID] = null;
    discussionMessages[discID] = null;
    receivedSaved[discID] = false;
  });

  socket.on('discussion rename', function(data) {
    var discID = data.discID;
    var name = data.name;
    if ($('#disc' + discID).length) {
      $('#disc' + discID).children('.subject').text(name);
    }
  });

  socket.on('discussion user add', function(discID, username) {
    alert(discID + ' ' - username);
    // Check we do not have it already
    for (var index in discussionUsers[discID]) {
      if (discussionUsers[discID][index] == username)
        return;
    }

    discussionUsers[discID].push(username);
    updateDiscussionUsers(discID);
  });

  socket.on('discussion user remove', function(discID, username) {
    var index = discussionUsers[discID].indexOf(username);
    discussionUsers[discID].splice(index, 1);
    updateDiscussionUsers(discID);
  });

  // Server tells us the recent messages or the Discussion
  socket.on('discussion messages', function(data) {
    var discID = data.discID,
      messages = data.messages,
      oldestID = data.oldestID;

    oldestDiscussionMessageID[discID] = data.oldestID;
    messages = JSON.parse(messages);
    if (typeof(discussionMessages[discID]) == 'undefined')
      discussionMessages[discID] = [];

    var messagesCount = messages.length;
    for (var i = 0; i < messagesCount; i++) {
      var messageIP = messages[i].IP;
      var messageTag = messages[i].tag;
      var messageTagColour = messages[i].tagcolour;
      messages[i].content = htmlspecialchars(messages[i].content);

      // Highlighting
      // TODO: send uid to verify it is THE system
      var highlighted = false;
      if (messages[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|@]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (typeof isMod[discID] !== 'undefined' && isMod[discID] === true) {
          useModRegex = true;
        }

        if ((messages[i].username !== nick || messages[i].systemName !== mySystemName) && reg.test(messages[i].content) || (useModRegex && modregex.test(messages[i].content))) {
          highlighted = true;
        }
      }

      // Set proper URL as we are a downloaded App
      messages[i].avatar = messages[i].avatar.replace(/^\//, 'https://t.dark-gaming.com:3001/');

      discussionMessages[discID].push(formatChatMessage(messageTag, messageTagColour, messages[i].userID, messages[i].username, messages[i].content, messages[i].accountName, messages[i].guest, messages[i].timestamp, messages[i].systemName, messages[i].avatar, null, highlighted, messageIP));
    }

    receivedSaved[discID] = true;

    // Now that we have the history, we can display the messages
    if (typeof(discussionMessages[discID]) !== 'undefined' && selectedDiscID === discID) {
      var messagesLength = discussionMessages[discID].length;
      topMessageIndex = 0;
      bottomMessageIndex = messagesLength - 1;
      for (var i = 0; i < messagesLength; i++) {
        $(avatarLoad(discussionMessages[discID][i])).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
          getImageSize($(this), function(width, height) {
            scrollChatByHeight(height);
          });
        });
      }

      earliestMessageIndex = 0;
    }

    // Scroll 'em down
    var chat = document.getElementById('phase-main-chat-messages');
    chat.scrollTop = chat.scrollHeight;
    updateChatScroll();
  });

  // Visible
  function isElementInViewport(el) {
    if (typeof(el) === 'undefined')
      return true;

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
      el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
  }

  // Check whether we need to get more history (or messages) (if scrollbar is near top)
  $('#content-chat').on('scroll', function() {
    var view = {
      top: $(this).scrollTop(),
      bottom: $(this).scrollTop() + $(this).height(),
      height: $(this).prop('scrollHeight') - $(this).outerHeight()
    };

    //var scrollAscending = lastScrollPos - view.top > 0;
    //lastScrollPos = view.top;

    /*if (scrollAscending) {
      for (var i = 0; i <= 3; i++) {
        var lastElement = $('#chat-list li').last();
        var visible = isElementInViewport(lastElement[0]);
        if (!visible) {
          lastElement.remove();
        } else {
          break;
        }
      }
    } else {
      for (var i = 0; i <= 3; i++) {
        var firstElement = $('#chat-list li').first();
        var visible = isElementInViewport(firstElement[0]);
        if (!visible) {
          firstElement.remove();
        } else {
          break;
        }
      }
    }*/

    if (currentMessageViewState === messageViewStates.deepHistory && deepHistoryDiscID > 0 && !waitingOnDeepHistory) {
      if (oldestDeepHistoryID > -1) {
        console.log("ID Good");
        if (view.top <= 700) {
          console.log("TOP met");
          waitingOnDeepHistory = true;
          socket.emit('discussion messages deephistory', {
            discID: deepHistoryDiscID,
            oldestID: oldestDeepHistoryID
          });
        } else if (view.height - view.top <= 700) {
          console.log("Bottom met");
          waitingOnDeepHistory = true;
          socket.emit('discussion messages deephistory:after', {
            discID: deepHistoryDiscID,
            newestID: newestDeepHistoryID
          });
        } else {
          console.log(view.height);
          console.log(view.top);
        }
      }
    } else if (currentMessageViewState === messageViewStates.search && selectedDiscID === -1 && searchDiscID > 0 && !waitingOnSearch) {
      if (earliestSearchID > -1) {
        if (view.top <= 700) {
          waitingOnSearch = true;
          socket.emit('search discussion messages', {
            discID: searchDiscID,
            terms: $('#input-search').val(),
            highestID: earliestSearchID - 1
          });
        }
      }
    } else if (!waitingOnHistory[selectedDiscID] && typeof(discussionMessages[selectedDiscID]) !== 'undefined') {
      if (view.top <= 700) {
        if (earliestMessageIndex === 0) {
          var oldestID = oldestDiscussionMessageID[selectedDiscID];
          if (oldestID > 0) {
            if (typeof(oldestID) === 'number') {
              waitingOnHistory[selectedDiscID] = true;
              socket.emit('discussion messages history', {
                discID: selectedDiscID,
                oldestID: oldestID
              });
            }
          }
        } else {
          var html = "";
          var index = earliestMessageIndex - 1;
          for (var i = earliestMessageIndex - 1; i >= 0 && i >= earliestMessageIndex - 41; i--) {
            html = typeof discussionMessages[selectedDiscID][i] !== 'undefined' ? avatarLoad(discussionMessages[selectedDiscID][i]) + html : html;
            index = i;
          }

          var oldHeight = $('#chat-list').height();
          $('#chat-list').prepend(html);
          earliestMessageIndex = index;

          // Fix scroll height now that we have changed DOM
          var chat = document.getElementById('content-chat');
          chat.scrollTop += $('#chat-list').height() - oldHeight;
        }
      }
    }
  });

  // Server tells us of discussion history
  socket.on('discussion messages history', function(data) {
    var discID = data.discID,
      messages = data.messages,
      oldestID = data.oldestID;

    waitingOnHistory[discID] = false;
    oldestDiscussionMessageID[discID] = data.oldestID;
    messages = JSON.parse(messages);
    if (typeof(discussionMessages[discID]) == 'undefined')
      discussionMessages[discID] = [];

    var selected = selectedDiscID == discID && selectedDiscID;
    var messagesCount = messages.length;
    var oldHeight = $('#chat-list').height();
    for (var i = messagesCount - 1; i >= 0; i--) {
      var messageIP = messages[i].IP;
      var messageTag = messages[i].tag;
      var messageTagColour = messages[i].tagcolour;

      // Message highlighting
      var highlighted = false;
      if (messages[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (isMod[discID]) {
          useModRegex = true;
        }

        if (reg.test(messages[i].content) || (useModRegex && modregex.test(messages[i].content))) {
          highlighted = true;
        }
      }

      var messageFormatted = formatChatMessage(messageTag, messageTagColour, messages[i].userID, messages[i].username, messages[i].content, messages[i].accountName, messages[i].guest, messages[i].timestamp, messages[i].systemName, messages[i].avatar, null, highlighted, messageIP);
      $('#chat-list').prepend(avatarLoad(messageFormatted));
      discussionMessages[discID].unshift(messageFormatted);
    }

    earliestMessageIndex = 0;
    topMessageIndex = 0;
    bottomMessageIndex += messagesCount;

    receivedSaved[discID] = true;

    // We now have to scroll to counter the change in height
    // due to the new information (this keeps the user at
    // the place they were at before adding the history)
    var chat = document.getElementById('content-chat');
    chat.scrollTop += $('#chat-list').height() - oldHeight;
  });

  // When we are loggedin, load discussion messages
  socket.on('loggedin', function() {
    //socket.emit('discussion messages', 1);
  });

  /* Handling Users Online/Offline */
  function refreshList() {
    // master div
    var section = $('#phase-main-people');
    var sectionList = section.children("#people-phase");
    sectionList.html('');

    var formatName;
    var avatar;
    for (var i = 0; i < users.length; i++) {
      avatar = typeof updatedAvatars[users[i].UserID] !== 'undefined' ? updatedAvatars[users[i].UserID] : typeof users[i].Avatar !== 'undefined' ? users[i].Avatar : '/img/default.png';
      avatar = avatar.replace(/^\//, 'https://t.dark-gaming.com:3001/');
      formatName = users[i].systemName !== mySystemName ? htmlspecialchars(users[i].name) + "<i>@" + users[i].systemName + "</i>" : htmlspecialchars(users[i].name);
      //sectionList.append('<li><div class="people_user_avatar"><img class="avatar_' + users[i].UserID + '" src="' + avatar + '"/></div><div class="people_user_right"><span class="people-username">' + formatName + '</span></div><i class="fa fa-circle" data-toggle="tooltip" data-placement="left" title="Online"></i></li>');
      sectionList.append(`<div class="people-entry">
            <div class="people-entry-avatar"><img class="${users[i].UserID}" src="${avatar}" /></div>
            <div class="people-entry-username">${formatName}</div>
            <div class="people-entry-icons">
              <i class="fa fa-circle people-entry-icons-online" data-toggle="tooltip" data-placement="left" title="" data-original-title="Online"></i>
            </div>
          </div>`);
    }

    $('#people-section-phase-count').text(users.length);
  }

  // Server tells us the list of discussions
  socket.on('discussions list', function(discussions) {
    discussions = JSON.parse(discussions);

    $('#phase-main-discussionslist').html('');
    var message = "";
    for (var id in discussions) {
      if (discussions[id].ID) {
        if (discussions[id].Creator !== null)
          discussionCreator[discussions[id].ID] = discussions[id].Creator;
        if (discussions[id].Message !== null)
          message = htmlspecialchars(strip_tags(discussions[id].Message));
        else
          message = "[None]";

        $('#phase-main-discussionslist').append('<div class="discussion" id="disc' + discussions[id].ID + '"><div class="discussion-title">' + strip_tags(discussions[id].Name) + '</div><div class="spinner-container"><div class="spinner"> <div class="bounce1"></div> <div class="bounce2"></div> <div class="bounce3"></div></div><span style="display: none" class="discussion-alert glyphicon glyphicon-exclamation-sign"></span></div><div class="discussion-preview">' + (discussions[id].Username !== null ? htmlspecialchars(discussions[id].Username) + ': ' : discussions[id].GuestName !== null ? htmlspecialchars(discussions[id].GuestName) + ': ' : '') + strip_bbcode(message) + '</div></div>');
        g_discussions[[id].ID] = discussions[id];
      }
    }

    // If this is a reconnect, we can try to select the discussion
    // again if they had one selected before.
    if (selectedDiscID > -1) {
      // Re-save inProgress message or we'll lose it when the discussion
      // is automatically switched.
      inprogressMessages[selectedDiscID] = $('#chat-textarea').val();

      var previouslySelectedDiscussion = $('#disc' + selectedDiscID);
      if (previouslySelectedDiscussion.length)
        switchDiscussion(previouslySelectedDiscussion);
    }

    discussionListReceived = true;
  });

  socket.on('users online', function(list) {
    users = [];
    var json = JSON.parse(list);
    users = json;

    refreshList();
  });

  socket.on('user online', function(user) {
    if (user.name == nick && user.systemName == mySystemName) {
      return;
    }

    var exists = false;
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name === user.name && users[i].systemName === user.systemName) {
        exists = true;
        break;
      }
    }

    if (exists)
      return;


    users.push(user);
    refreshList();
    checkDiscussionUsersChange(user, 'online');
  });

  socket.on('user offline', function(user) {
    var index = -1;
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name === user.name && users[i].systemName === user.systemName) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      users.splice(index, 1);
      refreshList();
      checkDiscussionUsersChange(user, 'offline');
    }
  });

  // Someone changes their nick
  socket.on('user nick', function(oldNick, newNick) {
    var index = users.indexOf(oldNick);
    if (index > -1) {
      users.splice(index, 1);
      users.push(newNick);
    }

    refreshList();
  });

  $('#online-top').click(function() {
    var icon = $('#online-dropdown');
    if (icon.hasClass('fa-rotate-180')) {
      icon.removeClass('fa-rotate-180');
    } else {
      icon.addClass('fa-rotate-180');
    }

    $(this).parent().children('#online-userlist').toggle();
  });

  $('#tools-top').click(function() {
    var icon = $('#tools-dropdown');
    if (icon.hasClass('fa-rotate-180')) {
      icon.removeClass('fa-rotate-180');
    } else {
      icon.addClass('fa-rotate-180');
    }

    $(this).parent().children('ul').toggle();
  });

  $('#tUsers-top').click(function() {
    var icon = $('#tUsers-dropdown');
    if (icon.hasClass('fa-rotate-180')) {
      icon.removeClass('fa-rotate-180');
    } else {
      icon.addClass('fa-rotate-180');
    }

    $(this).parent().children('ul').toggle();
  });

  function sendMessageTest(msg) {
    if (nick === "") {
      $($('<li>').text('You cannot send messages until you have fully connected!')).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }
    var msg = msg.toString();

    var discID = selectedDiscID;
    socket.emit('chat message', {
      msg: msg,
      discID: discID
    });

    // Update the recent message under Discussion Title
    var completeMsg = nick + ": " + msg;
    $('#disc' + discID).children('.discussion-preview').html(strip_bbcode(completeMsg.replace(/<(?:.|\n)*?>/gm, '')));

    // Bump it up to the top
    if (!discussionListMoused && $('#disc' + discID).length)
      $('#disc' + discID).parent().prepend($('#disc' + discID));

    //.scrollHeight - div.scrollTop() == div.height()
    var bottom = true;
    var chat = document.getElementById('phase-main-chat-messages');
    if (chat.scrollTop < (chat.scrollHeight - chat.offsetHeight - 50))
      bottom = false;
    if (msg.lastIndexOf('/', 0) !== 0) {
      //var formattedMessage = '<span class="chat-message-info"><span class="chat-name">' + nick + '</span><span class="chat-timestamp">' + moment().format('LT') + '</span></span>' + htmlspecialchars(msg);
      //formattedMessage = bbcode(replaceURLWithImage(formattedMessage));
      var formattedMessage = formatChatMessage(null, null, myuserID, nick, htmlspecialchars(msg), nick, false, Math.floor(Date.now() / 1000), mySystemName, myAvatar);
      $(formattedMessage).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
      if (discussionMessages[discID])
        discussionMessages[discID].push(formattedMessage);
      else {
        discussionMessages[discID] = [];
        discussionMessages[discID].push(formattedMessage);
      }
    }

    // Auto scroll if they are already at the bottom;
    // If they are not at the bottom already, they might be reading a past
    // message.
    if (bottom)
      chat.scrollTop = chat.scrollHeight;
    updateChatScroll();
  }

  function sendTestSuite() {
    var i = 0;
    setInterval(function() {
      sendMessageTest(i++);
    }, 500);
  }

  // Handle the submission of the form and send the contents as a chat message
  var chatMessageID = 0;
  var messageIndex = [];
  var messageDiscussion = [];

  function sendChatMessage() {
    if (nick === "") {
      $($('<li>').text('You cannot send messages until you have fully connected!')).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }
    var msg = $('#chat-textarea').val();
    if (msg === "")
      return;

    var discID = selectedDiscID;

    if (msg == "/alert") {
      var formattedMessage = formatChatMessage(null, null, -2, "System", "Alerts for this Discussion have been temporarily enabled.", "System", false, Math.floor(Date.now() / 1000), mySystemName, "/img/system.png", -1);
      $(avatarLoad(formattedMessage)).appendTo('#phase-main-chat-messages-list');
      setting_discussionAlertEnabled[discID] = true;
      $('#chat-textarea').val('');
      var chat = document.getElementById('phase-main-chat-messages');
      chat.scrollTop = chat.scrollHeight;
      updateChatScroll();
      return;
    }

    var currentMessageID = chatMessageID++;
    messageDiscussion[currentMessageID] = discID;
    socket.emit('chat message', {
      msg: msg,
      discID: discID,
      ID: currentMessageID
    });

    // Update the recent message under Discussion Title
    var completeMsg = nick + ": " + msg;
    $('#disc' + discID).children('.discussion-preview').html(strip_bbcode(completeMsg.replace(/<(?:.|\n)*?>/gm, '')));

    // Bump it up to the top
    if (!discussionListMoused && $('#disc' + discID).length)
      $('#disc' + discID).parent().prepend($('#disc' + discID));

    //.scrollHeight - div.scrollTop() == div.height()
    var bottom = true;
    var chat = document.getElementById('phase-main-chat-messages');
    if (chat.scrollTop < (chat.scrollHeight - chat.offsetHeight - 50))
      bottom = false;
    if (msg.indexOf('/', 0) !== 0) {
      //var formattedMessage = '<span class="chat-message-info"><span class="chat-name">' + nick + '</span><span class="chat-timestamp">' + moment().format('LT') + '</span></span>' + htmlspecialchars(msg);
      //formattedMessage = bbcode(replaceURLWithImage(formattedMessage));
      var formattedMessage = formatChatMessage(null, null, myuserID, nick, htmlspecialchars(msg), nick, false, Math.floor(Date.now() / 1000), mySystemName, myAvatar, currentMessageID);
      $(avatarLoad(formattedMessage)).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
      if (discussionMessages[discID])
        messageIndex[currentMessageID] = discussionMessages[discID].push(formattedMessage) - 1;
      else {
        discussionMessages[discID] = [];
        messageIndex[currentMessageID] = discussionMessages[discID].push(formattedMessage) - 1;
      }
    }

    // Auto scroll if they are already at the bottom;
    // If they are not at the bottom already, they might be reading a past
    // message.
    if (bottom) {
      chat.scrollTop = chat.scrollHeight;
      updateChatScroll();
    }

    lastMessageInput = "";
    $('#chat-textarea').val('');

    // There are no letters, so now we set this to false
    // as there is no prefix in the message.
    wasCommandPrefix = false;
  }

  $('#chat-send').click(function() {
    sendChatMessage();
  });

  // Failure
  socket.on('chat message denied', function(ID) {
    console.log("Chat message denied " + ID);
    $('#' + ID).remove();
    if (typeof(discussionMessages[messageDiscussion[ID]]) !== 'undefined') {
      if (typeof(discussionMessages[messageDiscussion[ID]][messageIndex[ID]]) !== 'undefined') {
        discussionMessages[messageDiscussion[ID]].splice(messageIndex[ID], 1);
      }
    }
  });

  // Dealing with window focus
  var window_focus = true;
  _require('electron').remote.getCurrentWindow().on('focus', function() {
    window_focus = true;
    document.title = "Phase";
    notificationRead = true;
    $('#disc' + selectedDiscID).find('.discussion-alert').hide();

    if (waitingScroll) {
      var chat = document.getElementById('phase-main-chat-messages');
      chat.scrollTop = chat.scrollHeight;
      updateChatScroll();
    }

    if (lastNotification !== null) {
      lastNotification.close();
      lastNotification = null;
    }
  }).on('blur', function() {
    window_focus = false;
  }).on('close', function() {
    _require('electron').remote.getCurrentWindow().removeAllListeners('focus');
    _require('electron').remote.getCurrentWindow().removeAllListeners('blur')
  });

  // Used to get currently selected text
  function getSelectionText(elem) {
    if (window.getSelection) {
      try {
        var ta = elem.get(0);
        return ta.value.substring(ta.selectionStart, ta.selectionEnd);
      } catch (e) {
        console.log('Cant get selection text');
      }
    }
    // For IE
    if (document.selection && document.selection.type != "Control") {
      return document.selection.createRange().text;
    }
  }

  // Returns queue[]; queue obj = {text, pos, len, t}; t === 1 ? isAddition : isRemoval
  function getEditQueue(oldText, newText) {
    if (typeof oldText === 'undefined')
      oldText = "";

    if (typeof newText === 'undefined')
      newText = "";

    var queue = [];
    var diff;

    // Depending on the change we might need to use a more general
    // difference comparison. This will reduce the CPU time required
    // to complete the operation, but will send more data. A trade off...

    // If the old text was empty, then the difference is absolute
    if (oldText.length === 0) {
      // Get a list of additions/deletions per line
      diff = JsDiff.diffLines(oldText, newText);
    } else if (Math.abs(oldText.length - newText.length) > 8000) {
      // Get a list of additions/deletions per line
      diff = JsDiff.diffLines(oldText, newText);
    } else if (Math.abs(oldText.length - newText.length) > 4000) {
      // Get a list of additions/deletions per word
      diff = JsDiff.diffWords(oldText, newText);
    } else {
      // Get a list of additions/deletions per character
      diff = JsDiff.diffChars(oldText, newText);
    }

    var diffParts = diff.length;
    var part;
    var pos = 0;

    // Loop through every difference
    for (var i = 0; i < diffParts; i++) {
      part = diff[i];

      // If the part is an addition
      if (part.added) {
        // Push the current value, starting position of the change in the original text and the length of the text change,
        // along with the type of change as 1 (addition)
        queue.push({
          text: part.value,
          pos: pos,
          len: part.value.length,
          t: 1
        });
      } else if (part.removed) {
        // Push starting position of the change in the original text and the length of the text change,
        // along with the type of change as 0 (removal)
        queue.push({
          //text: part.value, // This is not necessary to send off to server
          pos: pos,
          len: part.value.length,
          t: 0
        });

        // Offset the starting position of the next change in the original text backwards (cancelling the pos addition below). The removal means that any future insertion will
        // go where the deletion starts.
        pos -= part.value.length;
      }

      // Increment the starting position of the next change in the original text by the length
      // of the current part
      pos += part.value.length;
    }

    // Return the queue array with insertion/deletions
    return queue;
  }

  // Both are used to tell the server what we are typing/deleting
  $('#chat-textarea').keypress(function(event) {
    if (event.keyCode == 13) {
      sendChatMessage();
      event.preventDefault();
    }
  }).on('input', function() {
    var queue;
    if ($(this).val()[0] === '/') {
      if (wasCommandPrefix) {
        // We already are not sending
        return;
      } else {
        // We need to ensure our inprogress-message on other
        // clients is removed
        wasCommandPrefix = true;
        queue = [{
          pos: 0,
          len: lastMessageInput.length,
          t: 0
        }];
      }
    } else {
      if (wasCommandPrefix) {
        wasCommandPrefix = false;

        // set lastMessageInput to what other clients would have seen
        // I.E nothing
        lastMessageInput = "";
      }
      queue = getEditQueue(lastMessageInput, $(this).val());
    }

    lastMessageInput = $(this).val();
    socket.emit('chat edit queue', {
      queue: queue,
      discID: selectedDiscID
    });
  });

  // Sending a chat message
  // If it a user, and we have a div for when they were typing, we will now delete it
  socket.on('chat message', function(data) {
    chatMessage(data);
  });

  socket.on('search results', function(data) {
    handleSearchResults(JSON.parse(data));
  });


  socket.on('search results:names', function(data) {
    handleSearchResults_names(JSON.parse(data));
  });

  socket.on('terraria users online', function(players) {
    if (!tUsersOnlineReceived) {
      tUsersOnlineReceived = true;
      players = JSON.parse(players);

      for (var i = 0; i < players.length; i++) {
        console.log(players[i]);
      }
      var tempList = [];
      if (tUsers.length > 0) {
        tempList = tUsers;
        tUsers = [];
      }

      var index;
      var tUserIndex = 0;
      for (index in players) {
        tUserIndex = tUsers.indexOf(players[index]);
        if (tUserIndex < 0) {
          tUsers.push(players[index].name);
        }
      }

      for (index in tempList) {
        tUserIndex = tUsers.indexOf(tempList[index].name);
        if (tUserIndex < 0) {
          tUsers.push(tempList[index].name);
        }
      }

      updateTUsersList();
    }
  });

  function updateTUsersList() {
    tUsers.sort(function(a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    var ul = $('#people-section-terraria').find('ul');
    ul.html('');
    for (var index in tUsers) {
      ul.append($('<li>').html('<a href="https://t.dark-gaming.com/view?player=' + encodeURIComponent(tUsers[index]) + '" target="_blank">' + tUsers[index] + '</a>'));
    }

    $('#people-section-terraria-count').html(tUsers.length);
  }

  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  // Receiving Sound
  socket.on('sound', function(id) {
    switch (id) {
      case 0:
        if (sound[0] === null)
          sound[0] = new Audio("https://soundbible.com/grab.php?id=1907&type=wav"); // buffers automatically when created
        if (sound[0].paused)
          sound[0].play();
        break;
      case 1:
        if (sound[1] === null)
          sound[1] = new Audio("http://soundbible.com/grab.php?id=850&type=wav"); // buffers automatically when created
        if (sound[1].paused)
          sound[1].play();
        break;
      case 2:
        if (sound[2] === null)
          sound[2] = new Audio("http://soundbible.com/grab.php?id=909&type=wav");
        if (sound[2].paused)
          sound[2].play();
        break;
      case 3:
        if (sound[3] === null)
          sound[3] = new Audio("http://soundbible.com/grab.php?id=2075&type=wav");
        if (sound[3].paused)
          sound[3].play();
        break;
      case 4:
        if (sound[4] === null)
          sound[4] = new Audio("http://soundbible.com/grab.php?id=2046&type=wav");
        if (sound[4].paused)
          sound[4].play();
        break;
    }
  });

  socket.on('video', function(src) {
    $('#video_player').html('<iframe width="200" height="215" src="https://www.youtube.com/embed/' + src + '" frameborder="0" allowfullscreen></iframe>');
  });
  /*
    Colab Editing
    socket.on('chat delete', function(pos, id) {
    var newString = $('#chat-text').val().slice(0, pos-1)+$('#chat-text').val().slice(pos);
    var caretPos = $('#chat-text').caret();
    $('#chat-text').val(newString);

    if (caretPos > newString.length) {
    $('#chat-text').caret(newString.length);
    } else {
    $('#chat-text').caret(caretPos);
    }
    });

    socket.on('chat multidelete', function(pos, len, id) {
    var newString = $('#chat-text').val().slice(0, pos)+$('#chat-text').val().slice(pos+len);
    var caretPos = $('#chat-text').caret();
    $('#chat-text').val(newString);

    if (caretPos > newString.length) {
    $('#chat-text').caret(newString.length);
    } else {
    $('#chat-text').caret(caretPos);
    }
    });

    socket.on('chat character', function(char, id){
    var caretPos = $('#chat-text').caret();
    $('#chat-text').val($('#chat-text').val()+char);
    var length = $('#chat-text').val().length;

    if (caretPos > length) {
    $('#chat-text').caret(length);
    } else {
    $('#chat-text').caret(caretPos);
    }
  }); */



  function getImageSize(img, callback) {
    img = $(img);

    var wait = setInterval(function() {
      var w = img.width(),
        h = img.height();

      if (w && h) {
        done(w, h);
      }
    }, 0);

    var onLoad;
    img.on('load', onLoad = function() {
      done(img.width(), img.height());
    });


    var isDone = false;

    function done() {
      if (isDone) {
        return;
      }
      isDone = true;

      clearInterval(wait);
      img.off('load', onLoad);

      callback.apply(this, arguments);
    }
  }

  /* Formating */
  function formatChatMessage(messageTag, messageTagColour, uid, username, message, accountName, guest, timestamp, systemName, avatar, clientMessageID, notified, messageIP) {
    if (typeof(notified) !== 'boolean')
      notified = false;

    username = htmlspecialchars(username);

    var avatarImage = avatar; //'https://dark-gaming.com/img/default.png';
    var avatarFormat = "";
    if (uid == -2) {
      if (message.indexOf("has left") > -1) {
        avatar = "https://robohash.org/3.png";
      } else if (message.indexOf("has joined") > -1) {
        avatar = "https://robohash.org/1.png";
      } else {
        avatar = "https://robohash.org/system.png";
      }
      avatarFormat = avatar;
    } else {
      updatedAvatars[uid] = avatar;
      avatarFormat = '{avatar:' + uid + '}';
    }

    /*switch (username) {
      case "Rofle":
        avatarImage = 'https://dark-gaming.com/img/popstarfreas9561415139819.gif';
        break;
      case "Knight_Robokill":
        avatarImage = 'https://dark-gaming.com/img/Knight_Robokill2131437961418.jpg';
        break;
      case "Lord Avery":
        avatarImage = 'https://dark-gaming.com/img/-Lord%20Avery-15071439852937.jpg';
        break;
      case "System":
        avatarImage = '/img/System.png';
        break;
      case "A68":
        avatarImage = 'https://dark-gaming.com/img/A68PL10011424267879.jpg';
        break;
    }*/

    // System Suffix is used to identify users of foreign origin (account based in another table)

    // replace image with url not necessary anymore
    message = bbcode(message);

    var systemSuffix = systemName !== mySystemName && systemName !== null ? '<span class="systemSuffix">@' + systemName + '</span>' : '';
    var messageTagHTML = typeof messageTag !== 'undefined' && messageTag !== null ? '<span class="chat-message-suffix" style="color: ' + messageTagColour + '">' + messageTag + '</span>' : '';
    var messageIPHTML = typeof messageIP !== 'undefined' && messageIP !== null ? '<span class="chat-message-ip">' + messageIP + '</span>' : '';
    var messageHTML;
    if ((uid > 0 || uid == -1 || uid == -2) && username !== null) {
      var nameTooltip = typeof(accountName) !== 'undefined' && accountName !== "" ? `title="Account:${accountName}"` : '';
      var nameDisplay = guest ? `<span class="chat-message-guestName">${username}</span>` : username;
      var timestring = getTimeString(timestamp);
      messageHTML = `<div class="chat-message-right">
                        <div class="chat-message-details">
                            <span class="chat-message-username" data-toggle="tooltip" data-placement="right" ${nameTooltip}>${nameDisplay}</span>
                            ${systemSuffix}
                            <span class="chat-message-timestamp">${timestring}</span>
                            ${messageTagHTML}${messageIPHTML}
                        </div>
                        <div class="chat-message-content">${message}</div>
                      </div>`;
    } else {
      messageHTML = message;
    }

    var formattedMessage = messageHTML;

    return '<div' + (typeof(clientMessageID) === 'number' ? ' id="' + clientMessageID + '"' : '') + ' class="chat-message' + (notified ? ' chat-message-notified' : '') + '"><div class="chat-message-left"><div class="chat-message-avatar"><img class="avatar_' + uid + '" src="' + avatarFormat + '"></div></div>' + formattedMessage + '</div>';
  }

  function inProgressMessageFormat(id, nick, systemName, avatar) {
    var avatarImage = typeof avatar === 'undefined' ? 'https://dark-gaming.com/img/default.png' : avatar;
    //return '<li id="user' + id + '" class="inprogress"><div class="chat-message-avatar"><img src="' + avatarImage + '"></div><div class="chat-message-right"><span class="chat-message-info">' + '<span class="chat-name">' + htmlspecialchars(nick) + '</span></span><span class="message"></span></div></li>';

    return `<div id="user${id}" class="chat-message">
              <div class="chat-message-left">
                <div class="chat-message-avatar">
                  <img class="avatar_${id}}" src="${avatarImage}">
                </div>
              </div>
              <div class="chat-message-right">
                <div class="chat-message-details">
                  <span class="chat-message-username" data-toggle="tooltip" data-placement="right">${nick}</span>
                </div>
                <div class="chat-message-content"></div>
            </div>`;
  }

  /* End Formatting */

  var globalChannel = null;
  var myChannel = null; // Wait for UserID before setting this
  var mySystemChannel = null; // wait for system name before setting this
  var myuserID = -1;


  // The server tells us our nick
  // The server tells us our UserID
  socket.on('set information', function(info) {
    var username = info.name;
    var userID = info.userID;
    var systemName = info.systemName;
    var avatar = info.avatar;

    // avatar
    myAvatar = avatar.replace(/^\//, "https://t.dark-gaming.com:3001/");
    $('#chat-input-avatar').html(`<img src="${myAvatar}" />`);

    // systemName
    mySystemName = systemName;

    // username handling
    console.log(username);
    var index = -1;
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name === username && users[i].systemName === mySystemName) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      users.splice(index, 1);
      users.push({
        name: username,
        systemName: mySystemName
      });
    }

    refreshList();

    nick = username;
    users.push({
      name: username,
      systemName: mySystemName
    });
    refreshList();
    checkDiscussionUsersChange(nick, 'online');
    // end username handling

    // userID handling
    console.log('Received UserID of: ' + userID);
    console.log('Received SystemName of: ' + systemName);
    myuserID = userID;
    myChannel = socket.subscribe(userID);
    myChannel.watch(function(data) {
      //console.log('Msg from channel ' + myuserID);
      //console.log(data);
      processData(data);
    });

    mySystemChannel = socket.subscribe("System:" + systemName);
    mySystemChannel.watch(function(data) {
      //console.log('Msg from channel System:' + systemName);
      //console.log(data);
      processData(data);
    });

    globalChannel = socket.subscribe('global');
    globalChannel.watch(function(data) {
      //console.log('Msg from channel global');
      //console.log(data);
      processData(data);
    });
    // end userID handling

    // We have to resend our current live-typing input as
    // when any user is set as offline on clients, all of their
    // in-progress data is deleted. This ensures that an in-progress
    // message cannot exist for longer than necessary
    var queue = getEditQueue("", $('#chat-textarea').val());
    lastMessageInput = $('#chat-textarea').val();
    socket.emit('chat edit queue', {
      queue: queue,
      discID: selectedDiscID
    });
  });

  // We must manually unsubscribe from the channels and re-subscribe
  // after connection regained and we've been told userid as above
  socket.on('disconnect', function() {
    socket.unsubscribe('global');
    if (myuserID > -1)
      socket.unsubscribe(myuserID);

    if (mySystemName !== "")
      socket.unsubscribe("System:" + mySystemName);

    if (globalChannel !== null)
      globalChannel.unwatch();

    if (myChannel !== null)
      myChannel.unwatch();

    if (mySystemChannel !== null)
      mySystemChannel.unwatch();

    // Disable Input
    $("#chat-textarea").prop('disabled', true);
    $("#chat-textarea").prop('placeholder', "DISCONNECTED");

    // Reset vars
    g_discussions = [];
    oldestDiscussionMessageID = [];
    discussionMessages = [];
    discussionUsers = [];
    discussionCreator = [];
    receivedSaved = [];
    discussionListMoused = false;
    discussionListReceived = false;

    threadMessages = [];
    threadReceivedSaved = [];
    threadListReceived = false;

    tUsersOnlineReceived = false;
    inprogressMessages = []; // communicator input for each discussion
  });

  // On page load login
  socket.on('connect', function() {
    $("#chat-textarea").prop('disabled', false);
    $("#chat-textarea").prop('placeholder', "Start typing text...");
    socket.emit('session', phaseSession);
  });

  // If we are told to reconnect, send our cookie again to auth
  socket.on('reconnect', function() {
    socket.emit('session', phaseSession);
  });

  function simReconnect() {
    socket.disconnect();
    console.log("Disconnected.");
    setTimeout(function() {
      socket.connect();
      console.log("Reconnected.");
    }, 1000);
  }

  function processData(data) {
    if (data.socketID && data.socketID == socket.id)
      return;
    switch (data.msgType) {
      // A list of usernames pertaining to an add-discussion-user input field (auto-complete)
      case 'search_results:names':
        handleSearchResults_names(JSON.parse(data));
        break;

        // A list of messages pertaining to a search request
      case 'search results':
        handleSearchResults(JSON.parse(data));
        break;

        // An addition to a discussions list of messages
      case 'chat message':
        chatMessage(data);
        break;

        // A removal of a client-added message
      case 'chat message revoked':
        chatMessageRevoked(data);
        break;

        // A queue of changes to an exising in-progress message
      case 'chat edit queue':
        chatEditQueue(data);
        break;

        // Old character live-typing update
      case 'chat character':
        chatCharacter(data);
        break;

        // Old paste live-typing update
      case 'chat paste':
        chatPaste(data);
        break;

        // Old delete live-typing update
      case 'chat delete':
        chatDelete(data);
        break;

        // Old multidelete live-typing update
      case 'chat multidelete':
        chatMultiDelete(data);
        break;

        // An addition to the Phase Users online list
      case "user online":
        userOnline(data);
        break;

        // A removal from the Phase Users online list
      case "user offline":
        userOffline(data);
        break;

        // A response to a new discussion request
      case "new discussion:response":
        newDiscussionResponse(data);
        break;


        // An addition of a discussions listing on the client
      case "new discussion":
        newDiscussion(data);
        break;

        // A removal of a discussions listing on the client
      case "remove discussion":
        removeDiscussion(data);
        break;

        // An addition of a user to the list of users in
        // a discussion
      case "discussion user add":
        discussionUserAdd(data);
        break;

        // A removal of a user from the list of users
        // in a discussion
      case "discussion user remove":
        discussionUserRemove(data);
        break;

        // An addition of mod status to a user in
        // a discussion
      case "discussion user mod":
        discussionUserMod(data);
        break;

        // A removal of mod status from a user in
        // a discussion
      case "discussion user demote":
        discussionUserDemote(data);
        break;

        // A rename to a discussion
      case "discussion rename":
        renameDiscussion(data);
        break;

        // An addition of an item in the
        // Terraria Users List
      case "terraria join":
        terrariaJoin(data);
        break;

        // A removal of an item in the 
        // Terraria Users list
      case "terraria leave":
        terrariaLeave(data);
        break;

        // A name change to a item in the
        // Terraria Users list
      case "terraria changename":
        terrariaChangename(data);
        break;

        // A user avatar update
      case "user avatar":
        userAvatar(data);
        break;

        // User has been requested to join
        // a call
      case "call join request":
        callJoinRequest(data);
        break;

        // Response to accept/denying call
      case "call join response":
        callJoinResponse(data);
        break;

        // User joined call group
      case "call group user add":
        callGroupUserAdd(data);
        break;

        // User left call group
      case "call group user remove":
        callGroupUserRemove(data);
        break;
    }
  }

  socket.on('call join response', function(data) {
    callJoinResponse(data);
  });

  socket.on('discussion message surrounding history', function(data) {
    handleSurroundingHistoryResults(data);
  });

  socket.on('discussion messages deephistory', function(data) {
    handleDiscussionMessagesDeepHistory(data);
  });

  socket.on('discussion messages deephistory:after', function(data) {
    handleDiscussionMessagesDeepHistoryAfter(data);
  });

  socket.on('discussion alert list', function(data) {
    handleDiscussionAlertList(data);
  });

  function handleDiscussionAlertList(data) {
    var alertList = data.list;

    var alertListLength = alertList.length;
    for (var i = 0; i < alertListLength; i++) {
      setting_discussionAlertEnabled[alertList[i].DiscussionID] = alertList[i].Alert;
    }
  }

  function handleSearchResults_names(data) {
    var names = data.results;
    if (names.length > 0) {
      $('#autocomplete').children('ul').html('');
      var namesLength = names.length;
      for (var i = 0; i < namesLength; i++) {
        $('#autocomplete ul').append('<li class="autocomplete-value">' + names[i].FullName + '</li>');
      }
    } else {
      $('#autocomplete ul').html('');
    }
  }

  function handleSearchResults(data) {
    // data requires JSON.parse unlike others; why?
    // Not sure. It might be the smallestResultID
    // that causes a break in SocketCluster's parsing.
    // Therefore this server-side has been stringified
    // and will need parsing here
    var discID = data.discID;
    var results = data.results;
    var earliestResultID = data.smallestResultID;
    var chat = document.getElementById('phase-main-chat-messages');
    var currentTitle = $('#disc' + searchDiscID).children('.discussion-title').text();
    var oldHeight;
    var isMoreHistory = true;

    // Set our ealiest ID for when we scroll up.
    // Set it to -1 if there is no more results to
    // obtain (last earliest == new earliest)
    if (earliestSearchID === earliestResultID && !newSearchSubmission) {
      earliestSearchID = -1;
      return;
    } else {
      earliestSearchID = earliestResultID;
    }

    // Clear current list
    if (selectedDiscID > -1 || searchDiscID < 1 || newSearchSubmission) {
      $('#chat-list').html('');
      $('#chat-list-inprogress').html('');
      isMoreHistory = false;
      newSearchSubmission = false;
    }

    oldHeight = $('#chat-list').height();

    $('#phase-nav-discussiontitle').html("Search Results in <i>" + htmlspecialchars(currentTitle) + "</i> for <b>" + htmlspecialchars(data.terms) + "</b>");
    $('.selected').removeClass('selected');
    selectedDiscID = -1;

    // Set View State
    currentMessageViewState = messageViewStates.search;

    // Append results to display
    var resultsLength = results.length;
    var formattedMessage;
    for (var i = resultsLength - 1; i >= 0; i--) {
      var messageIP = results[i].IP;
      var messageTag = results[i].tag;
      var messageTagColour = results[i].tagcolour;
      results[i].content = htmlspecialchars(results[i].content);
      // Highlighting
      // TODO: send uid to verify it is THE system
      var highlighted = false;
      if (results[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (isMod[discID]) {
          useModRegex = true;
        }

        if ((results[i].username !== nick || results[i].systemName !== mySystemName) && reg.test(results[i].content) || (useModRegex && modregex.test(results[i].content))) {
          highlighted = true;
        }
      }

      formattedMessage = formatChatMessage(messageTag, messageTagColour, results[i].userID, results[i].username, results[i].content, results[i].accountName, results[i].guest, results[i].timestamp, results[i].systemName, results[i].avatar, null, highlighted, messageIP);
      $(avatarLoad(formattedMessage)).addClass('searchedMessage').attr('id', results[i].messageID).prependTo('#chat-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }

    if (!isMoreHistory) {
      chat.scrollTop = chat.scrollHeight;
    } else {
      chat.scrollTop += $('#chat-list').height() - oldHeight;
    }
    updateChatScroll();

    // No longer waiting for search results
    waitingOnSearch = false;
  }

  $('body').on('click', '.searchedMessage', function() {
    waitingOnDeepHistory = true;
    deepHistoryDiscID = searchDiscID;
    var currentTitle = $('#disc' + searchDiscID).children('.discussion-title').text();

    var messageText = $(this).children('.chat-message-right').first()
      .clone() //clone the element
      .children() //select all the children
      .remove() //remove all the children
      .end() //again go back to selected element
      .text();

    if (messageText.length > 40) {
      messageText = messageText.slice(0, 40) + '...';
    }

    $('#phase-nav-discussiontitle').html("Displaying Deep History in <i>" + htmlspecialchars(currentTitle) + "</i> for <b>" + htmlspecialchars(messageText) + "</b>");
    socket.emit('discussion message surrounding history', { discID: searchDiscID, messageID: parseInt($(this).attr('id')) });
  });

  function handleSurroundingHistoryResults(data) {
    var discID = data.discID;
    var messages = JSON.parse(data.messages);
    var oldestID = parseInt(data.oldestID);
    var newestID = parseInt(data.newestID);
    var stemMessageID = data.stemMessageID;

    oldestDeepHistoryID = oldestID;
    newestDeepHistoryID = newestID;

    // Not waiting
    waitingOnDeepHistory = false;

    // Set View State
    currentMessageViewState = messageViewStates.deepHistory;

    // Clear display
    $('#phase-main-chat-messages-list').html('');
    $('#phase-main-chat-inprogress').html('');

    // Append messages to display
    var messagesLength = messages.length;
    var formattedMessage;
    for (var i = 0; i < messagesLength; i++) {
      var messageIP = messages[i].IP;
      var messageTag = messages[i].tag;
      var messageTagColour = messages[i].tagcolour;
      messages[i].content = htmlspecialchars(messages[i].content);
      // Highlighting
      // TODO: send uid to verify it is THE system
      var highlighted = false;
      if (messages[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (isMod[discID]) {
          useModRegex = true;
        }

        if ((messages[i].username !== nick || messages[i].systemName !== mySystemName) && reg.test(messages[i].content) || (useModRegex && modregex.test(messages[i].content))) {
          highlighted = true;
        }
      }

      formattedMessage = formatChatMessage(messageTag, messageTagColour, messages[i].userID, messages[i].username, messages[i].content, messages[i].accountName, messages[i].guest, messages[i].timestamp, messages[i].systemName, messages[i].avatar, null, highlighted, messageIP);
      $(avatarLoad(formattedMessage)).addClass('deepHistoryMessge').attr('id', messages[i].messageID).prependTo('#chat-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }

    $('#content-chat').scrollTo('#' + stemMessageID);
    document.getElementById('content-chat').scrollTop -= parseInt($('#content-chat').height() / 2);
    $('#' + stemMessageID).css('background', '#FFC9E9');
  }

  function handleDiscussionMessagesDeepHistory(data) {
    var discID = data.discID;
    var messages = JSON.parse(data.messages);
    var oldestID = parseInt(data.oldestID);

    // Update oldestID
    oldestDeepHistoryID = oldestID;

    // Not waiting
    waitingOnDeepHistory = false;

    var oldHeight = $('#chat-list').height();
    var messagesLength = messages.length;
    var formattedMessage;
    for (var i = 0; i < messagesLength; i++) {
      var messageIP = messages[i].IP;
      var messageTag = messages[i].tag;
      var messageTagColour = messages[i].tagcolour;
      messages[i].content = htmlspecialchars(messages[i].content);
      // Highlighting
      // TODO: send uid to verify it is THE system
      var highlighted = false;
      if (messages[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (isMod[discID]) {
          useModRegex = true;
        }

        if ((messages[i].username !== nick || messages[i].systemName !== mySystemName) && reg.test(messages[i].content) || (useModRegex && modregex.test(messages[i].content))) {
          highlighted = true;
        }
      }

      formattedMessage = formatChatMessage(messageTag, messageTagColour, messages[i].userID, messages[i].username, messages[i].content, messages[i].accountName, messages[i].guest, messages[i].timestamp, messages[i].systemName, messages[i].avatar, null, highlighted, messageIP);
      $(avatarLoad(formattedMessage)).addClass('deepHistoryMessge').attr('id', messages[i].messageID).prependTo('#chat-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }

    var chat = document.getElementById('phase-main-chat-messages');
    chat.scrollTop += $('#chat-list').height() - oldHeight;
  }

  function handleDiscussionMessagesDeepHistoryAfter(data) {
    var discID = data.discID;
    var messages = JSON.parse(data.messages);
    var newestID = parseInt(data.newestID);

    // Update oldestID
    newestDeepHistoryID = newestID;

    // Not waiting
    waitingOnDeepHistory = false;

    var messagesLength = messages.length;
    var formattedMessage;
    for (var i = 0; i < messagesLength; i++) {
      var messageIP = messages[i].IP;
      var messageTag = messages[i].tag;
      var messageTagColour = messages[i].tagcolour;
      messages[i].content = htmlspecialchars(messages[i].content);
      // Highlighting
      // TODO: send uid to verify it is THE system
      var highlighted = false;
      if (messages[i].username !== "System") {
        var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
        var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
        var useModRegex = false;

        if (isMod[discID]) {
          useModRegex = true;
        }

        if ((messages[i].username !== nick || messages[i].systemName !== mySystemName) && reg.test(messages[i].content) || (useModRegex && modregex.test(messages[i].content))) {
          highlighted = true;
        }
      }

      formattedMessage = formatChatMessage(messageTag, messageTagColour, messages[i].userID, messages[i].username, messages[i].content, messages[i].accountName, messages[i].guest, messages[i].timestamp, messages[i].systemName, messages[i].avatar, null, highlighted, messageIP);
      $(avatarLoad(formattedMessage)).addClass('deepHistoryMessge').attr('id', messages[i].messageID).appendTo('#chat-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });
    }

    //var chat = document.getElementById('content-chat');
    //chat.scrollTop += $('#chat-list').height() - oldHeight;
  }

  function terrariaChangename(data) {
    var index = tUsers.indexOf(data.oldName);
    if (index > -1) {
      tUsers[index] = data.newName;
      updateTUsersList();
    }
  }

  function terrariaLeave(data) {
    var index = tUsers.indexOf(data.username);
    if (index > -1) {
      tUsers.splice(index, 1);
      updateTUsersList();
    }
  }

  function terrariaJoin(data) {
    // Remove the user first anyway,
    // to avoid duplicates
    terrariaLeave(data);

    if (tUsers.indexOf(data.username) < 0)
      tUsers.push(data.username);
    updateTUsersList();
  }

  function discussionUserRemove(data) {
    var discID = data.discID,
      username = data.username,
      systemName = data.systemName;

    // TODO: Get something better than linear search
    var index = -1;
    var discussionUsersLength = discussionUsers[discID].length;
    for (var i = 0; i < discussionUsersLength; i++) {
      if (discussionUsers[discID][i].name === username && discussionUsers[discID][i].systemName === systemName) {
        index = i;
        break;
      }
    }

    if (index > -1)
      discussionUsers[discID].splice(index, 1);
    updateDiscussionUsers(discID);
  }

  function renameDiscussion(data) {
    var discID = data.discID;
    var name = data.name;

    // If it doesn't have a custom (self-set) name
    if (typeof g_discussions[discID] === 'undefined' || g_discussions[discID] === null || g_discussions[discID].CustomName === null) {
      if ($('#disc' + discID).length) {
        $('#disc' + discID).children('.discussion-title').text(name);
      }

      if (selectedDiscID === discID) {
        $('#phase-nav-discussiontitle').text(name);
      }
    }
  }

  function discussionUserAdd(data) {
    var discID = data.discID,
      userID = data.userID,
      username = data.username,
      systemName = data.systemName,
      avatar = data.avatar;

    // Update/Set avatar for user
    updatedAvatars[userID] = avatar;

    // We don't have a local list. Not necessary to update
    if (typeof discussionUsers[discID] === 'undefined')
      return;

    // Check we do not have it already
    // TODO: Get something better than linear search
    var discussionUsersLength = discussionUsers[discID].length;
    for (var i = 0; i < discussionUsersLength; i++) {
      if (discussionUsers[discID][i].name === username && discussionUsers[discID][i].systemName === systemName)
        return;
    }

    discussionUsers[discID].push({
      userID: userID,
      name: username,
      systemName: systemName,
      avatar: avatar,
      mod: false
    });
    updateDiscussionUsers(discID);
  }

  function discussionUserMod(data) {
    var discID = data.discID,
      username = data.username,
      systemName = data.systemName;

    if (typeof discussionUsers[discID] === 'undefined')
      return;

    var user = getDiscussionUserByName(discID, username, systemName);
    console.log(user);
    if (user !== false) {
      user.mod = true;

      if (username === nick && mySystemName === systemName)
        isMod[discID] = true;
    }

    updateDiscussionUsers(discID);
  }

  function discussionUserDemote(data) {
    var discID = data.discID,
      username = data.username,
      systemName = data.systemName;

    if (typeof discussionUsers[discID] === 'undefined')
      return;

    var user = getDiscussionUserByName(discID, username, systemName);
    if (user !== false) {
      user.mod = false;

      if (username === nick && mySystemName === systemName)
        isMod[discID] = false;
    }

    updateDiscussionUsers(discID);
  }

  function removeDiscussion(data) {
    var discID = data.discID;

    if (selectedDiscID == discID) {
      $('#chat-list').html('');
      $('#chat-list-inprogress').html('');
      $('#chat-textarea').val('');
      discussionUsers[discID] = [];
      updateDiscussionUsers(discID);
      $('#phase-nav-discussiontitle').text('-Removed from Discussion-');
    }

    $('#disc' + discID).remove();
    discussionUsers[discID] = null;
    discussionCreator[discID] = null;
    discussionMessages[discID] = null;
    receivedSaved[discID] = false;
  }

  function newDiscussion(data) {
    if (!$('#disc' + data.discID).length) {
      var message = strip_tags(data.lastMessage);
      var discussionName = strip_tags(data.discussionName);
      var discussionPreviewMessage = strip_bbcode(message);
      var discussionHTML = `
      <div class="discussion" id="disc${data.discID}">
          <div class="discussion-title">${discussionName}</div>
          <div class="discussion-preview">${discussionPreviewMessage}</div></div>`;
      $('#phase-main-discussionslist').prepend(discussionHTML);
    }
  }

  function newDiscussionResponse(data) {
    if (!$('#disc' + data.discID).length) {
      var message = strip_tags(data.lastMessage);
      var discussionName = strip_tags(data.name);
      var discussionPreviewMessage = strip_bbcode(message);
      var discussionHTML = `
      <div class="discussion" id="disc${data.discID}">
          <div class="discussion-title">${discussionName}</div>
          <div class="discussion-preview">${discussionPreviewMessage}</div></div>`;
      $('#phase-main-discussionslist').prepend(discussionHTML);

      if (!$('.selected').length) {
        $($('<li>').html(data.lastMessage)).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
          getImageSize($(this), function(width, height) {
            scrollChatByHeight(height);
          });
        });
        $('#disc' + data.discID).addClass('selected');
      }


      $('#people-section-discussion').children('.people-section-name').children('#adduser-discussion').remove();
      $('#people-section-discussion').children('.people-section-name').append(addUserTemplate);
      discussionUsers[data.discID] = [nick];
      discussionCreator[data.discID] = myuserID;
      discussionMessages[data.discID] = [];
      updateDiscussionUsers(data.discID);
    }
  }

  function userOnline(data) {
    var user = {
      userID: data.userID,
      name: data.name,
      systemName: data.systemName,
      Avatar: data.avatar
    };

    if (user.name == nick && user.systemName == mySystemName) {
      return;
    }

    var exists = false;
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name === user.name && users[i].systemName === user.systemName) {
        exists = true;
        break;
      }
    }

    if (exists)
      return;


    users.push(user);
    refreshList();
    checkDiscussionUsersChange(user, 'online');
  }

  function userOffline(data) {
    var user = {
      ID: data.userID,
      name: data.name,
      systemName: data.systemName
    };

    var index = -1;
    var usersLength = users.length;
    for (var i = 0; i < usersLength; i++) {
      if (users[i].name === user.name && users[i].systemName === user.systemName) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      users.splice(index, 1);
      refreshList();
      checkDiscussionUsersChange(user, 'offline');
    }

    // Set all associated live typing storage to "".
    // If the client re-connects they will resend
    // any message in-progress. This will ensure that
    // no in-progress message lingers.
    var dLTLength = discussionLiveTyping.length;
    for (var i = 0; i < dLTLength; i++) {
      if (typeof discussionLiveTyping[i] !== 'undefined')
        discussionLiveTyping[i][user.ID] = "";
    }

    // Remove any DOM elements associated with this user 
    // (should only be a max of 1, but minimum of 0)
    var inProgressMessage = document.getElementById('user' + user.ID);
    if (inProgressMessage !== null) {
      $(inProgressMessage).remove();
    }
  }

  // Server tells us that someones chat message got revoked,
  // this is because we need to remove the inprogress message
  // just like we would with chatMessage except there's nothing
  // to append to the chat list as their message was denied
  function chatMessageRevoked(data) {
    var userID = data.userID;
    var discID = data.discID;

    if (discID > 0) {

      if (typeof discussionLiveTyping[discID] === 'undefined')
        discussionLiveTyping[discID] = [];

      discussionLiveTyping[discID][userID] = "";
    }

    var inProgressMessage = document.getElementById('user' + userID);
    if (inProgressMessage !== null) {
      $(inProgressMessage).remove();
    }
  }

  function chatMessage(data) {
    var discID = data.discID,
      msgRaw = data.msg,
      msg = htmlspecialchars(data.msg),
      uid = data.userID,
      timestamp = data.timestamp,
      rawUsername = data.username,
      username = data.username,
      openDiscussion = $('.selected'),
      terraria = data.terraria,
      guest = data.guest,
      accountName = data.accountName !== null ? data.accountName : '',
      systemName = data.systemName,
      avatar = data.avatar,
      messageIP = data.IP;

    var messageTag = data.tag;
    var messageTagColour = data.tagcolour;
    var notified = false;

    if (discID > 0) {
      if (typeof discussionLiveTyping[discID] === 'undefined')
        discussionLiveTyping[discID] = [];

      discussionLiveTyping[discID][uid] = "";
    }

    // Notifications
    if (username != "System") {
      var reg = new RegExp('(?:[$-\/:-?{-~!"^_`\[\]|]| |^)(' + nick + ')(?:[$-\/:-?{-~!"^_`\[\]|]|$| )', 'i');
      var modregex = /(?: |^)(hacker|hacks|hacking|server|grief|admin)(?: |[,.!?\\-]|$)/i;
      var useModRegex = false;

      if (isMod[discID]) {
        useModRegex = true;
      }

      var basicPatternMatched = reg.test(msgRaw);
      var moderatorPatternMatched = useModRegex && modregex.test(msgRaw);
      if (basicPatternMatched || moderatorPatternMatched || setting_discussionAlertEnabled[discID]) {
        if (selectedDiscID != discID || !window_focus) {
          if (typeof chatSound === 'undefined' || chatsound === null)
            chatsound = new Audio("https://t.dark-gaming.com:3001/sounds/sonar.wav"); // buffers automatically when created
          if (chatsound.paused)
            chatsound.play();


          // Show alert icon
          $('#disc' + discID).find('.discussion-alert').show();

          // Send browser-notification
          notifyMe(discID, rawUsername, strip_bbcode(msgRaw), $('#disc' + discID).children('.discussion-title').text());
        }

        // Only for highlighting. We don't want this for setting_discussionAlertEnabled as it will literally
        // paint the entire chat in alert colours
        if (basicPatternMatched || moderatorPatternMatched)
          notified = true;
      }
    }

    // Replace begining / 
    if (avatar) {
      avatar = avatar.replace(/^\//, 'https://t.dark-gaming.com:3001/');
    }

    var formattedMessage = formatChatMessage(messageTag, messageTagColour, uid, username, msg, accountName, guest, Math.floor(Date.now() / 1000), systemName, avatar, null, notified, messageIP);

    // Message on current discussion
    if (discID < 0) {
      var bottom = true;
      var chat = document.getElementById('phase-main-chat-messages');
      if (chat.scrollTop < (chat.scrollHeight - chat.offsetHeight - 50))
        bottom = false;
      $(formattedMessage).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
        getImageSize($(this), function(width, height) {
          scrollChatByHeight(height);
        });
      });

      // Auto scroll if they are already at the bottom;
      // If they are not at the bottom already, they might be reading a past
      // message.
      /*if (bottom)
        chat.scrollTop = chat.scrollHeight;*/
      updateChatScroll();
    } else {
      // This is necessary to avoid duplicate messages saved
      if (discussionMessages[discID]) {
        if (openDiscussion.attr('id') == 'disc' + discID) {
          var inProgressMessage = document.getElementById('user' + uid);
          if (inProgressMessage !== null) {
            $(inProgressMessage).remove();
          }

          var bottom = true;
          var chat = document.getElementById('phase-main-chat-messages');
          if (chat.scrollTop < (chat.scrollHeight - chat.offsetHeight - 50))
            bottom = false;
          $(avatarLoad(formattedMessage)).appendTo('#phase-main-chat-messages-list').find('.autoLinkedImage').each(function() {
            getImageSize($(this), function(width, height) {
              scrollChatByHeight(height);
            });
          });

          // Destroy Tooltips to avoid display bug
          $('.tooltip').remove();

          // Auto scroll if they are already at the bottom;
          // If they are not at the bottom already, they might be reading a past
          // message.
          if (bottom) {
            var discussionMessagesLength = discussionMessages[discID].length;
            if (discussionMessagesLength - earliestMessageIndex > 19) {
              for (var i = earliestMessageIndex; i < discussionMessagesLength - 19; i++) {
                //$('#phase-main-chat-messages').children().first().remove();
              }
              earliestMessageIndex = discussionMessagesLength - 19;
            }

            chat.scrollTop = chat.scrollHeight;
            updateChatScroll();
          }
        }

        if (discussionMessages[discID].length > 500) {
          /*  This is now a bad idea considering history loading
            discussionMessages[discID].shift();
           if (selectedDiscID == discID)
             $('#chat-list').children().first().remove(); */
        }
        discussionMessages[discID].push(formattedMessage);

        $('#disc' + discID).children('.discussion-preview').html((username !== null ? (htmlspecialchars(username) + ': ') : '') + strip_bbcode(msg.replace(/<(?:.|\n)*?>/gm, '')));

        // If we haven't received the list, this will create a duplicate, so therefore the if statement avoids such
        if (discussionListReceived && $('#disc' + discID).length) {
          if (!discussionListMoused)
            $('#disc' + discID).parent().prepend($('#disc' + discID));
        }
      } else {
        // While we do not store the message, we must update the recent message text to reflect the new message
        $('#disc' + discID).children('.discussion-preview').html((username !== null ? (htmlspecialchars(username) + ': ') : '') + strip_bbcode(msg.replace(/<(?:.|\n)*?>/gm, '')));

        // If we haven't received the list, this will create a duplicate, so therefore the if statement avoids such
        if (discussionListReceived && $('#disc' + discID).length) {
          if (!discussionListMoused)
            $('#disc' + discID).parent().prepend($('#disc' + discID));
        }
      }
    }

    if (!window_focus) {
      document.title = "* Phase";
      if (notificationRead) {
        //notifyMe(msg);
        notificationRead = false;
      }
    }

    if (!$('#disc' + discID).hasClass('selected') && !$('#disc' + discID).hasClass('unread'))
      $('#disc' + discID).addClass('unread');

    // This allows the bootstrap tooltips to work on the new DOM elements
    $('[data-toggle="tooltip"]').tooltip();
  }

  function showSpinner(discID) {
    $('#disc' + discID).find('.spinner').show();
    editQueueIconTimeouts[discID] = setTimeout(function() {
      $('#disc' + discID).find('.spinner').hide();
    }, 800);
  }

  function hideSpinner(discID) {
    if (typeof editQueueIconTimeouts[discID] !== 'undefined') {
      clearTimeout(editQueueIconTimeouts[discID]);
    }
    $('#disc' + discID).find('.spinner').hide();
  }

  function chatEditQueue(data) {
    var discID = data.discID,
      queue = data.queue,
      id = data.userID,
      nick = data.username,
      systemName = data.systemName;

    if (typeof discussionLiveTyping[discID] === 'undefined') {
      discussionLiveTyping[discID] = [];
    }

    var liveTyping = discussionLiveTyping[discID];
    if (typeof liveTyping[id] === 'undefined')
      liveTyping[id] = "";

    //liveTyping[id] = liveTyping[id].slice(0, pos) + text + liveTyping[id].slice(pos);


    var qLength = queue.length;
    for (var i = 0; i < qLength; i++) {
      item = queue[i];
      if (item.t) {
        liveTyping[id] = liveTyping[id].slice(0, item.pos) + item.text + liveTyping[id].slice(item.pos);
      } else {
        liveTyping[id] = liveTyping[id].slice(0, item.pos) + liveTyping[id].slice(item.pos + item.len);
      }
    }

    if (id == myuserID)
      return;

    hideSpinner(discID);

    if (selectedDiscID == discID && typeof discussionMessages[discID] !== 'undefined') {
      var bottom = true;
      var chat = document.getElementById('phase-main-chat-messages');
      if (chat.scrollTop != (chat.scrollHeight - chat.offsetHeight))
        bottom = false;

      var inProgressMessage = document.getElementById('user' + id);
      if (inProgressMessage === null) {
        var avatar = "https://dark-gaming.com/img/default.png";
        var discussionUsersLength = typeof discussionUsers[discID] !== 'undefined' ? discussionUsers[discID].length : 0;
        for (var i = 0; i < discussionUsersLength; i++) {
          if (discussionUsers[discID][i].userID === id) {
            if (typeof updatedAvatars[id] !== 'undefined') {
              avatar = updatedAvatars[id];
            } else if (typeof discussionUsers[discID][i].avatar !== 'undefined') {
              avatar = discussionUsers[discID][i].avatar;
            }
            break;
          }
        }

        $('#phase-main-chat-inprogress').append(inProgressMessageFormat(id, nick, systemName, avatar));
      }

      inProgressMessage = document.getElementById('user' + id);
      if (liveTyping[id].length === 0) {
        $(inProgressMessage).remove();
      } else {
        var message = $(inProgressMessage).find('.chat-message-content');
        if (liveTyping[id].length <= 500)
          message.html(bbcode(liveTyping[id]));
        else
          message.html(liveTyping[id]);
        message.find('.autoLinkedImage').each(function() {
          getImageSize($(this), function(width, height) {
            scrollChatByHeight(height);
          });
        });
      }

      // Auto scroll if they are already at the bottom;
      // If they are not at the bottom already, they might be reading a past
      // message.
      if (bottom)
        chat.scrollTop = chat.scrollHeight;
      updateChatScroll();
    } else {
      showSpinner(discID);
    }
  }

  function userAvatar(data) {
    var userID = data.userID,
      avatar = data.avatar;

    $('.avatar_' + userID).attr('src', avatar);
    updatedAvatars[userID] = avatar;
    if (userID == myuserID) {
      myAvatar = avatar;
    }
  }

  /* WebRTC calling */
  function callJoinRequest(data) {
    var callID = data.callID;
    var username = data.username;
    var systemName = data.systemName;

    // Set request CallID in-case they accept the call request
    phone.setRequestCallID(callID);

    // Notify the user
    if (!window_focus) {
      callNotify(username);
    }

    displayCallJoinDialogue(username, systemName);

    if (phone.ringtoneID) {
      phone.ringtone.stop(phone.ringtoneID);
    }

    phone.ringtoneID = phone.ringtone.play();
  }

  function callJoinResponse(data) {
    var success = data.success;
    var peers = data.peers;
    var callID = data.callID;
    var peerIDs = [];

    var extension;
    var userID;
    var username;
    var systemName;
    var avatar;
    var peersLength = peers.length;
    log.debug("Received peers count: " + peersLength);
    for (var i = 0; i < peersLength; i++) {
      userID = peers[i].UserID;
      username = peers[i].Username;
      systemName = peers[i].SystemName;
      avatar = peers[i].Avatar;
      extension = systemName !== mySystemName ? "<i>" + htmlspecialchars(systemName) + "</i>" : "";

      if (userID != myuserID) {
        $('#people-section-call ul').append('<li id="calluser-' + userID + '"><div class="people_user_avatar"><img class="avatar_' + userID + '" src="' + avatar + '"></div><div class="people_user_right"><span class="people-username"><span class="username">' + htmlspecialchars(username) + extension + '</span></span></div></li>');

        log.debug("Pushing " + peers[i].PeerID);
        peerIDs.push(peers[i].PeerID);
        $('#people-section-call-count').text(parseInt($('#people-section-call-count').text()) + 1);
      }
    }

    $('#people-section-call ul').append('<li id="calluser-' + myuserID + '"><div class="people_user_avatar"><img class="avatar_' + myuserID + '" src="' + myAvatar + '"></div><div class="people_user_right"><span class="people-username"><span class="username">' + htmlspecialchars(nick) + '</span></span></div></li>');
    $('#people-section-call-count').text(parseInt($('#people-section-call-count').text()) + 1);

    if (success) {
      phone.setCurrentCallID(callID);
      phone.contactPeers(peerIDs);
    }
  }

  function callGroupUserAdd(data) {
    var peerID = data.peerID;
    var userID = data.userID;
    var username = data.username;
    var systemName = data.systemName;
    var avatar = data.avatar;

    phone.addAllowedCaller(peerID);

    var extension = systemName !== mySystemName ? "<i>" + htmlspecialchars(systemName) + "</i>" : "";
    $('#people-section-call ul').append('<li id="calluser-' + userID + '"><div class="people_user_avatar"><img class="avatar_' + userID + '" src="' + avatar + '"></div><div class="people_user_right"><span class="people-username"><span class="username">' + htmlspecialchars(username) + extension + '</span></span></div></li>');
    $('#people-section-call-count').text(parseInt($('#people-section-call-count').text()) + 1);
  }

  function callGroupUserRemove(data) {
    var userID = data.userID;
    $('#calluser-' + userID).remove();
    $('#people-section-call-count').text(parseInt($('#people-section-call-count').text()) - 1);
  }

  function displayCallJoinDialogue(username, systemName) {
    if (systemName !== mySystemName) {
      username += "<i>@" + systemName + "</i>";
    }

    $('#phase-calljoin-username').html(username);
    $('#phase-calljoin-form').show();
  }

  $('body').on('click', '#phase-calljoin-accept', function() {
    // Remove existing list and reset count
    $('#people-section-call-count').text(0);
    $('#people-section-call ul li').remove();

    phone.ringtone.stop(phone.ringtone.ID);
    $('#phase-calljoin-form').hide();
    socket.emit('call group response', {
      peerID: phone.peer.id,
      callID: phone.requestCallID,
      accept: true
    });
  });

  $('body').on('click', '#phase-calljoin-deny', function() {
    phone.ringtone.stop(phone.ringtone.ID);
    $('#phase-calljoin-form').hide();
    socket.emit('call group response', {
      callID: phone.requestCallID,
      accept: false
    });
  });

  document.addEventListener('DOMMouseScroll', moveObject, false);

  function moveObject(event) {
    log.info(event);
  }

  /* End WebRTC calling */
});
