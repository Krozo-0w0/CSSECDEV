$(document).ready(function() {
    // ===== ASSIGN MODAL =====
    const $modal = $("#assignModal");
    const $selectedUserText = $("#selectedUser");
    const $saveRoleBtn = $("#saveRoleBtn");
    let selectedUserEmail = null;

    // Open Assign Role modal
    $(".assign-button").on("click", function() {
        const $row = $(this).closest("tr");
        const email = $row.find("td:nth-child(1)").text().trim();
        const username = $row.find("td:nth-child(2)").text().trim();

        selectedUserEmail = email;
        $selectedUserText.text(`Assign role for ${username} (${email})`);

        $modal.css("display", "flex");
    });

    // Close Assign Modal
    $("#closeAssignModal").on("click", () => $modal.hide());
    $(window).on("click", (e) => {
        if (e.target.id === "assignModal") $modal.hide();
    });

    // Save new role
    $saveRoleBtn.on("click", function() {
        const newRole = $("#newRole").val();
        if (!newRole) return alert("Please select a role.");
        $modal.hide();

        $.post('/assign_role', { email: selectedUserEmail, role: newRole }, function(data, status) {
            if (status === 'success') {
                if (data.status === "success") {
                    alert(`${selectedUserEmail} successfully assigned as ${newRole}`);
                    window.location.reload();
                } else {
                    alert(`No changes were made (role is same).`);
                }
            } else {
                alert("Failed to communicate with the server.");
            }
        });
    });



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
    $("#confirmDeleteBtn").on("click", function() {
        const password = $("#adminPassword").val().trim();

        if (!password) {
            alert("Please enter your password.");
            return;
        }

        $passwordModal.hide();

        $.post('/deleteUser', { 
            email: userToDelete,
            adminPassword: password
        }, function(data, status) {
            if (status === "success" && data.status === "success") {
                alert(`${userToDelete} successfully deleted.`);
                window.location.reload();
            } else if(data.status === "success2"){
                alert(`${userToDelete} successfully deleted.`);
                window.location.href='/';
            }
            else if (data.status === "error2"){
                alert(`Incorrect Password.`);
            }else{
                alert(data.message || `Failed to delete ${userToDelete}.`);
            }
        });
    });
});
