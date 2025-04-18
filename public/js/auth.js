// Handle Signup with Email Verification
document.getElementById('signupForm')?.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form from refreshing the page

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const role = document.getElementById('role').value;

    // Check if passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        // Send POST request to signup API and send email verification link
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();
        if (data.success) {
            // Notify the user to check their email for the verification link
            alert('Signup successful! Please check your email to verify your account.');
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            // Show error if signup failed
            alert('Signup failed: ' + data.message);
        }
    } catch (error) {
        // Show error if there's a problem with the request
        alert('Error: ' + error);
    }
});

// Handle Login (after email verification)
document.getElementById('loginForm')?.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form from refreshing the page

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Send POST request to login API
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {


            // Login successful, store JWT token and role
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role); // Store user role
            localStorage.setItem('verified', 'true'); // Set verified status for logged in users

            // Redirect to the correct dashboard based on role
            if (data.role === 'municipal') {

                window.location.href = 'municipal-dashboard.html'; // Redirect to municipal employee dashboard
            } else {

                window.location.href = 'public-dashboard.html'; // Redirect to public user dashboard
            }
        } else {
            // Show error if login failed
            alert('Login failed: ' + data.message);
        }
    } catch (error) {
        // Show error if there's a problem with the request
        alert('Error: ' + error);
    }
});
// Check if user is logged in and verified
function checkLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must log in to access the dashboard');
        window.location.href = 'login.html'; 
    }

    const verified = localStorage.getItem('verified');
    if (verified !== 'true') {
        alert('You must verify your email to access the dashboard');
        window.location.href = 'login.html'; // Redirect to login page if not verified
    }

    // Optionally, check role on dashboard load
    const role = localStorage.getItem('role');
    if (role !== 'municipal' && role !== 'user') {
        alert('Invalid role. Please log in again.');
        localStorage.clear();
        window.location.href = 'login.html';
    }
}
// Email Verification Handler
async function verifyEmail(token) {
    try {
        const response = await fetch(`/verify-email?token=${token}`, {
            method: 'GET'
        });

        const data = await response.json();
        if (data.success) {
            alert('Email verified successfully! Please log in.');
            localStorage.setItem('verified', 'true'); // Set verified status in localStorage
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            alert('Email verification failed: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// Utility function to handle the verification when the user clicks the email link
function handleEmailVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        verifyEmail(token); // Call the function to verify email
    }
}

// Call this function on the verification page (for example, email-verification.html)
window.onload = handleEmailVerification;

// Logout function
function logout() {
    // Clear user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('verified'); // If you are also storing verified status

    // Redirect to login page
    window.location.href = 'login.html';
}
// Prevent back navigation to cached page after logout
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        // If the page was restored from the cache, force a reload
        window.location.reload();
    }
});


// Attach the logout function to the logout link
document.querySelectorAll('a[href="logout"]').forEach(link => {
    link.addEventListener('click', logout);
});


