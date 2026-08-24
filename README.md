# CineVerse - Complete Technical Handbook

Welcome to the **CineVerse** project documentation. This is a comprehensive technical handbook designed to explain the system's architecture, dependencies, and implementation details so any developer can understand and modify the codebase.

## 1. Project Overview

**Project Name:** CineVerse

**What the system does:** CineVerse is a full-stack, real-time cinema booking system. It allows customers to browse movies, select shows, and interactively book seats using a 3D visualization. Administrators can manage the cinema's catalog, monitor revenue, and issue physical tickets via a dedicated point-of-sale interface. 

**Main Features:**
- **Customer Functionality:** Browse movies, select shows, and view booked tickets.
- **Admin Functionality:** Dashboard with real-time revenue, movie/show management, and booking oversight.
- **Ticket Counter:** A dual-pane POS system for admins to issue cash tickets on location.
- **Online PayHere Payment:** Integration with the PayHere sandbox for secure, real-time online checkout.
- **Real-time Seat Holding:** Using Socket.IO, if Customer A selects a seat, it locks on Customer B's screen instantly.
- **3D Seat Selection:** An interactive React Three Fiber seat map to give customers a premium visual experience.
- **Ticket Generation:** Customers can download vector-perfect PDF tickets.

## 2. System Architecture

The CineVerse architecture is a classic client-server model heavily augmented with real-time WebSocket capabilities.

```text
React Frontend (Vite)
       |
       | REST API (Axios/Fetch)
       ↓
Express Backend (Node.js)
       |
       ├── MongoDB (Mongoose)  <-- Persistent storage
       |
       ├── Socket.IO           <-- In-memory real-time state
       |
       └── PayHere             <-- External payment gateway
```

**Responsibilities:**
- **Frontend (cinema):** Responsible purely for UI presentation, managing local React state, establishing the Socket connection for live seat updates, and rendering the PayHere popup. 
- **Backend (cinemaAPI):** The definitive source of truth. It manages the database, calculates ticket prices to prevent frontend spoofing, orchestrates the real-time seat lock map, and acts as the webhook receiver for PayHere.
- **MongoDB:** Stores all permanent data (Users, Movies, Shows, Halls, Bookings).
- **Socket.IO:** Maintains a temporary, in-memory `Map` of currently held seats to prevent race conditions during checkout before a payment is finalized.
- **PayHere:** Processes payments securely. The frontend triggers the UI, but the backend verifies the MD5 hash notification to permanently confirm bookings.

*Critical Distinction:* The frontend NEVER calculates total amounts or sets booking statuses. All sensitive decisions MUST happen on the backend.

## 3. Technology Stack

### Frontend
- **React 19**
- **TypeScript**
- **Vite**
- **React Router v7**
- **React Three Fiber / Drei** (For 3D seat rendering)
- **Socket.IO Client**
- **Lucide React** (Icons)
- **Vanilla CSS** (Custom CSS styling)

### Backend
- **Node.js**
- **Express**
- **TypeScript**
- **MongoDB & Mongoose**
- **JSON Web Token (JWT)** (Authentication)
- **Socket.IO**
- **Bcryptjs** (Password hashing)
- **Crypto** (MD5 Hash generation for PayHere)
- **CORS**

## 4. Complete Folder Structure

