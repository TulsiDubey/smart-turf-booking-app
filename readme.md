Smart Turf Booker ⚽
Smart Turf Booker is a full-stack mobile application designed to simplify the process of booking sports turfs, renting sports equipment, and organizing matches. Built with a React Native (Expo) frontend and a Node.js (Express) backend, it provides a seamless experience for sports enthusiasts.

✨ Features
User Authentication: Secure user registration and login using JWT (JSON Web Tokens).

Turf Discovery: Browse a list of available turfs with details like location, price, and ratings.

Real-time Slot Booking: View available time slots for any given day and book a turf in real-time.

Add Listings: Users can contribute to the platform by adding new turfs and sports kits available for rent.

Image Uploads: Easily upload images for turf and kit listings from the user's device.

Match Organization: Create public matches that other users can join, specifying the sport, players needed, and contribution per person.

Booking History: View a history of all past and upcoming bookings.

🛠️ Tech Stack
Frontend: React Native, Expo, Expo Router

Backend: Node.js, Express.js

Database: PostgreSQL

Authentication: JWT, bcrypt

File Handling: Multer

Prerequisites
Before you begin, ensure you have the following installed on your system:

Node.js (LTS version recommended)

PostgreSQL Database

Expo CLI: npm install -g expo-cli

Git

🚀 Getting Started
Follow these steps to set up and run the project locally.

1. Backend Setup
First, let's get the server and database running.

a. Clone the Repository

Bash

git clone <your-repository-url>
cd <your-repository-folder>/backend # Navigate to your backend folder
b. Install Dependencies

Bash

npm install
c. Create the Database
Open your PostgreSQL terminal (psql) or a GUI tool like pgAdmin. Create a new database for the project.

SQL

CREATE DATABASE "smart-turf-db";
d. Configure Environment Variables
Create a file named .env in your backend directory. This file will store your database credentials and secrets. Copy the following into it and replace the placeholder values.

Code snippet

# Server Configuration
PORT=3000

# Database Connection
DB_USER=postgres
DB_HOST=localhost
DB_NAME=smart-turf-db
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# Security
JWT_SECRET=this_is_a_very_secret_key_change_it
e. Set Up Database Tables
Connect to your newly created database and run the following SQL script to create the necessary tables.

SQL

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turfs Table
CREATE TABLE turfs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    price_per_hour NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    rating NUMERIC(2, 1) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Kits Table
CREATE TABLE kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_hour NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- You can add more tables for bookings, matches, etc. as you expand.
f. Create the Uploads Folder
In your backend directory, create a folder for storing images.

Bash

mkdir uploads
g. Run the Backend Server

Bash

node app.js
You should see a confirmation message: ✅ Database connected successfully... and 🚀 Server listening at http://localhost:3000.

2. Frontend Setup
Now, let's get the mobile app running.

a. Navigate to the Frontend Directory
Open a new terminal window and navigate to your frontend project folder.

Bash

cd <your-repository-folder>/frontend # or your main project folder
b. Install Dependencies

Bash

npm install
c. Configure the API URL (CRUCIAL STEP)
You need to tell the mobile app where your backend server is running.

Find your computer's Local IP address (e.g., 192.168.1.10).

Windows: ipconfig in Command Prompt.

Mac/Linux: ifconfig or ip a in Terminal.

Open the following files and replace the placeholder IP 192.168.43.110 with your computer's IP address:

app/login.jsx

app/(tabs)/home.jsx

app/(tabs)/turf/[id].jsx

app/(tabs)/addKit.jsx

app/(tabs)/addTurf.jsx

app/(tabs)/bookings.jsx

app/(tabs)/matches.jsx

Example:

JavaScript

// Before
const API_URL = 'http://192.168.43.110:3000';

// After (replace with your actual IP)
const API_URL = 'http://192.168.1.10:3000';
d. Run the Application

Bash

npx expo start
This will start the Metro bundler and show a QR code in the terminal.

e. Open the App on Your Phone

Make sure your phone is on the same Wi-Fi network as your computer.

Install the Expo Go app from the App Store or Google Play Store.

Scan the QR code from your terminal using the Expo Go app.