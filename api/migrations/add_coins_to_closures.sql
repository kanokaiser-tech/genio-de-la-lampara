-- Agregar columnas para trackear descuento por monedas de oro en cierres de caja
ALTER TABLE dailyClosures
ADD COLUMN IF NOT EXISTS totalReal DECIMAL(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS totalDiscountCoins DECIMAL(12,2) DEFAULT 0 NOT NULL;
