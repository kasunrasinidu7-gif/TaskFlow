/**
 * sockets/socket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.io Real-Time Event Handler
 *
 * HOW SOCKET.IO WORKS (simple explanation):
 *   Regular HTTP is "one-way": the client asks, the server answers.
 *   Socket.io creates a persistent two-way connection so the SERVER can push
 *   data to the CLIENT without the client asking first.
 *
 *   This is how we show notifications instantly without the user refreshing.
 *
 * OUR ARCHITECTURE:
 *   - When a user logs in and opens the app, the frontend connects to Socket.io
 *     and joins a personal "room" named  user_<UserID>
 *     (e.g. user_5 for the user with UserID = 5)
 *   - When a task is assigned or a comment is posted, the controller emits an
 *     event to that specific room
 *   - Only that user receives the notification — no one else
 *
 * EVENTS EMITTED BY THE SERVER:
 *   new_notification   → Sent to a specific user room when they receive a notification
 *   task_updated       → Sent to a project room when a task's status changes (for Kanban)
 *
 * EVENTS LISTENED FROM THE CLIENT:
 *   join_user_room     → Client tells server which user room to join
 *   join_project_room  → Client tells server which project Kanban room to join
 *   leave_project_room → Client tells server to leave a project room
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { verifyToken } = require('../utils/jwt');

/**
 * Initialises all Socket.io event listeners.
 * Called once from server.js when the HTTP server starts.
 *
 * @param {object} io - The Socket.io server instance
 */
function initSocket(io) {

  // ── Authentication middleware for Socket.io ────────────────────────────────
  // Every socket connection must include a valid JWT in the handshake auth object.
  // Frontend sends: socket = io(URL, { auth: { token: 'Bearer eyJ...' } })
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token?.replace('Bearer ', '');
      if (!token) throw new Error('No token');

      const decoded    = verifyToken(token);
      socket.user      = decoded; // Attach user info to the socket
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`🔌  Socket connected: User ${socket.user.UserID} (${socket.user.RoleName})`);

    // Automatically join the user's personal room on connection
    // This room is used to deliver notifications to this specific user
    const userRoom = `user_${socket.user.UserID}`;
    socket.join(userRoom);
    console.log(`   Joined room: ${userRoom}`);

    // ── Client joins a project's Kanban room ─────────────────────────────────
    // When a user opens the Kanban board for a project, the frontend emits this
    socket.on('join_project_room', (projectId) => {
      const room = `project_${projectId}`;
      socket.join(room);
      console.log(`   User ${socket.user.UserID} joined room: ${room}`);
    });

    // ── Client leaves a project's Kanban room ────────────────────────────────
    socket.on('leave_project_room', (projectId) => {
      const room = `project_${projectId}`;
      socket.leave(room);
      console.log(`   User ${socket.user.UserID} left room: ${room}`);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌  Socket disconnected: User ${socket.user.UserID} — ${reason}`);
    });
  });
}

module.exports = initSocket;
