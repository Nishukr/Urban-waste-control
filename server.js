const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize the app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key_here';

// MongoDB Connection (Local)
const connectDB = async () => {
    try {
        const uri = 'mongodb://localhost:27017/Urban-db'; // Local MongoDB connection string
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
});

const concernSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
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

// Models
const User = mongoose.model('User', userSchema);
const Concern = mongoose.model('Concern', concernSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);

// Multer setup for file uploads (e.g., images for garbage reporting)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
        const error = new Error('Invalid file type');
        return cb(error, false);
    }
    cb(null, true);
};

const upload = multer({
    dest: 'uploads/',
    fileFilter
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

        req.userId = decoded.userId; // Attach the user ID to the request object
        req.userRole = decoded.role; // Attach the user role
        next(); // Move to the next middleware/route
    });
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

        // Generate JWT token after signup
        const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

        // Send the token and role back to the frontend
        res.status(201).json({ success: true, token, role: newUser.role, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error signing up', error });
    }
});

// User Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, token, role: user.role, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging in', error });
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
        const concerns = await Concern.find();
        res.json({ concerns });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving concerns', error });
    }
});

// Route for Municipal Employees to Update Garbage Collection Schedule

app.post('/update-schedule', authenticateToken, async (req, res) => {
    if (req.userRole !== 'municipal') {
        return res.status(403).json({ success: false, message: 'Access Denied: Municipal employees only' });
    }
 // updated area
    const { employeeName, area, scheduleDay, scheduleDate, scheduleTime } = req.body;

    try {
        const newSchedule = new Schedule({
            employeeName,
            area,
            day: scheduleDay,        // Corrected mapping
            date: scheduleDate,      // Corrected mapping
            time: scheduleTime       // Corrected mapping
        });
        await newSchedule.save();
        res.status(201).json({ success: true, message: 'Schedule updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating schedule', error });
    }
});

// Route for Public Users to Report Public Garbage (with Image)
app.post('/report-public-garbage', authenticateToken, upload.single('image'), (req, res) => {
    const { location, locality, mobileNum, additionalDetails } = req.body;
    const filePath = req.file.path; // Store file path

    // Return a public URL for the uploaded image
    const publicUrl = `http://localhost:3000/${filePath}`;

    res.json({ success: true, message: 'Public garbage reported successfully', imageUrl: publicUrl });
});

// Route to Get the Garbage Collection Schedule with search functionality
app.get('/view-schedule', authenticateToken, async (req, res) => {
    try {
        const { area } = req.query; // Get the area from the query parameter if provided
        let query = {};

        // If an area is provided, we search based on it
        if (area) {
            query.area = { $regex: area, $options: 'i' }; // Case-insensitive search for area
        }

        const schedules = await Schedule.find(query); // Fetch filtered schedules based on area
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
        await Concern.findByIdAndDelete(id); // Deleting the concern by ID
        res.json({ success: true, message: 'Concern deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting concern', error });
    }
});




// Start the Server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});



