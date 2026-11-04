-- DriveEase database schema
-- Run this once against your MySQL server:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS driveease CHARACTER SET utf8mb4;
USE driveease;

-- ---------------------------------------------------------------
-- Users (login / signup)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  wishlist_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- Cars (the fleet shown on the frontend)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  type ENUM('hatchback','sedan','suv','luxury') NOT NULL,
  price INT NOT NULL,               -- per day, in rupees
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  seats INT NOT NULL,
  transmission ENUM('Automatic','Manual') NOT NULL,
  fuel VARCHAR(30) NOT NULL,
  image VARCHAR(500),
  tag VARCHAR(60),
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------
-- Wishlist (many-to-many: user <-> car)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  car_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_car (user_id, car_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  car_id INT NOT NULL,
  pickup_location VARCHAR(160) DEFAULT 'Chennai',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  addon VARCHAR(60) DEFAULT 'None',
  addon_cost INT NOT NULL DEFAULT 0,
  days INT NOT NULL,
  total INT NOT NULL,
  status ENUM('Verification Pending','Confirmed','Cancelled','Completed') NOT NULL DEFAULT 'Verification Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------
-- Identity verification requests
-- Sensitive numbers are never stored in plain text: only a one-way
-- hash (for duplicate checks) and the last 4 digits (for display).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  id_number_hash VARCHAR(255) NOT NULL,
  id_number_last4 CHAR(4) NOT NULL,
  id_proof_type VARCHAR(40) NOT NULL,
  id_proof_file_path VARCHAR(500) NOT NULL,
  rental_due_date DATE NOT NULL,
  status ENUM('Pending Review','Approved','Rejected') NOT NULL DEFAULT 'Pending Review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Promo codes (used by the price calculator)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  code VARCHAR(30) PRIMARY KEY,
  discount_percent INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);

INSERT INTO promo_codes (code, discount_percent) VALUES
  ('DRIVE10', 10),
  ('WELCOME15', 15)
ON DUPLICATE KEY UPDATE discount_percent = VALUES(discount_percent);

-- ---------------------------------------------------------------
-- Seed the same 6 demo cars used in the frontend's script.js
-- ---------------------------------------------------------------
INSERT INTO cars (name, type, price, rating, seats, transmission, fuel, image, tag) VALUES
('Hyundai i20', 'hatchback', 1450, 4.6, 5, 'Automatic', 'Petrol', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80', 'Popular'),
('Honda City', 'sedan', 2100, 4.8, 5, 'Automatic', 'Petrol', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c9?auto=format&fit=crop&w=900&q=80', 'Top Rated'),
('Toyota Innova', 'suv', 3200, 4.9, 7, 'Automatic', 'Diesel', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80', 'Family Pick'),
('Mahindra Thar', 'suv', 2800, 4.7, 5, 'Manual', 'Diesel', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80', 'Adventure'),
('BMW 3 Series', 'luxury', 6200, 4.9, 5, 'Automatic', 'Petrol', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80', 'Premium'),
('Tata Punch', 'hatchback', 1650, 4.5, 5, 'Manual', 'Petrol', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80', 'Value Pick')
ON DUPLICATE KEY UPDATE name = VALUES(name);
