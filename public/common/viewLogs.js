$(document).ready(function () {

    const rowsPerPage = 30; // rows per page
    let currentLogs = [];    // store all logs
    let currentPage = 1;     // current page

    // Render the table for a given page
    function renderTable(page = 1) {
        currentPage = page;
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedLogs = currentLogs.slice(start, end);

        let rows = "";
        paginatedLogs.forEach(log => {
            rows += `
                <tr>
                    <td>${log.email}</td>
                    <td>${log.date}</td>
                    <td>${log.role}</td>
                    <td>${log.action}</td>
                    <td>${log.status}</td>
                </tr>
            `;
        });

        $("#log-table tbody").html(rows);
        renderPagination();
    }

    // Render pagination buttons
    function renderPagination() {
    const totalPages = Math.ceil(currentLogs.length / rowsPerPage);
    let paginationHTML = "";

    if (totalPages <= 1) {
        $("#pagination").html(""); // no need for pagination
        return;
    }

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = (i === currentPage) ? "active" : "";
        paginationHTML += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    $("#pagination").html(paginationHTML);

    $(".page-btn").click(function () {
        const page = $(this).data("page");
        renderTable(page);

        // Scroll to top of table smoothly
        $('html, body').animate({
            scrollTop: $("#log-table").offset().top
        }, 300);
    });
}


    // Fetch logs from the backend
    function fetchLogs(filters = {}) {
        $.post("/filterLogs", filters, function (data, status) {
            if (status === "success") {
                currentLogs = data.log || [];
                renderTable(1); // show first page
            }
        });
    }

    // On page load, fetch all logs
    fetchLogs();

    // Filter button click
    $("#filterBtn").click(function (e) {
        e.preventDefault();

        const filters = {
            email: $("input[name='email']").val().trim(),
            action: $("input[name='action']").val().trim(),
            role: $("select[name='role']").val(),
            status: $("select[name='status']").val(),
            fromDate: $("input[name='fromDate']").val(),
            toDate: $("input[name='toDate']").val()
        };

        fetchLogs(filters);
    });

});
