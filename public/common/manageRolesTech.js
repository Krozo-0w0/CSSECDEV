$(document).ready(function() {
    // ===== ASSIGN MODAL =====
    const $modal = $("#assignModal");
    const $selectedUserText = $("#selectedUser");
    const $saveRoleBtn = $("#saveRoleBtn");
    let selectedUserEmail = null;

    // Open modal
    $(".assign-button").on("click", function() {
        const $row = $(this).closest("tr");
        const email = $row.find("td:nth-child(1)").text().trim();
        const username = $row.find("td:nth-child(2)").text().trim();
        selectedUserEmail = email;
        $selectedUserText.text(`Assign role for ${username} (${email})`);
        $modal.css("display", "flex");
    });

    // Close modal
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

    // ===== DELETE USER =====
    $(".delete-button").on("click", function() {
        const email = $(this).closest("tr").find("td:first").text().trim();

        if (confirm(`Are you sure you want to delete ${email}?`)) {
            $.post('/deleteUser', { email: email }, function(data, status) {
                if (status === 'success' && data.status === "success") {
                    alert(`${email} successfully deleted.`);
                    window.location.reload();
                } else {
                    alert(`Failed to delete ${email}.`);
                }
            });
        }
    });
});
