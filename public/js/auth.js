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
        window.location.href = 'login.html'; // Redirect to login page if not logged in
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
        const response = await fetch(`/verify-email?token=${token}`, { // Fix: Added token in query param
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

// Load Public Dashboard
async function loadPublicDashboard() {
    const role = localStorage.getItem('role');
    if (role !== 'user') {
        alert('You do not have access to this dashboard');
        window.location.href = 'login.html';
    }
    await loadSchedules(); // Load garbage collection schedules
}

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

// Load schedules for public dashboard
async function loadSchedules() {
    try {
        const response = await fetch('/view-schedule', {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });

        const data = await response.json();
        const scheduleDiv = document.getElementById('schedule');
        scheduleDiv.innerHTML = ''; // Clear previous content

        if (!data.schedules.length) {
            scheduleDiv.innerHTML = `<p>No schedules available.</p>`;
            return;
        }

        // Display all schedules
        data.schedules.forEach(schedule => {
            scheduleDiv.innerHTML += `
                <div class="schedule-item">
                <p><strong>Area: ${schedule.area}</strong></p>
                    <p><strong>${schedule.day} - ${schedule.time}</strong></p>
                    <p>Employee Name: ${schedule.employeeName}</p>
                    <p>${schedule.date}</p>
                </div>`;
        });
    } catch (error) {
        alert('Error loading schedule: ' + error);
    }
}

// Search schedules by area
async function searchSchedule() {
    const area = document.getElementById('searchArea').value.toLowerCase();
    const allSchedules = document.querySelectorAll('.schedule-item');

    // Filter and display schedules based on the search input
    allSchedules.forEach(scheduleItem => {
        const areaText = scheduleItem.querySelector('p:first-child').textContent.toLowerCase();
        if (!areaText.includes(area)) {
            scheduleItem.style.display = 'none'; // Hide non-matching schedules
        } else {
            scheduleItem.style.display = 'block'; // Show matching schedules
        }
    });
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
async function reportGarbage(event) {
    event.preventDefault();
    const garbageData = {
        location: document.getElementById('location').value,
        locality: document.getElementById('locationLocality').value,
        mobileNum: document.getElementById('publicMobileNum').value,
        additionalDetails: document.getElementById('publicAdditionalDetails').value,
        image: document.getElementById('garbageImage').files[0]
    };

    const formData = new FormData();
    Object.keys(garbageData).forEach(key => formData.append(key, garbageData[key]));

    try {
        const response = await fetch('/report-public-garbage', {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('token') // Add the token from localStorage
            },
            body: formData // Send formData (including image)
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

// Load Municipal Dashboard
async function loadMunicipalDashboard() {
    const role = localStorage.getItem('role');
    if (role !== 'municipal') {
        alert('You do not have access to this dashboard');
        window.location.href = 'login.html';
    }
    await loadUserConcerns(); // Load concerns for municipal employees
}

// Load user concerns for municipal employees
async function loadUserConcerns() {
    try {
        const response = await fetch('/view-concerns', {
            headers: {
                'Authorization': localStorage.getItem('token') // Add the token from localStorage
            }
        });
        const data = await response.json();
        const concernsDiv = document.getElementById('userConcerns');
        concernsDiv.innerHTML = ''; // Clear previous content
        
        data.concerns.forEach(concern => {
            // Create concern HTML
            let concernHTML = `<p>
                <strong>Issue Type:</strong> ${concern.issueType || 'N/A'}<br>
                <strong>Locality:</strong> ${concern.locality || 'N/A'}<br>
                <strong>Details:</strong> ${concern.additionalDetails || 'No additional details'}<br>
                <strong>Status:</strong> ${concern.status} `;

            // Add "Mark Solved" button if not yet resolved
            if (concern.status === 'pending') {
                concernHTML += `<button onclick="markSolved('${concern._id}')">Mark Solved</button>`;
            }

            // Add "Delete" button if the concern is resolved
            if (concern.status === 'resolved') {
                concernHTML += `<button onclick="deleteConcern('${concern._id}')">Delete</button>`;
            }

            concernHTML += `</p>`;
            concernsDiv.innerHTML += concernHTML;
        });
    } catch (error) {
        alert('Error loading concerns: ' + error);
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
