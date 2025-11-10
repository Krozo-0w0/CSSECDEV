$(document).ready(function() {
    // DELETE BUTTON
    $(".delete-button").on("click", function() {
        const email = $(this).closest("tr").find("td:first").text();
        if (confirm(`Are you sure you want to delete ${email}?`)) {
            console.log("Deleting user:", email);
            // call backend here if needed:
            // $.post("/deleteUser", { email });
        }
    });

    // ASSIGN MODAL
    const $modal = $("#assignModal");
    const $selectedUserText = $("#selectedUser");
    const $saveRoleBtn = $("#saveRoleBtn");
    let selectedUserEmail = null;

    $(".assign-button").on("click", function() {
        const $row = $(this).closest("tr");
        const email = $row.find("td:nth-child(1)").text();
        const username = $row.find("td:nth-child(2)").text();
        selectedUserEmail = email;
        $selectedUserText.text(`Assign role for ${username} (${email})`);
        $modal.css("display", "flex");
    });

    $("#closeAssignModal").on("click", function() {
        $modal.hide();
    });

    $(window).on("click", function(e) {
        if (e.target.id === "assignModal") $modal.hide();
    });

    $saveRoleBtn.on("click", function() {
        const newRole = $("#newRole").val();
        console.log(`Assigning ${newRole} to user: ${selectedUserEmail}`);
        $modal.hide();

        // Example backend call
        // $.post("/updateUserRole", { email: selectedUserEmail, role: newRole });
    });
});
