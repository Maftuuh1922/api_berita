const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Import routes
const articleRoutes = require('./routes/article');
const commentRoutes = require('./routes/comment');
const userRoutes = require('./routes/user');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/yourdbname', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use routes
app.use('/api/article', articleRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/user', userRoutes);

// Home route
app.get('/', (req, res) => {
    res.send('Welcome to the News API');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});