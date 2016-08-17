window.$ = window.jQuery = require("./vendor/jquery-1.3.2.js");
var loadingTimeout = null;
$('form').submit(function(e) {
  $('#login_information').html('<b>Welcome!</b> Please use your In-Game User/Pass');
  loadingTimeout = setTimeout(function() {
    $('.loading').show();
    $('#login_container').addClass('inactive');
  }, 300);
  $.ajax({
    method: "POST",
    url: "https://t.dark-gaming.com:3001/login",
    data: {
      username: $('#username').val(),
      password: $('#password').val(),
      server: $('#servername').find(':selected').text()
    }
  }).success(function(data, textStatus, request) {
    switch (data.state) {
      case "success":
        location.href = "main.html";
        break;
      case "failure":
        $('#login_information').html('<span style="color: Red;">Invalid User/Pass Combination.</span>');
        break;
      case "no-body":
        $('#login_information').html('<span style="color: Red;">This form is invalid. Refresh the page.</span>');
        break;
      case "timeout":
        $('#login_information').html('<span style="color: Red;">The server selected is currently unresponsive.</span>');
        break;
      default:
        $('#login_information').html('<span style="color: Red;">Unknown error.</span>');
        break;
    }

    if (data.state !== 'success') {
      clearTimeout(loadingTimeout);
      $('#login_container').removeClass('inactive');
      $('.loading').hide();

      setTimeout(function() {
        $('#login_information').html('<b>Welcome!</b> Please use your In-Game User/Pass');
      }, 4000);
    }
  });
  return false;
});