```text
CineVerse/
│
├── README.md
├── PROJECT_CLEANUP_REPORT.md
│
├── cinema/ (Frontend)
│   ├── src/
│   │   ├── api/          (Axios/Fetch interceptors)
│   │   ├── assets/       (Images, logos, placeholders)
│   │   ├── components/   (Reusable UI elements: Header, Footer, CinemaScene, AdminRoute)
│   │   ├── context/      (AuthContext for global state)
│   │   ├── pages/        (React Router page components)
│   │   ├── styles/       (CSS modules and global styles)
│   │   ├── types/        (TypeScript interfaces)
│   │   ├── App.tsx       (Main router setup)
│   │   └── main.tsx      (React DOM root)
│   ├── index.html
│   └── package.json
│
└── cinemaAPI/ (Backend)
    ├── src/
    │   ├── config/       (Database connection logic)
    │   ├── controllers/  (Business logic for endpoints)
    │   ├── middleware/   (Auth, Admin, and Logger middlewares)
    │   ├── models/       (Mongoose schemas)
    │   ├── routes/       (Express route definitions)
    │   ├── socket/       (WebSocket event handlers)
    │   ├── app.ts        (Express app configuration)
    │   └── server.ts     (Server entry point)
    └── package.json
```

## 5. Frontend File-by-File Documentation

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main application routing. Divides paths into Public, Customer (Protected), and Admin routes. |
| `src/api/client.ts` | Centralized API fetch wrapper. Automatically attaches the JWT token to requests and manages structured console logging. |
| `src/context/AuthContext.tsx` | Manages user authentication state globally (login, logout, loading profiles). |
| `src/pages/Home.tsx` | Customer landing page showing Hero section and quick movie links. |
| `src/pages/Movies.tsx` | Grid display of all available movies fetched from `/api/movies`. |
| `src/pages/MovieDetails.tsx` | Shows movie synopses and dynamically loads upcoming shows for that specific movie. |
| `src/pages/SeatSelection.tsx` | The most complex page. Establishes the Socket.IO connection to `show:<showId>`, manages the seat map, calculates client-side temporary totals, and routes to `/checkout`. |
| `src/components/CinemaScene.tsx` | The React Three Fiber Canvas container that renders the 3D seating environment. |
| `src/pages/Checkout.tsx` | Retrieves PayHere hash configurations from the backend and triggers `payhere.startCheckout()`. |
| `src/pages/MyBookings.tsx` | Fetches and displays a customer's personal booking history. |
| `src/pages/BookingSuccess.tsx` | Long-polls the backend for payment verification and shows success/failure state. |
| `src/pages/TicketView.tsx` | Renders a visually formatted digital ticket for a confirmed booking. Also handles `window.print()` PDF generation. |
| `src/pages/admin/AdminDashboard.tsx` | Admin overview displaying real-time revenue, booking counts, and upcoming shows. |
| `src/pages/admin/TicketCounter.tsx` | Point of Sale (POS) interface for physical counter bookings. Bypasses PayHere for direct cash entry. |

## 6. Backend File-by-File Documentation

### Models
- **User**: Stores email, password hash, name, and role (`CUSTOMER`, `ADMIN`).
- **Movie**: Stores metadata (title, description, posterUrl, genre).
- **Hall**: Physical cinema layouts. Currently assumes a 50-seat layout per hall.
- **Show**: Links a Movie and a Hall at a specific date/time, with a fixed `ticketPrice`.
- **Booking**: The central transaction record. Stores `showId`, `seatIds`, `totalAmount`, `paymentMethod`, `status` (`PENDING`, `CONFIRMED`, `CANCELLED`), and `paymentStatus`.

### Controllers
- `authController.ts`: Handles user registration, login (BCrypt comparison), and issues JWT tokens.
- `movieController.ts`: Standard CRUD operations for the movie catalog.
- `showController.ts`: Manages show scheduling, including a bulk scheduling function to generate multiple shows at once. Calculates available vs booked seats dynamically.
- `bookingController.ts`: Orchestrates physical/cash bookings. Extracts user IDs from tokens to enforce security. Contains `getBookingById` with deep-population for ticket generation.
- `paymentController.ts`: The PayHere gateway. `createPaymentSession` calculates MD5 hashes. `handlePayHereNotification` acts as the webhook receiver to confirm bookings.

## 7. Complete REST API Documentation

