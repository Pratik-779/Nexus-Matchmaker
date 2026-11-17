require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-matchmaker';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/**
 * DSA Concept: Hash Map (Session Storage)
 * Socket.io uses an in-memory hash map to store connected clients
 * Key: socket.id, Value: socket object
 * Provides O(1) lookup time for broadcasting to specific clients
 */

// Socket.io Real-Time Communication
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  /**
   * DSA Concept: Doubly Linked List (Kanban Board)
   * The kanban board is conceptually a doubly linked list:
   * - Each task node can move forward (To-Do → In Progress → Done)
   * - And backward (Done → In Progress → To-Do)
   * - O(1) insertion/deletion when moving tasks between columns
   */
  socket.on('taskMoved', (data) => {
    console.log('📋 Task moved:', data);
    // Broadcast to all clients except sender
    socket.broadcast.emit('taskUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// API Routes
const aiMatchRoutes = require('./routes/ai-match');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');

app.use('/api/ai-match', aiMatchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus Matchmaker API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io enabled for real-time updates`);
});
