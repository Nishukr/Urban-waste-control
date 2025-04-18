const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

// Initialize the app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key_here';

// MongoDB Connection (Local)
const connectDB = async () => {
    try {
        const uri = 'mongodb://localhost:27017/UrbanWaste-db'; // Local MongoDB connection string
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected locally');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit the process with failure
    }
};

// Call the connect function
connectDB();

// Define Schemas
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String, // 'user' or 'municipal'
    verified: { type: Boolean, default: false } // Email verification status
});

const concernSchema = new mongoose.Schema({
    // userId: mongoose.Schema.Types.ObjectId,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    houseNumber: String,
    locality: String,
    mobileNum: String,
    issueType: String,
    additionalDetails: String,
    status: { type: String, default: 'pending' }, // 'pending' or 'resolved'
});

const scheduleSchema = new mongoose.Schema({
    employeeName: String,
    area: String,
    day: String,
    date: String,
    time: String,
});

const garbageSchema = new mongoose.Schema({
    reportName: String,
    reportMobileNum: String,
    reportLocation: String,
    reportLandmark: String,
    reportAdditionalDetails: String,
    imageUrl: String,  // Store the URL of the uploaded image
    status: { type: String, default: 'pending' }, // Add status field
    reportedAt: { type: Date, default: Date.now },
});
// Define the Garbage model
const publicgarbageSchema = new mongoose.Schema({
    publicReportName: String,
    publicReportMobileNum: String,
    publicReportLocation: String,
    publicReportLandmark: String,
    publicReportAdditionalDetails: String,
    publicImageUrl: String,
    status: { type: String, default: 'pending' },
    publicReportedAt: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Concern = mongoose.model('Concern', concernSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const Garbage = mongoose.model('Garbage', garbageSchema);
const PublicGarbage = mongoose.model('PublicGarbage', publicgarbageSchema);

// Multer setup for file uploads (e.g., images for garbage reporting)
// Define storage options for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specify the directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Save file with a unique name
    }
});

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

// Example route for file uploads
app.post('/upload', upload.single('garbageImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded successfully: ${req.file.path}`);
});



// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token or expired' });

        req.userId = decoded.userId; // Attach the user ID to the request object
        req.userRole = decoded.role; // Attach the user role
        next(); // Move to the next middleware/route
    });
};

// Verification Mail Setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'urbanwastecontrol@gmail.com', // Your email
        pass: 'tzgs qidz vgrd lxac' // Your email password or app password
    }
});

// Generate Verification Token
const generateVerificationToken = (email) => {
    return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
};