| Method | Endpoint | Auth | Purpose | Implementation File |
|--------|----------|------|---------|---------------------|
| POST | `/api/auth/register` | Public | Register new user | `authController.ts` |
| POST | `/api/auth/login` | Public | Login and receive JWT | `authController.ts` |
| GET | `/api/auth/profile` | Protected | Get own profile data | `authController.ts` |
| GET | `/api/movies` | Public | List all movies | `movieController.ts` |
| POST | `/api/movies` | Admin | Create new movie | `movieController.ts` |
| GET | `/api/shows` | Public | List all shows | `showController.ts` |
| GET | `/api/shows/movie/:movieId` | Public | Get shows for a specific movie | `showController.ts` |
| POST | `/api/shows/schedule` | Admin | Bulk schedule shows | `showController.ts` |
| POST | `/api/bookings` | Protected | Create counter/cash booking | `bookingController.ts` |
| GET | `/api/bookings/my` | Protected | Get own bookings | `bookingController.ts` |
| GET | `/api/bookings/:id` | Protected | Get specific booking | `bookingController.ts` |
| GET | `/api/bookings` | Admin | List all bookings globally | `bookingController.ts` |
| POST | `/api/payments/create-session` | Protected | Generate PayHere hash/order | `paymentController.ts` |
| POST | `/api/payments/notify` | Public | PayHere Server Webhook | `paymentController.ts` |
| GET | `/api/admin/dashboard` | Admin | Fetch revenue/booking stats | `adminController.ts` |

## 8. Authentication Architecture

1. **Login**: User submits credentials to `/api/auth/login`.
2. **JWT**: Backend signs a JWT containing the user's MongoDB `_id`.
3. **Storage**: Frontend receives the token and stores it in `localStorage` (`cineverse_token`).
4. **Header**: The frontend `api/client.ts` automatically attaches `Authorization: Bearer <token>` to all protected requests.
5. **Middleware (`authMiddleware.ts`)**: Express decodes the token. If invalid, it returns `401 Unauthorized`. It injects `req.user` into the request.
6. **Role Verification (`adminMiddleware.ts`)**: If an endpoint requires Admin access, it checks `req.user.role === 'ADMIN'`. If false, returns `403 Forbidden`.

## 9. Real-Time Seat Holding System

CineVerse utilizes an advanced, in-memory Socket.IO state machine to prevent customers from booking the same seat.

**Architecture:**
1. **Connection**: User navigates to `/book/:movieId/:showId`. The frontend connects to the Socket.IO server.
2. **Room Joining**: Client emits `joinShow` with the `showId`. Backend places the socket in the `show:<showId>` room.
3. **State Sync**: Backend immediately emits `show:seat-holds` back to the client, supplying an array of currently held seats so the 3D map can lock them out instantly.
4. **Holding**: User clicks Seat A1. Client emits `seat:hold`. Backend validates the hold and broadcasts `seat:held` to ALL clients in the room. A1 turns gray for everyone else.
5. **Releasing**: If the user unclicks, emits `seat:release`. Backend broadcasts `seat:released`.
6. **Timeouts**: The backend maintains a strict timer. If a seat is held for more than 5 minutes without a payment completing, it auto-releases.
7. **Disconnect**: If the user closes the browser, Socket.IO's `disconnect` event fires, and the backend automatically releases all seats held by that `socket.id`.

**Files:** `src/pages/SeatSelection.tsx`, `cinemaAPI/src/socket/seatSocket.ts`

## 10. PayHere Payment Architecture

Because frontend payments can be spoofed, CineVerse uses a strict backend-verified flow.

