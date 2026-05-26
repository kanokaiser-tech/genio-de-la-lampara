-- Schema completo para MariaDB / Hostinger

CREATE TABLE IF NOT EXISTS `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(50),
  `role` enum('superadmin','admin','revendedor') NOT NULL DEFAULT 'revendedor',
  `parentId` int UNSIGNED,
  `goldCoins` int NOT NULL DEFAULT 0,
  `discountType` enum('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `products` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(500) NOT NULL,
  `category` varchar(255) NOT NULL,
  `priceList` decimal(12,2) NOT NULL,
  `priceCash30` decimal(12,2) NOT NULL,
  `priceTransfer25` decimal(12,2) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `imageUrl` text,
  `tiendanubeId` varchar(100),
  `tiendanubeVariantId` varchar(100),
  `slug` varchar(500) UNIQUE,
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cartItems` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int UNSIGNED NOT NULL,
  `productId` int UNSIGNED NOT NULL,
  `quantity` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_product` (`userId`, `productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int UNSIGNED NOT NULL,
  `adminId` int UNSIGNED NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `paymentType` enum('efectivo','transferencia') NOT NULL,
  `shippingType` enum('none','express','free') NOT NULL DEFAULT 'none',
  `remitoNumber` varchar(20),
  `paid` boolean NOT NULL DEFAULT false,
  `closed` boolean NOT NULL DEFAULT false,
  `notes` text,
  `totalAmount` decimal(12,2) NOT NULL,
  `goldCoinsUsed` int NOT NULL DEFAULT 0,
  `discountPesos` decimal(12,2) NOT NULL DEFAULT 0.00,
  `webhookSent` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orderItems` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `orderId` int UNSIGNED NOT NULL,
  `productId` int UNSIGNED NOT NULL,
  `productName` varchar(500) NOT NULL,
  `tiendanubeProductId` varchar(100),
  `quantity` int NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `storeName` varchar(255) NOT NULL DEFAULT 'Genio de la Lampara',
  `whatsappNumber` varchar(50),
  `tiendanubeApiToken` text,
  `tiendanubeStoreId` varchar(100),
  `webhookUrl` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `goldCoinTransactions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int UNSIGNED NOT NULL,
  `orderId` int UNSIGNED,
  `type` enum('earned','spent','expired') NOT NULL,
  `amount` int NOT NULL,
  `description` varchar(255),
  `monthKey` varchar(7) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dailyClosures` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `adminId` int UNSIGNED NOT NULL,
  `totalAmount` decimal(12,2) NOT NULL,
  `totalReal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalDiscountCoins` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalOrders` int NOT NULL,
  `paidOrders` int NOT NULL DEFAULT 0,
  `pendingOrders` int NOT NULL DEFAULT 0,
  `totalCash` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalTransfer` decimal(12,2) NOT NULL DEFAULT 0.00,
  `note` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
