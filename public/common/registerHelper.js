$(document).ready(function(){
    $("#email").on('input', function(){
        $.post(
            'email_checker', 
            {email: $("#email").val()},
            function(data, status){
                if (status === 'success'){
                    if (data.taken === 1) {
                        $("#emailErrorContainer").text("Email already in use.");
                    } else if(data.taken === 0){
                        $("#emailErrorContainer").empty();
                    } else {
                        $("#emailErrorContainer").text("Invalid DLSU email format.");
                    }
                }
            }
        );
    });
    
    // This checks if passwords match.
    $("#vpassword").on('input', function(){
        $.post(
            'password_checker', 
            {password: $("#password").val(), vpassword: $("#vpassword").val()},
            function(data, status){
                if (status === 'success'){
                    if (data.match === 1) {
                        $("#vPasswordErrorContainer").empty();
                    } else {
                        $("#vPasswordErrorContainer").text("Passwords does not match.");
                    }
                }
            }
        );
    });

});