1. **Session Request**: Frontend sends selected seats to `POST /api/payments/create-session`.
2. **Backend Validation**: Backend verifies seats aren't booked, calculates total based on `show.ticketPrice`, and creates a `PENDING` booking in MongoDB.
3. **Hash Generation**: Backend generates the MD5 hash using `<YOUR_PAYHERE_MERCHANT_SECRET>`.
4. **Checkout**: Frontend receives the config and triggers the PayHere UI.
5. **Customer Pays**: The transaction occurs securely on PayHere's iframe.
6. **Webhook (`notify_url`)**: PayHere servers silently POST to `/api/payments/notify` with the status and `md5sig`.
7. **Confirmation**: The backend recalculates the local hash. If it matches `md5sig` and `status_code === 2`, the booking becomes `CONFIRMED`.
8. **Socket Update**: The backend emits `seat:booked` through Socket.IO to permanently lock the seats for all active browsers.

## 11. Booking Lifecycle

1. **Seat AVAILABLE**: Seat is empty in DB and not in Socket Map.
2. **Socket HELD**: Seat added to backend in-memory Map. UI shows blue (self) or gray (others).
3. **Payment PENDING**: DB booking created. Waiting for webhook.
4. **PayHere SUCCESS**: Webhook received. DB updated to `CONFIRMED` & `PAID`.
5. **Tickets Generated**: User can navigate to `/ticket/:id` to view their tickets.

**Failure Paths:**
- *Payment Failed/Cancelled:* Webhook receives `0` or `-1`. DB updated to `CANCELLED`. Seats are released via Socket.
- *Hold Timeout:* Socket server forcibly removes seat from Map and broadcasts release.
- *User Disconnect:* Socket is closed, all associated holds are flushed.

## 12. Ticket System

Tickets are generated entirely from the populated MongoDB `Booking` object. 
- A customer clicks **View Ticket** on their My Bookings page, opening `/ticket/:bookingId`.
- The frontend fetches the booking. The backend strictly ensures `req.user._id === booking.userId`, returning `403` if a customer tries to view someone else's ticket.
- The `TicketView.tsx` component renders a beautiful CSS ticket with perforated edges, movie backdrop, and a `qrcode.react` code.
- **Downloading**: Clicking "Download PDF" calls `window.print()`. CSS `@media print` rules hide the entire website interface, generating a clean, vector-perfect physical ticket PDF natively.

## 13. Admin System

The Admin Layout operates completely independently of the Customer interface (no Customer header/footer).
- **Dashboard**: Aggregates revenue via MongoDB aggregation pipelines (`/api/admin/dashboard`). Shows pending vs confirmed stats.
- **Movies/Shows**: Admins can CRUD movies and utilize the "Bulk Scheduler" to generate a week of shows across multiple time slots in one click.

## 14. Ticket Counter

The Ticket Counter is a specialized dual-pane POS page (`/admin/ticket-counter`).
- Admins select a Movie -> Show -> Seats entirely on one screen.
- Instead of PayHere, they select "CASH".
- Hitting "Complete Booking" hits `/api/bookings` directly (bypassing `/api/payments`), creating an instantly `CONFIRMED` booking labeled as `bookingSource: 'counter'`.

## 15. Admin Dashboard Statistics

- **Total Movies / Total Shows / Total Bookings**: Counts derived from direct MongoDB queries.
- **Revenue**: Calculated in `adminController.ts` by summing `totalAmount` of all `CONFIRMED` bookings.
- **Today's Shows**: Queries the `Show` collection where `date` is bounded between 00:00 and 23:59 of the current day.

## 16. Database Relationships

```text
User
 │
 └── Booking ──────┐
       │           │ (References)
       │           ↓
       └── Show ───┼──> Movie
             │     │
             └─────┴──> Hall
```
- **Show** owns the relationship to a Movie and a Hall.
- **Booking** owns the relationship to a User and a Show. By deep-populating a Booking -> Show -> Movie, we can construct the entire digital ticket dynamically.

## 17. Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `PORT` | Backend | Server port (default 5000) |
| `MONGODB_URI` | Backend | Database connection string |
| `JWT_SECRET` | Backend | Token signing key |
| `PAYHERE_MERCHANT_ID` | Backend | PayHere account ID |
| `PAYHERE_MERCHANT_SECRET` | Backend | Hash signing key |
| `PAYHERE_NOTIFY_URL` | Backend | Webhook destination |
| `FRONTEND_URL` | Backend | CORS and callback routing |
| `VITE_API_URL` | Frontend | Target for `api/client.ts` |

