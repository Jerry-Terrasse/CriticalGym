function login() {
  var username = $("#username").val();
  var password = $("#password").val();
  if (username == "" || password == "") {
    return;
  }
  $.post("/login", { username: username, password: SparkMD5.hash(password + username) }, function (res) {
    console.log(res);
    if (res.success) {
      location.reload();
    } else {
      $("#mdui-textfield-password").addClass("mdui-textfield-invalid");
      $("#password-error").html(res.message);
    }
  });
}

function rerender() {
  hljs.highlightAll();
  renderMathInElement($("body")[0], {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    ignoredClasses: ["nokatex"],
  });
}

function switch_choice() {
  var choice = $("#switch_choice").val();
  if (choice == "") {
    return;
  }
  var choice = Number(choice);
  $.get("/api/switch_choice", { choice: choice }, function (res) {
    if (res.success) {
      location = "/gym";
    } else {
      mdui.snackbar({
        message: res.message,
        timeout: 2000,
      });
      setTimeout(function () {
        location.reload(true);
      }, 2000);
    }
  });
}

function locked_problem() {
  mdui.snackbar({
    message: "The problem has not been unlocked",
    timeout: 2000,
  });
}