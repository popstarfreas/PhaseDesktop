define(['jquery', 'Item'], function($, Item) {
  var Utils = {
    strip_bbcode: function(text) {
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
    },

    getItemNameFromID: function(id) {
      if (id > 0) {
        return Item.IDs[id];
      } else if (id < 0) {
        return Item.NIDs[id];
      } else {
        // Return at least something...
        return "Beenade";
      }
    },

    getItemImageNameFromID: function(id) {
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
    },

    // avatarLoad is used to load avatars when a discussion switched to. This is
    // important as it means that any updated avatars from messages already saved
    // will get automatically updated.
    avatarLoad: function(updatedAvatars, text) {
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
    },

    bbcode: function(text) {
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
          return '<img class="autoLinkedImage terrariaItem" data-toggle="tooltip" data-placement="right" title="Terraria Item: ' + Utils.getItemNameFromID(capture - 1) + '" src="https://t.dark-gaming.com/view/items_images/' + Utils.getItemImageNameFromID(capture - 1) + '.png" />';
        }
      ];

      for (var index in search) {
        text = text.replace(search[index], replace[index]);
      }

      // This only allows "<br />" (new lines) if the new line is not inside a <ul> and/or <li>
      text = text.replace("/(?!(\<ul\>|\<li\>|\<\/li\>).*?)\\n(?!((?!<).)*?(\<\/ul\>|\<\/li\>|\<li\>))/is", ' <br />');
      return text;
    }
  };

  return Utils;
});
