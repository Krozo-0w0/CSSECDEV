$(document).ready(function(){
    $("#newUsernameContainer").toggle()
    $("#newPasswordContainer").toggle()
    $("#changeUsernameButton").click(function(){
        $("#newUsernameContainer").toggle()
    });

    $("#changePasswordButton").click(function(){
        $("#newPasswordContainer").toggle()
    });

    $("#saveNewUsernameButton").click(function(){
        $.post('change_username',
                {username: $("#newUsername").val(), email: $("#userEmail").val()},
                function(data,status){
                    if(status==='success'){
                        let newUsername = data.username;
                        $("#usernameText").text("Username : " + newUsername);
                        $("#newUsernameContainer").toggle()
                    }
                }

        )
    })

    $("#saveNewPasswordButton").click(function(){
        $.post('change_password',
                {password: $("#newPassword").val(), vpassword: $("#newVPassword").val(), email: $("#userEmail").val()},
                function(data,status){
                    if(status==='success'){
                        alert("TEMP ALERT! " + "Password Change Success");
                        $("#newPasswordContainer").toggle()
                    }
                }

        )
    })

});