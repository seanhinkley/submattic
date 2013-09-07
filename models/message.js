var fs = require('fs')
  , _ = require('underscore')
  , _s = require('underscore.string')
  , yaml = require('js-yaml')
  , config = require(__dirname + '/../config.yaml')
  , mandrill = require('node-mandrill')(config.mandrill_api_key);

function stripDomain(email) {
	address = email.split('@');

	return address[0];
}

exports.send = function(to, from, subject, text) {
  mandrill('/messages/send', {
    message: {
      to: to,
      from_email: from,
      subject: subject,
      text: text
    }
  });
}

function cleanSubjectLine(subject, group_title) {

  // @Todo Replace with RegEx
  strip_group_title = subject.replace("[" + group_title + "]", "");
  strip_replies = strip_group_title.replace("Re:", "");
  strip_whitespace = _s.clean(strip_replies);

  return "[" + group_title + "] " + strip_whitespace;;
}

exports.parse = function(msg) {

  var group_file = __dirname + '/../groups/' + stripDomain(msg.email) + '.yaml';

  fs.exists(group_file, function (exists) {
    if (exists) {

      var group = require(group_file);

      // Check to make sure the sender is in the group
      var sender_in_group = _(group.members).find(function(el) { return el.email === msg.from_email; });

      // Only send email if send is in the grouop
      if (sender_in_group) {

        // Remove the sender
        var recipients = _(group.members).reject(function(el) { return el.email === msg.from_email; });

        // Remove any email in the to: and in the group
        _(msg.to).each(function(el) {
          recipients = _(recipients).reject(function(el2) { return el[0] === el2.email; });
        });

        mandrill('/messages/send', {
          message: {
            to: recipients,
            from_email: msg.email,
            from_name: msg.from_name,
            subject: cleanSubjectLine(msg.subject, group.title), // A decent place for customization
            text: msg.text,
            html: msg.html
          }
        }, function(error, response) {
          if (error) console.log( 'Send Error: ' + JSON.stringify(error) );
          else console.log('Sent!');
        });
      }
    }
  });

}