// User Signup Route
app.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();

        // Generate verification token
        const token = generateVerificationToken(email);

        // Send verification email
        const verificationLink = `http://localhost:3000/email-verification.html?token=${token}`;;
        const mailOptions = {
            from: 'urbanwastecontrol@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center;">
                    <img src="/public/Images/logo3Bg.png" alt="Urban Waste Control Logo" style="max-width: 150px; margin-bottom: 20px;" />
                </div>
                <h2 style="color: #333333;">Welcome to Urban Waste Control!</h2>
                <p style="color: #555555;">Dear ${name},</p>
                <p style="color: #555555;">
                    Thank you for signing up with Urban Waste Control. Before we can complete your registration, we need to verify your email address. 
                    Please click the button below to verify your email:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" 
                        style="background-color: #28a745; color: white; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #555555;">
                    If the button above doesn't work, copy and paste the following link into your browser:
                </p>
                <p style="color: #007bff; word-break: break-all;">${verificationLink}</p>
                <hr style="border-top: 1px solid #e4e4e4; margin: 30px 0;">
                <p style="color: #888888; font-size: 12px; text-align: center;">
                    Urban Waste Control System | © 2024 All rights reserved
                </p>
            </div>
        </div>
    `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email: ', error);
                return res.status(500).json({ success: false, message: 'Error sending verification email' });
            }
            res.status(201).json({ success: true, message: 'Signup successful. Please check your email for verification.' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error signing up', error });
    }
});

// Email Verification Route
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Find the user by email
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.verified) {
            return res.status(400).json({ success: false, message: 'Email is already verified' });
        }

        user.verified = true;
        await user.save();

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        // console.log('User verification status:', user.verified); // Log the verified status

        // Check if the user is verified
        if (!user.verified) {
            return res.status(403).json({ success: false, message: 'Please verify your email before logging in' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, token, role: user.role, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging in', error });
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    // Here, you can implement any server-side logic if needed.
    // Since JWTs are stateless, there's usually nothing to do here.
    res.json({ success: true, message: 'Logged out successfully' });
});

// Middleware to prevent caching of authenticated pages
// app.use((req, res, next) => {
//     res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
//     res.setHeader('Pragma', 'no-cache');
//     res.setHeader('Expires', '0');
//     next();
// });



// Route to handle Contact Us form submissions
app.post('/send-contact-mail', async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        // Set up the transporter
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // Can be another email service
            auth: {
                user: 'urbanwastecontrol@gmail.com',  // Your email address
                pass: 'tzgs qidz vgrd lxac' // Your email password or App password if 2FA is enabled
            }
        });

        // Compose the email
        const mailOptions = {
            from: email,  // The email of the person contacting you
            to: 'urbanwastecontrol@gmail.com',  // Your email to receive messages
            subject: `New Contact Message: ${subject}`,
            text: `You have received a new message from ${name} (${email}):\n\n${message}`
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Respond with success message
        res.json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Error sending email', error });
    }
});

// Route for Public Users to Raise a Concern
app.post('/raise-concern', authenticateToken, async (req, res) => {
    if (req.userRole !== 'user') {
        return res.status(403).json({ success: false, message: 'Access Denied: Public users only' });
    }

    const { name, houseNumber, locality, mobileNum, issueType, additionalDetails } = req.body;

    try {
        const newConcern = new Concern({ 
            userId: req.userId, 
            name, 
            houseNumber, 
            locality, 
            mobileNum, 
            issueType, 
            additionalDetails 
        });
        
        await newConcern.save();
        res.status(201).json({ success: true, message: 'Concern raised successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error raising concern', error });
    }
});

// Route for Municipal Employees to View Concerns
app.get('/view-concerns', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    try {
        const concerns = await Concern.find(); // Fetch concerns
        // console.log('Concerns:', concerns); // Add this line to log concerns in server console
        
        res.json({ success: true, concerns });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving concerns', error });
    }
});

// Route for Public Users to View Their Own Raised Concerns
app.get('/view-user-concerns', authenticateToken, async (req, res) => {
    if (req.userRole !== 'user') {
        return res.status(403).json({ success: false, message: 'Access Denied: Users only' });
    }

    try {
        // Fetch concerns raised by the logged-in user
        const userId = req.userId;// Assuming you store userId in req.user during authentication

        const concerns = await Concern.find({ userId }); // Fetch concerns where the userId matches the logged-in user
        // console.log('User Concerns:', concerns); // Log concerns to console for debugging

        res.json({ success: true, concerns });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving user concerns', error });
    }
});



// Route for Municipal Employees to Update Garbage Collection Schedule
app.post('/update-schedule', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { employeeName, area, scheduleDay, scheduleDate, scheduleTime } = req.body;
    try {
        const newSchedule = new Schedule({ employeeName, area, day: scheduleDay, date: scheduleDate, time: scheduleTime });
        await newSchedule.save();
        res.status(201).json({ success: true, message: 'Schedule updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating schedule', error });
    }
});



// Route to Get the Garbage Collection Schedule with search functionality
app.get('/view-schedule', authenticateToken, async (req, res) => {
    try {
        const { area } = req.query;
        let query = {};

        if (area) {
            query.area = { $regex: area, $options: 'i' }; // Regex search for area
        }

        const schedules = await Schedule.find(query); // Fetch schedules
        // console.log('Schedules:', schedules); // Add this line to log the schedules in server console
        
        res.json({ success: true, schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving schedule', error });
    }
});

// Route to Mark a Concern as Solved
app.patch('/mark-solved/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await Concern.findByIdAndUpdate(id, { status: 'resolved' });
        res.json({ success: true, message: 'Concern marked as solved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error marking concern as solved', error });
    }
});

// Route to Delete a Concern
app.delete('/delete-concern/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await Concern.findByIdAndDelete(id);
        res.json({ success: true, message: 'Concern deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting concern', error });
    }
});

// Route for Users to Report Public Garbage (with garbageImage)
app.post('/report-public-garbage', authenticateToken, upload.single('garbageImage'), async (req, res) => {
    const { reportName, reportMobileNum, reportLocation, reportLandmark, reportAdditionalDetails } = req.body;
    const filePath = req.file.path;
     // Check if req.file is defined
     if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }


    const publicUrl = `http://localhost:3000/${filePath}`; // Assuming the server serves garbageImages from 'public'
    

    try {
        const newGarbageReport = new Garbage({
            reportName,
            reportMobileNum,
            reportLocation,
            reportLandmark,
            reportAdditionalDetails,
            imageUrl: publicUrl,
        });

        await newGarbageReport.save(); // Save the report to MongoDB

        res.json({ success: true, message: 'Garbage reported successfully', report: newGarbageReport });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reporting garbage', error });
    }
});

