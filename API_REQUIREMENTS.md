## Real-Time Seat Holding (Socket.IO)

The application uses Socket.IO for real-time temporary seat holding during the 3D seat selection process.

### Client -> Server Events
* joinShow: Client joins a show-specific room. Payload: { showId: string }
* seat:held: Client selects a seat. Payload: { showId: string, seatId: string }
* seat:released: Client deselects a seat. Payload: { showId: string, seatId: string }

### Server -> Client Events
* show:seat-holds: Initial holds state. Payload: { showId: string, seats: string[] }
* seat:held: Broadcast when a seat is held. Payload: { showId: string, seatId: string, socketId: string }
* seat:released: Broadcast when a hold is removed. Payload: { showId: string, seatId: string, socketId: string }
* seat:booked: Broadcast when a booking is confirmed. Payload: { showId: string, seatId: string }
* seat:hold-rejected: Sent to the client if a hold is invalid. Payload: { showId: string, seatId: string, reason: string }

### Rules
* Holds timeout automatically after 5 minutes.
* Disconnecting removes all holds owned by the socket.
* The REST API (POST /api/bookings) remains the absolute authority for final bookings.

## PayHere Sandbox Integration

### Endpoints
* **POST /api/payments/create-session**: Authenticates customer, calculates secure amount, and generates PayHere MD5 hash without exposing `merchant_secret` to the frontend.
* **POST /api/payments/notify**: Server-to-server webhook callback from PayHere. Requires `application/x-www-form-urlencoded` parsing and a **publicly accessible** `PAYHERE_NOTIFY_URL` (localhost testing requires a tunnel like ngrok).

### Payment Flow
1. Frontend calls `/create-session`
2. Backend reserves a `PENDING` booking and generates the payment session config (including secure `md5` hash).
3. Frontend initializes `payhere.startPayment()` Sandbox popup.
4. Customer pays on the sandbox.
5. PayHere sends webhook to `/api/payments/notify`.
6. Backend verifies `md5sig`. If successful, marks booking `CONFIRMED` and broadcasts `seat:booked`. If failed/cancelled, marks booking `FAILED` and broadcasts `seat:released`.
7. Frontend polls `/api/bookings/:id` to verify final booking state from the DB before showing success UI.