// Update garbage collection schedule for municipal employees
async function updateSchedule(event) {
    event.preventDefault();
    const employeeName = document.getElementById('employeeName').value;
    const area = document.getElementById('area').value;
    const scheduleDay = document.getElementById('scheduleDay').value;
    const scheduleDate = document.getElementById('scheduleDate').value;
    const scheduleTime = document.getElementById('scheduleTime').value;

    try {
        const response = await fetch('/update-schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token') // Add the token from localStorage
            },
            body: JSON.stringify({ employeeName, area, scheduleDay, scheduleDate, scheduleTime })
        });

        const data = await response.json();
        if (data.success) {
            alert('Schedule updated successfully');
            document.getElementById('updateScheduleForm').reset(); // Clear the form
        } else {
            alert('Error updating schedule: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// Load Public Dashboard
async function loadPublicDashboard() {

    const role = localStorage.getItem('role');
    if (role !== 'user') {
        alert('You do not have access to this dashboard');
        window.location.href = 'login.html';
    }
    await loadUserOwnConcernsPreview();  // Load user's own concerns preview
    await loadSchedulePreview();          // Load schedule preview 
    //  await loadSchedules(); // Load garbage collection schedules
}

// Load schedules for public dashboard with optional area filter
async function loadSchedules(area = '') { // Add area parameter with default empty string
    try {
        // Fetch schedules from server by area, only if area is provided
        const response = await fetch(`/view-schedule?area=${encodeURIComponent(area)}`, {
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is included
            }
        });

        const data = await response.json();
        const scheduleDiv = document.getElementById('schedule');
        scheduleDiv.innerHTML = ''; // Clear previous content

        if (!data.schedules.length) {
            scheduleDiv.innerHTML = `<p>No schedules available.</p>`; // Handle empty schedules
            return;
        }

        // Display all schedules
        data.schedules.forEach(schedule => {
            const scheduleItem = document.createElement('div');
            scheduleItem.classList.add('schedule-section');
            scheduleItem.innerHTML = `
            <div class= "schedule-item">
                <p><strong>Area:</strong> ${schedule.area}</p>
                <p><strong>Day:</strong> ${schedule.day} - <strong>Time:</strong> ${schedule.time}</p>
                <p><strong>Employee Name:</strong> ${schedule.employeeName}</p>
                <p><strong>Date:</strong> ${schedule.date}</p>
            </div>
            `;
            scheduleDiv.appendChild(scheduleItem); // Append the new schedule item
        });
    } catch (error) {
        alert('Error loading schedule: ' + error);
        console.error('Error loading schedules:', error);
    }
}

// Search schedule by area
async function searchSchedule(event) {
    if (event) {
        event.preventDefault(); // Prevent the form from reloading the page
    }
    const area = document.getElementById('searchArea').value.trim(); // No need to lowercase here
    await loadSchedules(area); // Pass the area input to loadSchedules function
    const scheduleDiv = document.getElementById('schedule');

    try {
        // Fetch schedules from server by area with proper encoding
        const response = await fetch(`/view-schedule?area=${encodeURIComponent(area)}`, {
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is included
            }
        });

        const data = await response.json();
        scheduleDiv.innerHTML = ''; // Clear previous schedule data

        if (!data.schedules || data.schedules.length === 0) {
            scheduleDiv.innerHTML = `<p>No schedules available for the specified area.</p>`; // Handle empty results
            return;
        }

        // Display all matching schedules
        data.schedules.forEach(schedule => {
            const scheduleItem = document.createElement('div');
            scheduleItem.classList.add('schedule-section');
            scheduleItem.innerHTML = `
            <div class= "schedule-item">
                <p><strong>Area:</strong> ${schedule.area}</p>
                <p><strong>Day:</strong> ${schedule.day} - <strong>Time:</strong> ${schedule.time}</p>
                <p><strong>Employee Name:</strong> ${schedule.employeeName}</p>
                <p><strong>Date:</strong> ${schedule.date}</p>
            </div>
            `;
            scheduleDiv.appendChild(scheduleItem); // Append the new schedule
        });
    } catch (error) {
        alert('Error searching schedule: ' + error);
        console.error('Error searching schedules:', error);
    }
}






