# MongoDB Database Setup Guide

Welcome to the CineVerse backend! This project uses **MongoDB** as its database. MongoDB is a NoSQL database, meaning it doesn't use standard SQL tables. Instead, it uses "Collections" (like tables) and "Documents" (like rows).

## Option A: MongoDB Atlas (Cloud - Recommended)

1. **Create an Account**: Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up.
2. **Build a Cluster**: Choose the free "M0 Sandbox" tier.
3. **Database User**: Create a user (e.g., username `admin`, password `admin123`). **Remember these credentials**.
4. **Network Access**: Go to Network Access in the sidebar. Click "Add IP Address" and choose "Allow Access From Anywhere" (`0.0.0.0/0`).
5. **Get Connection String**: Go to your Cluster -> Connect -> "Connect your application". Copy the connection string. It will look like this:
   `mongodb+srv://admin:admin123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
6. **Set up `.env`**: Open the `.env` file in this project and add:
   ```env
   MONGODB_URI=mongodb+srv://admin:admin123@cluster0.abcde.mongodb.net/cineverse?retryWrites=true&w=majority
   ```
   *(Notice how we added `/cineverse` before the `?` to specify the database name).*

## Option B: Local MongoDB (Offline)

1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Set your `.env` file to:
   ```env
   MONGODB_URI=mongodb://localhost:27017/cineverse
   ```

## Starting and Seeding the Database

1. Open a terminal in this `cinemaAPI` folder.
2. Run `npm install` to install dependencies.
3. Run `npm run seed`. This script will connect to your MongoDB and automatically create all the necessary data (Movies, Admin user, Customer user). **MongoDB automatically creates the `cineverse` database and the collections when data is inserted!**
4. Run `npm run dev` to start the API.

## Viewing your Data (MongoDB Compass)

1. Download and install [MongoDB Compass](https://www.mongodb.com/products/tools/compass) (a visual viewer for MongoDB).
2. Open Compass and paste your connection string (`MONGODB_URI`).
3. Click Connect. You will see the `cineverse` database.
4. Click inside it to see your collections: `users`, `movies`, `halls`, `shows`, and `bookings`.
