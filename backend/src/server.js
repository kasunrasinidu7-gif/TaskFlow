/**
 * server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Application Entry Point
 *
 * This file:
 *   1. Imports the configured Express app from app.js
 *   2. Creates a native Node.js HTTP server from the Express app
 *      (Socket.io needs the raw HTTP server, not just the Express app)
 *   3. Attaches Socket.io to the HTTP server
 *   4. Starts listening on the configured port
 *
 * WHY SEPARATE app.js AND server.js?
 *   app.js defines all the routes and middleware.
 *   server.js handles the actual network listening.
 *   This separation makes it easy to write tests that import app.js
 *   without binding a real port.
 *
 * START COMMAND:
 *   npm start       → production
 *   npm run dev     → development with auto-reload (nodemon)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const http       = require('http');
const { Server } = require('socket.io');
const app        = require('./app');
const initSocket = require('./sockets/socket');

// ── 1. Create HTTP server from Express app ────────────────────────────────────
// Socket.io needs the raw Node.js http.Server — not just the Express app.
const server = http.createServer(app);

// ── 2. Attach Socket.io to the HTTP server ────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

// ── 3. Make 'io' accessible inside controllers ────────────────────────────────
// Controllers need to emit Socket.io events (e.g. when a task is assigned).
// We store the io instance on the Express app so any controller can access it via:
//   const io = req.app.get('io');
//   io.to('user_5').emit('new_notification', data);
app.set('io', io);

// ── 4. Initialise Socket.io event listeners ───────────────────────────────────
initSocket(io);

// ── 5. Start listening ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        TaskFlow API Server               ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  HTTP   → http://localhost:${PORT}          ║`);
  console.log(`║  Docs   → http://localhost:${PORT}/api/docs ║`);
  console.log(`║  Health → http://localhost:${PORT}/health   ║`);
  console.log(`║  Mode   → ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});


// ── 6. Deadline Notification Scheduler ────────────────────────────────────────
// Runs once every 24 hours (at startup and then every 24h).
// Finds all tasks due TODAY, and sends a reminder notification to each
// assigned user — but only if one hasn't already been sent today.
// The Task.getDueToday() query prevents duplicate notifications.

const Task                    = require('./models/Task');
const Notification            = require('./models/Notification');
const { verifyConnection }    = require('./utils/emailService');

// Verify email SMTP on startup (logs warning if not configured, does not crash)
verifyConnection();

async function sendDeadlineNotifications() {
  try {
    const dueTasks = await Task.getDueToday();
    if (dueTasks.length === 0) return;

    console.log(`⏰  Deadline scheduler: ${dueTasks.length} reminder(s) to send`);

    for (const row of dueTasks) {
      const notif = await Notification.create({
        userId:  row.UserID,
        taskId:  row.TaskID,
        message: `Reminder: Task "${row.Title}" (${row.ProjectName}) is due today.`,
      });

      // Push real-time if the user is online
      if (io) {
        io.to(`user_${row.UserID}`).emit('new_notification', notif);
      }
    }
  } catch (err) {
    console.error('Deadline scheduler error:', err.message);
  }
}

// Run immediately on startup, then every 24 hours
sendDeadlineNotifications();
setInterval(sendDeadlineNotifications, 24 * 60 * 60 * 1000);

// ── 7. Graceful shutdown ──────────────────────────────────────────────────────
// When Docker or the OS sends a SIGTERM signal (e.g. during deployment),
// close the server gracefully instead of killing it immediately.
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