// Submit a concern for public users
async function submitConcern(event) {
    event.preventDefault();
    const concernData = {
        name: document.getElementById('name').value,
        houseNumber: document.getElementById('houseNumber').value,
        locality: document.getElementById('locality').value,
        mobileNum: document.getElementById('mobileNum').value,
        issueType: document.getElementById('issueType').value,
        additionalDetails: document.getElementById('additionalDetails').value,
    };

    try {
        const response = await fetch('/raise-concern', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token') // Add the token from localStorage
            },
            body: JSON.stringify(concernData)
        });

        const data = await response.json();
        if (data.success) {
            alert('Concern raised successfully');
            document.getElementById('raiseConcernForm').reset(); // Clear the form
        } else {
            alert('Error raising concern: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// Report garbage at a public place
// Report garbage at a public place
async function reportGarbage(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('reportName', document.getElementById('reportName').value);
    formData.append('reportMobileNum', document.getElementById('reportMobileNum').value);
    formData.append('reportLocation', document.getElementById('reportLocation').value);
    formData.append('reportLandmark', document.getElementById('reportLandmark').value);
    formData.append('reportAdditionalDetails', document.getElementById('reportAdditionalDetails').value);
    formData.append('garbageImage', document.getElementById('garbageImage').files[0]); // File input

    try {
        const response = await fetch('/report-public-garbage', {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is included for authentication
            },
            body: formData // Send the form data including the image
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage reported successfully');
            document.getElementById('publicGarbageForm').reset(); // Clear the form
        } else {
            alert('Error reporting garbage: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// Function to load public place garbage reports for municipal employees
async function loadGarbageReports() {
    try {
        const response = await fetch('/view-garbage-reports', {
            headers: {
                'Authorization': localStorage.getItem('token') // Add token for authentication
            }
        });

        const data = await response.json();
        const garbageReportsDiv = document.getElementById('publicGarbageReports'); // Updated ID reference
        garbageReportsDiv.innerHTML = ''; // Clear previous content

        if (!data.reports.length) {  // Updated to check reports array
            garbageReportsDiv.innerHTML = `<p>No garbage reports available.</p>`; // Handle empty reports
            return;
        }

        data.reports.forEach(report => {  // Ensure the right property structure
            garbageReportsDiv.innerHTML += `
            <div class="garbage-reports-section">
                <div class="garbage-report-item">
                    <p><strong>Name:</strong> ${report.reportName}</p>
                    <p><strong>Mobile Number:</strong> ${report.reportMobileNum}</p>
                    <p><strong>Location:</strong> ${report.reportLocation}</p>
                    <p><strong>Landmark:</strong> ${report.reportLandmark}</p>
                    <p><strong>Additional Details:</strong> ${report.reportAdditionalDetails}</p>
                    <p><strong>Status:</strong> ${report.status}</p>
                    <a href="${report.imageUrl}" target="_blank">
                        <img src="${report.imageUrl}" alt="Garbage Image" width="200"></a> 
                        ${report.status === 'pending' ? `<button onclick="markGarbageResolved('${report._id}')">Mark Resolved</button>` : ''}
                        ${report.status === 'resolved' ? `<button onclick="deleteGarbage('${report._id}')">Delete</button>` : ''}
                    </div>
                </div>`;

        });
    } catch (error) {
        alert('Error loading garbage reports: ' + error);
        console.error('Error loading garbage reports:', error);
    }
}

// General Public Report garbage at a public place
async function submitPublicGarbageReport(event) {
    event.preventDefault();  // Prevent the default form submission

    const formData = new FormData();
    formData.append('publicReportName', document.getElementById('publicReportName').value);
    formData.append('publicReportMobileNum', document.getElementById('publicReportMobileNum').value);
    formData.append('publicReportLocation', document.getElementById('publicReportLocation').value);
    formData.append('publicReportLandmark', document.getElementById('publicReportLandmark').value);
    formData.append('publicReportAdditionalDetails', document.getElementById('publicReportAdditionalDetails').value);
    formData.append('publicGarbageImage', document.getElementById('publicGarbageImage').files[0]);  // Upload the image

    try {
        const response = await fetch('/report-public-garbage-no-login', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage reported successfully');
            document.getElementById('generalPublicGarbageForm').reset();  // Clear the form after submission
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}


// Function to load general public place garbage reports for municipal employees
async function loadPublicGarbageReports() {
    try {
        const response = await fetch('/view-public-garbage-reports', {
            headers: {
                'Authorization': localStorage.getItem('token') // Add token for authentication
            }
        });

        const data = await response.json();
        console.log('Fetched Public Garbage Reports:', data); // Log the data received
        const publicGarbageReportsDiv = document.getElementById('generalPublicReports');
        publicGarbageReportsDiv.innerHTML = ''; // Clear previous content

        if (!data.PublicReports || data.PublicReports.length === 0) {
            publicGarbageReportsDiv.innerHTML = `<p>No public garbage reports available.</p>`;
            return;
        }

        data.PublicReports.forEach(publicReport => {
            publicGarbageReportsDiv.innerHTML += `
                <div class="public-garbage-reports-section">
                    <div class="public-garbage-report-item">
                        <p><strong>Name:</strong> ${publicReport.publicReportName}</p>
                        <p><strong>Mobile Number:</strong> ${publicReport.publicReportMobileNum}</p>
                        <p><strong>Location:</strong> ${publicReport.publicReportLocation}</p>
                        <p><strong>Landmark:</strong> ${publicReport.publicReportLandmark}</p>
                        <p><strong>Additional Details:</strong> ${publicReport.publicReportAdditionalDetails}</p>
                        <p><strong>Status:</strong> ${publicReport.status}</p>
                        <a href="${publicReport.publicImageUrl}" target="_blank">
                            <img src="${publicReport.publicImageUrl}" alt="Garbage Image" width="200"></a> 
                            ${publicReport.status === 'pending' ? `<button onclick="markPublicGarbageResolved('${publicReport._id}')">Mark Resolved</button>` : ''}
                            ${publicReport.status === 'resolved' ? `<button onclick="deletePublicGarbage('${publicReport._id}')">Delete</button>` : ''}
                    </div>
                </div>`;
        });
    } catch (error) {
        alert('Error loading garbage reports: ' + error);
        console.error('Error loading garbage reports:', error);
    }
}

// Load Municipal Dashboard
async function loadMunicipalDashboard() {

    const role = localStorage.getItem('role');
    if (role !== 'municipal') {
        alert('You do not have access to this dashboard');
        window.location.href = 'login.html';
    }
    await loadUserConcernsPreview(); // Load preview for concerns
    await loadGarbageReportsPreview(); // Load preview for garbage reports
    await loadGeneralPublicReportsPreview(); //Load Public Page Garbage Reports 
    // await loadUserConcerns(); // Load concerns for municipal employees
    // await loadGarbageReports(); // Load public place garbage reports

}

// Load user concerns for municipal employees
// Load user concerns for municipal employees
async function loadUserConcerns() {
    try {
        const response = await fetch('/view-concerns', {
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is included
            }
        });

        const data = await response.json();
        const concernsDiv = document.getElementById('userConcerns');
        concernsDiv.innerHTML = ''; // Clear previous content

        if (!data.concerns.length) {
            concernsDiv.innerHTML = `<p>No concerns available.</p>`; // Handle empty concerns
            return;
        }

        data.concerns.forEach(concern => {
            concernsDiv.innerHTML += `
            <div class= "user-concerns-section">
                <div class="concern-item">
                    <p><strong>Issue Type:</strong> ${concern.issueType || 'N/A'}</p>
                    <p><strong>Locality:</strong> ${concern.locality || 'N/A'}</p>
                    <p><strong>Details:</strong> ${concern.additionalDetails || 'No additional details'}</p>
                    <p><strong>Status:</strong> ${concern.status}</p>
                    ${concern.status === 'pending' ? `<button onclick="markSolved('${concern._id}')">Mark Solved</button>` : ''}
                    ${concern.status === 'resolved' ? `<button onclick="deleteConcern('${concern._id}')">Delete</button>` : ''}
                </div>
            </div>`;
        });
    } catch (error) {
        alert('Error loading concerns: ' + error);
        console.error('Error loading concerns:', error);
    }
}

// Mark a concern as solved
async function markSolved(concernId) {
    try {
        const response = await fetch(`/mark-solved/${concernId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': localStorage.getItem('token') // Add the token from localStorage
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Concern marked as solved');
            loadUserConcerns(); // Refresh the concerns list
        } else {
            alert('Error marking concern: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// Delete a concern
async function deleteConcern(concernId) {
    try {
        const response = await fetch(`/delete-concern/${concernId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token'), // Ensure token is passed
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json(); // Parse the response as JSON
        if (data.success) {
            alert('Concern deleted successfully');
            loadUserConcerns(); // Refresh the concerns list
        } else {
            alert('Error deleting concern: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}


async function loadUserOwnConcerns() {
    try {
        const response = await fetch('/view-user-concerns', {
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is included for authentication
            }
        });

        const data = await response.json();
        const concernsDiv = document.getElementById('userConcerns');
        concernsDiv.innerHTML = ''; // Clear previous content

        if (!data.concerns.length) {
            concernsDiv.innerHTML = `<p>You have not raised any concerns yet.</p>`;
            return;
        }

        data.concerns.forEach(concern => {
            concernsDiv.innerHTML += `
            <div class="own-concern-section">
                <div class="concern-item">
                    <p><strong>Issue Type:</strong> ${concern.issueType || 'N/A'}</p>
                    <p><strong>Locality:</strong> ${concern.locality || 'N/A'}</p>
                    <p><strong>Details:</strong> ${concern.additionalDetails || 'No additional details'}</p>
                    <p><strong>Status:</strong> ${concern.status}</p>
                </div>
            </div>
            `;
        });
    } catch (error) {
        alert('Error loading your concerns: ' + error);
    }
}
// Mark a Public place garbage report as solved
async function markGarbageResolved(reportId) {
    try {
        const response = await fetch(`/mark-solved-garbage/${reportId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is passed
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage report marked as resolved');
            loadGarbageReports(); // Reload the garbage reports after updating the status
        } else {
            alert('Error marking garbage report: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// delete public place garbage report
async function deleteGarbage(reportId) {
    try {
        const response = await fetch(`/delete-garbage/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is passed
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage report deleted successfully');
            loadGarbageReports(); // Refresh the list of garbage reports
        } else {
            alert('Error deleting garbage report: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}


// Mark a General Public place garbage report as solved
async function markPublicGarbageResolved(reportId) {
    try {
        const response = await fetch(`/mark-solved-public-garbage/${reportId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is passed
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage report marked as resolved');
            loadPublicGarbageReports(); // Reload the garbage reports after updating the status
        } else {
            alert('Error marking garbage report: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// delete General  public place garbage report
async function deletePublicGarbage(reportId) {
    try {
        const response = await fetch(`/delete-public-garbage/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token') // Ensure token is passed
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Garbage report deleted successfully');
            loadPublicGarbageReports(); // Refresh the list of garbage reports
        } else {
            alert('Error deleting garbage report: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}


// Fetch full list for concerns
// Fetch and display concerns in the preview box
async function loadUserConcernsPreview() {
    try {
        const response = await fetch('/view-concerns', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        const data = await response.json();
        const concernList = document.getElementById('concern-list'); // The list container
        concernList.innerHTML = ''; // Clear previous content

        if (!data.concerns.length) {
            concernList.innerHTML = '<li>No concerns available.</li>'; // Handle empty list
            return;
        }

        data.concerns.forEach(concern => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${concern.issueType}</strong> - ${concern.locality}`;
            concernList.appendChild(listItem); // Append each concern as a list item
        });
    } catch (error) {
        console.error('Error loading concerns:', error);
        alert('Error loading concern preview');
    }
}

// Repeat similar adjustments for garbage reports and general public reports
async function loadGarbageReportsPreview() {
    try {
        const response = await fetch('/view-garbage-reports', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        const data = await response.json();
        const reportList = document.getElementById('report-list');
        reportList.innerHTML = ''; // Clear previous content

        if (!data.reports.length) {
            reportList.innerHTML = '<li>No reports available.</li>';
            return;
        }

        data.reports.forEach(report => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${report.reportLocation}</strong> - ${report.status}`;
            reportList.appendChild(listItem); // Append each report as a list item
        });
    } catch (error) {
        console.error('Error loading reports:', error);
        alert('Error loading report preview');
    }
}
// Fetch and display general public reports in the preview box
async function loadGeneralPublicReportsPreview() {
    try {
        const response = await fetch('/view-public-garbage-reports', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        const data = await response.json();
        const publicPreviewDiv = document.getElementById('public-report-list');
        publicPreviewDiv.innerHTML = ''; // Clear previous content

        if (!data.PublicReports || data.PublicReports.length === 0) {
            publicGarbageReportsDiv.innerHTML = `<li>No public garbage reports available.</li>`;
            return;
        
        }
        data.PublicReports.forEach(publicReports => {
            const listItem = document.createElement('li');
            publicPreviewDiv.innerHTML += `<strong>${publicReports.publicReportLocation}</strong> - ${publicReports.status}`;
            publicPreviewDiv.appendChild(listItem); // Append each report as a list item

        });
    } catch (error) {
        console.error('Error loading general public publicReports:', error);
        alert('Error loading general public report preview');
    }
}

// Fetch and display user own concerns in the preview box
async function loadUserOwnConcernsPreview() {
    try {
        const response = await fetch('/view-user-concerns', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        const data = await response.json();
        const userConcernsPreview = document.getElementById('user-own-concerns-list'); // The preview container
        userConcernsPreview.innerHTML = ''; // Clear previous content

        if (!data.concerns.length) {
            userConcernsPreview.innerHTML = '<li>No personal concerns available.</li>'; // Handle empty list
            return;
        }

        data.concerns.forEach(concern => {
            const listItem = document.createElement('li');
            userConcernsPreview.innerHTML += `<strong>${concern.issueType}</strong> - ${concern.locality}`;
            userConcernsPreview.appendChild(listItem); // Append each report as a list item
        });
    } catch (error) {
        console.error('Error loading user concerns:', error);
        alert('Error loading user concerns preview');
    }
}

// Fetch and display schedule in the preview box
async function loadSchedulePreview() {
    try {
        const response = await fetch('/view-schedule', {
            headers: { 'Authorization': localStorage.getItem('token') }
        });

        const data = await response.json();
        const schedulePreview = document.getElementById('schedule-list'); // The preview container
        schedulePreview.innerHTML = ''; // Clear previous content

        if (!data.schedules.length) {
            schedulePreview.innerHTML = '<li>No schedules available.</li>'; // Handle empty list
            return;
        }

        data.schedules.forEach(schedule => {
            const listItem = document.createElement('li');
            schedulePreview.innerHTML += `<strong>Area:</strong> ${schedule.area} - <strong>Day:</strong> ${schedule.day} - <strong>Time:</strong> ${schedule.time}`;
            schedulePreview.appendChild(listItem); // Append each report as a list item
        });
    } catch (error) {
        console.error('Error loading schedules:', error);
        alert('Error loading schedule preview');
    }
}

async function submitContactForm(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    try {
        const response = await fetch('/send-contact-mail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, subject, message })
        });

        const result = await response.json();
        if (result.success) {
            alert('Message sent successfully!');
        } else {
            alert('Failed to send message.');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('An error occurred while sending your message.');
    }
}
