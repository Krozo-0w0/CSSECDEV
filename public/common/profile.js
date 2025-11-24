$(document).ready(function(){
// ===== DELETE USER WITH PASSWORD CONFIRMATION =====
    const $passwordModal = $("#passwordConfirmModal");
    const $passwordModalText = $("#passwordModalText");
    let userToDelete = null;

    $(".delete-button").on("click", function() {
        const email = $(this).closest("tr").find("td:first").text().trim();

        userToDelete = email;
        $passwordModalText.text(`Please enter your password to delete ${email}.`);

        $("#adminPassword").val(""); // clear previous input
        $passwordModal.css("display", "flex");
    });

    // Close Password Modal
    $("#closePasswordModal").on("click", () => $passwordModal.hide());

    $(window).on("click", (e) => {
        if (e.target.id === "passwordConfirmModal") $passwordModal.hide();
    });

// Confirm Delete
$("#confirmDeleteBtn").on("click", function () {
    const password = $("#adminPassword").val().trim();

    if (!password) {
        alert("Please enter your password.");
        return;
    }

    $passwordModal.hide();

    $.post("/deleteUser", {
        email: userToDelete,
        adminPassword: password
    })
    .done(function (data) {

        console.log("DeleteUser response:", data); // DEBUG LOG

        if (data.status === "success") {
            alert(`${userToDelete} successfully deleted.`);
			window.location.href='/';
        } 
        else if (data.status === "error2") {
            alert("Incorrect Password.");
        } 
        else {
            alert(data.message || `Failed to delete ${userToDelete}.`);
        }

    })
    .fail(function (xhr, status, error) {
        alert("Server communication failed.");
        console.error("AJAX error:", error);
    });
});



	$("#del-resv-confirm").click(function(myYes) {
		var confirmBox = $("#del-resv");
		confirmBox.find("#del-resv-msg").text("Confirm delete reservation?");
		confirmBox.find("#save-resv-btn").unbind().click(function() {
			confirmBox.hide();
		});
		confirmBox.find("#del-resv-btn").unbind().click(function() {
			confirmBox.hide();
		});
		confirmBox.find("#save-resv-btn").click(myYes);
		confirmBox.show();
	});
});