## 18. Local Development Setup

**Backend**
```bash
cd cinemaAPI
npm install
npm run dev
```
Runs on `http://localhost:5000`. Requires a running MongoDB instance (or Atlas URI in `.env`).

**Frontend**
```bash
cd cinema
npm install
npm run dev
```
Runs on `http://localhost:5173`.


## 20. Build & Production

- **Frontend**: Run `npm run build`. Vite will compile all TSX into optimized static assets in the `/dist` folder. Ensure `VITE_API_URL` points to the production server.
- **Backend**: Run `npm run build` (`tsc`). The Node server must allow CORS for the production frontend domain.

## 21. Important Business Rules

- Customers cannot access any endpoint protected by `adminMiddleware.ts`.
- The frontend is untrusted. Final booking prices are ALWAYS calculated by `show.ticketPrice * seatIds.length` in the backend.
- `payhere.onCompleted` in the browser does NOT confirm a booking; only the backend webhook verification confirms it.
- Seats held via Socket.IO are temporary and exist strictly in server memory. They do not persist to MongoDB until checkout initiates.
- Once a booking is `CONFIRMED` in MongoDB, those seats are permanently unavailable.

## 22. Error Handling

- **401 Unauthorized**: JWT token is missing, expired, or corrupted. Handled by frontend logging out.
- **403 Forbidden**: User lacks ADMIN privileges, or is attempting to view another user's Ticket.
- **404 Not Found**: Movie/Show/Booking does not exist.
- **409 Conflict**: A critical error thrown when a user attempts to checkout seats that were just booked by someone else milliseconds prior.

## 23. Debugging Guide

CineVerse is heavily instrumented with structured logging.

- `[API REQUEST]` / `[API RESPONSE]`: Intercepted by `loggerMiddleware.ts` and `api/client.ts`. Look here to track slow endpoints or 400 errors.
- `[SOCKET]`: Emitted by `seatSocket.ts`. Watch this to see users joining rooms, holding seats, and disconnecting.
- `[PAYMENT]`: Emitted by `paymentController.ts`. Tracks hash generation, webhook receipt, and MD5 signature validation.

**Troubleshooting:**
- *Seats aren't syncing visually:* Check backend `[SOCKET]` logs for room connection issues or frontend `[HELD DEBUG]` logs.
- *Ticket shows "Not Available":* The webhook failed to reach your machine. Use Ngrok or check `[PAYMENT]` logs for "Signature valid: NO".

## 24. Known Architectural Decisions

- **Express + React (Vite)**: Selected for modern, fast DX and distinct separation of concerns.
- **In-Memory Socket Map**: Selected over Redis or MongoDB for temporary seat holds because speed is paramount and temporary holds do not require permanent persistence. If the server crashes, holds are naturally flushed, which is an acceptable tradeoff for a lightweight system.
- **Backend-Authoritative Pricing**: Implemented to prevent users from manipulating network requests to buy a 2000 LKR ticket for 1 LKR.

## 25. File Modification Guide

"If I want to change X, which files should I edit?"

| Requirement | Files |
|-------------|-------|
| Change 3D seat colors | `components/CinemaSeat.tsx` |
| Change PayHere UI/logic | `pages/Checkout.tsx`, `controllers/paymentController.ts` |
| Change digital ticket PDF layout | `pages/TicketView.tsx`, `styles/Ticket.css` |
| Add new Dashboard stats | `pages/admin/AdminDashboard.tsx`, `controllers/adminController.ts` |
| Edit movie schemas | `models/Movie.ts`, `controllers/movieController.ts` |

---
*Generated as part of the Final Documentation and Cleanup Audit.*
