$(document).ready(function(){
	$("#del-prof-confirm").click(function(myYes) {
		var confirmBox = $("#del-prof");
		confirmBox.find("#del-prof-msg").text("Confirm delete profile?");
		confirmBox.find("#save-prof-btn").unbind().click(function() {
			confirmBox.hide();
		});
		confirmBox.find("#del-prof-btn").unbind().click(function() {
			$.ajax({
				type: "POST",
				url:  "deleteProfile",
				success: function() {
					redirectToLoginPage();
				}
			});
		});
		confirmBox.find("#save-prof-btn").click(myYes);
		confirmBox.show();
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