// Route for Municipal Employees to View Garbage Reports
app.get('/view-garbage-reports', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    try {
        const reports = await Garbage.find();  // Fetch all garbage reports from MongoDB
        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving reports', error });
    }
});

// Route to Mark a Garbage Report as Solved
app.patch('/mark-solved-garbage/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await Garbage.findByIdAndUpdate(id, { status: 'resolved' }); // Use Garbage model here
        res.json({ success: true, message: 'Garbage report marked as resolved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error marking garbage report as resolved', error });
    }
});
// Route to Delete a Garbage Report
app.delete('/delete-garbage/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await Garbage.findByIdAndDelete(id); // Use Garbage model here
        res.json({ success: true, message: 'Garbage report deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting garbage report', error });
    }
});


// Route for Public Garbage Reporting without Login
app.post('/report-public-garbage-no-login', upload.single('publicGarbageImage'), async (req, res) => {
    const { publicReportName, publicReportMobileNum, publicReportLocation, publicReportLandmark, publicReportAdditionalDetails } = req.body;
    const imagePath = req.file ? req.file.path : null; // Check if the file exists
    
    // Ensure the image file is uploaded
    if (!imagePath) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Generate the full URL for the uploaded image
    const imageUrl = `http://localhost:3000/${imagePath}`; // URL to access the uploaded image

    try {
        // Create a new public garbage report using the schema
        const newPublicGarbage = new PublicGarbage({
            publicReportName,
            publicReportMobileNum,
            publicReportLocation,
            publicReportLandmark,
            publicReportAdditionalDetails,
            publicImageUrl: imageUrl,  // Store the generated image URL
        });

        // Save the new report to the database
        await newPublicGarbage.save();

        // Respond with success message
        res.status(201).json({ success: true, message: 'Garbage reported successfully', report: newPublicGarbage });
    } catch (error) {
        // Handle any errors during the process
        console.error('Error reporting public garbage:', error);
        res.status(500).json({ success: false, message: 'Error reporting garbage', error });
    }
});

// Route for Municipal Employees to View General Public  Garbage Reports
app.get('/view-public-garbage-reports', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }
    try {
        // Fetch all public garbage reports from the database
        const publicReports = await PublicGarbage.find(); // Assuming PublicGarbage is the model for public reports

        // Log the reports to check if they are being fetched correctly
        // console.log('Public Garbage Reports:', publicReports);

        // Return the list of reports
        res.status(200).json({ success: true, PublicReports: publicReports });
    } catch (error) {
        // Handle any errors during the process
        console.error('Error fetching public garbage reports:', error);
        res.status(500).json({ success: false, message: 'Error retrieving public garbage reports', error });
    }
});


// Route to Mark a Garbage Report as Solved
app.patch('/mark-solved-public-garbage/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await PublicGarbage.findByIdAndUpdate(id, { status: 'resolved' }); // Use Garbage model here
        res.json({ success: true, message: 'Garbage report marked as resolved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error marking garbage report as resolved', error });
    }
});
// Route to Delete a Garbage Report
app.delete('/delete-public-garbage/:id', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }

    const { id } = req.params;

    try {
        await PublicGarbage.findByIdAndDelete(id); // Use Garbage model here
        res.json({ success: true, message: 'Garbage report deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting garbage report', error });
    }
});




// Route to Get the Garbage Collection Schedule for public access
app.get('/public-schedule', async (req, res) => {
    try {
        const { area } = req.query;
        let query = {};

        if (area) {
            query.area = { $regex: area, $options: 'i' }; // Regex search for area
        }

        const schedules = await Schedule.find(query); // Fetch schedules
        res.json({ success: true, schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving schedule', error });
    }
});




// Start the Server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});


