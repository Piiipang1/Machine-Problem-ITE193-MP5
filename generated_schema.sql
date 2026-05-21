-- Generated MySQL schema for ITE193_INDANAN_FOURTH
-- Use in XAMPP/phpMyAdmin to create the database and populate sample data.

DROP DATABASE IF EXISTS ite193_store;
CREATE DATABASE IF NOT EXISTS ite193_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE ite193_store;

CREATE TABLE IF NOT EXISTS users (
    id          INT          NOT NULL AUTO_INCREMENT,
    username    VARCHAR(50)  NOT NULL,
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(50)  NOT NULL,
    middle_name VARCHAR(50)  DEFAULT NULL,
    last_name   VARCHAR(50)  NOT NULL,
    address     VARCHAR(255) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id          INT            NOT NULL AUTO_INCREMENT,
    code        VARCHAR(20)    NOT NULL,
    name        VARCHAR(100)   NOT NULL,
    quantity    INT            NOT NULL DEFAULT 0,
    unit_price  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    image       VARCHAR(10)    NOT NULL DEFAULT '📦',
    updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id          INT            NOT NULL AUTO_INCREMENT,
    user_id     INT            NOT NULL,
    total       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    ordered_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id            INT            NOT NULL AUTO_INCREMENT,
    order_id      INT            NOT NULL,
    product_code  VARCHAR(20)    NOT NULL,
    product_name  VARCHAR(100)   NOT NULL,
    image         VARCHAR(10)    NOT NULL DEFAULT '📦',
    unit_price    DECIMAL(10,2)  NOT NULL,
    qty           INT            NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample product data
INSERT INTO products (code, name, quantity, unit_price, image) VALUES
('SS001', 'Lucky Me Pancit Canton',           50,  12.00, '🍜'),
('SS002', 'Maggi Magic Sarap (8g)',           100,   6.00, '🧂'),
('SS003', 'Mang Tomas All-Around Sarsa',       30,  25.00, '🫙'),
('SS004', 'Sky Flakes Crackers',               60,   8.00, '🍘'),
('SS005', 'Nescafe 3-in-1 (25g)',              80,  10.00, '☕'),
('SS006', 'Zest-O Orange Juice (250ml)',       45,  15.00, '🧃'),
('SS007', 'Bear Brand Powdered Milk (33g)',    70,  18.00, '🥛'),
('SS008', 'Chippy Corn Chips',                 55,  14.00, '🍿'),
('SS009', 'Champion Detergent Bar',            40,  20.00, '🧼'),
('SS010', 'Safeguard Soap (55g)',              35,  30.00, '🛀'),
('SS011', 'San Miguel Beer (330ml)',           24,  55.00, '🍺'),
('SS012', 'C2 Green Tea (230ml)',              48,  20.00, '🍵'),
('SS013', 'Marlboro Red (pack)',               20, 120.00, '🚬'),
('SS014', 'Fisherman''s Friend (10g)',         90,  18.00, '🍬'),
('SS015', 'Boy Bawang Cornick',                65,  22.00, '🧄'),
('SS016', 'Rebisco Crackers',                  50,   8.00, '🍪'),
('SS017', 'Purefoods Corned Beef (150g)',      30,  52.00, '🥫'),
('SS018', 'Milo Powder (22g)',                 75,  12.00, '🍫'),
('SS019', 'Cobra Energy Drink (240ml)',        36,  28.00, '⚡'),
('SS020', 'Eden Cheese (165g)',                25,  65.00, '🧀'),
('SS021', 'Del Monte Pineapple Juice (240ml)', 42,  28.00, '🍍'),
('SS022', 'Regent Cheese Rings',               60,   8.00, '🥨'),
('SS023', 'Century Tuna (155g)',               38,  38.00, '🐟');

-- Sample user data
INSERT INTO users (username, password, first_name, middle_name, last_name, address, email) VALUES
('sai_indanan', '$2y$10$P4X3rZq5lVmT8nKjWuEe3uGvqNQyHs3XJCpJZoWfJv2O7p4nTG3Zy', 'Sai', 'Cruz', 'Indanan', '123 Rizal St., Davao City', 'sai.indanan@ite193.edu'),
('maria_reyes', '$2y$10$Hk2mLpT5wQyR9nXvC3Ie8OeJkNMzGs2WIBqIaoPgIu1N8r5oSG4Au', 'Maria', 'Santos', 'Reyes', '456 Mabini Ave., Cebu City', 'maria.reyes@ite193.edu'),
('juan_cruz', '$2y$10$Rn4pKqV7xLwS0oYuD5Jf9PfMkNOzHt4YJDrJbpXgKw3R9s6pUH5Bu', 'Juan', 'dela', 'Cruz', '789 Bonifacio Blvd., Manila', 'juan.cruz@ite193.edu'),
('ana_garcia', '$2y$10$Ym6nMrW8yNxT1pZvE6Kg0QgNlPPaIt5ZKEsKcqYhLx4S0t7qVJ6Cv', 'Ana', 'Lim', 'Garcia', '321 Quezon Road, Iloilo City', 'ana.garcia@ite193.edu'),
('carlo_fernandez', '$2y$10$Zp7oNsX9zOyU2qAwF7Lh1RhOmQQbJu6ALFtLdrZiMy5T1u8rWK7Dw', 'Carlo', 'Bautista', 'Fernandez', '654 Luna St., Zamboanga City', 'carlo.fernandez@ite193.edu'),
('lea_tolentino', '$2y$10$Aq8pOtY0aPzV3rBxG8Mi2SiPnRRcKv7BMGuMepAjNz6U2v9sXL8Ex', 'Lea', 'Mangahas', 'Tolentino', '987 Del Pilar St., Baguio City', 'lea.tolentino@ite193.edu');

-- Sample order and order_items data
INSERT INTO orders (user_id, total) VALUES (1, 24.00);
INSERT INTO order_items (order_id, product_code, product_name, image, unit_price, qty) VALUES
(1, 'SS001', 'Lucky Me Pancit Canton', '🍜', 12.00, 2);
