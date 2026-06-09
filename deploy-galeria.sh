#!/bin/bash
# Script para deployar la galeria de imagenes + descripcion de Tiendanube
# Ejecutar desde ~/genio-de-la-lampara

echo "========================================="
echo "  Deploy: Galeria de imagenes + Desc"
echo "========================================="

cd /var/www/genio || { echo "Error: No estas en /var/www/genio"; exit 1; }

# 1. Backup de seguridad
echo "[1/6] Backup..."
cp api/productRouter.ts api/productRouter.ts.bak
cp api/tiendanubeRouter.ts api/tiendanubeRouter.ts.bak
cp db/schema.ts db/schema.ts.bak
cp src/App.tsx src/App.tsx.bak

# 2. Copiar archivos nuevos
echo "[2/6] Copiando archivos..."
# Estos archivos los copias manualmente o los descargas del repo

# 3. DB Migration
echo "[3/6] Migrando base de datos..."
mysql genio -e '
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT AFTER category;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imagesJson TEXT AFTER imageUrl;

CREATE TABLE IF NOT EXISTS featuredDeals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT UNSIGNED NOT NULL,
  dealPrice DECIMAL(12,2) NOT NULL,
  dealType ENUM("cash", "transfer") DEFAULT "cash",
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_product (productId)
);

CREATE TABLE IF NOT EXISTS userInteractions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT UNSIGNED NOT NULL,
  productId INT UNSIGNED NOT NULL,
  type ENUM("view", "purchase", "cart") NOT NULL,
  count INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_interaction (userId, productId, type)
);

CREATE TABLE IF NOT EXISTS userCategoryViews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT UNSIGNED NOT NULL,
  category VARCHAR(255) NOT NULL,
  count INT DEFAULT 1,
  UNIQUE KEY unique_cat (userId, category)
);
'
echo "  DB migrada"

# 4. Compilar
echo "[4/6] Compilando..."
VITE_API_URL=https://geniorevendedores.geniodelalampara.com/api/trpc npm run build 2>&1
if [ $? -ne 0 ]; then
    echo "  Error compilando"
    exit 1
fi
echo "  Compilado OK"

# 5. Reiniciar
echo "[5/6] Reiniciando..."
pm2 restart genio
echo "  Reiniciado"

# 6. Verificar
echo "[6/6] Verificando..."
sleep 2
curl -s http://localhost:3002/api/trpc/product.list > /dev/null && echo "  Backend OK" || echo "  Backend ERROR"

echo ""
echo "========================================="
echo "  Deploy completo!"
echo "========================================="
echo ""
echo "Para probar:"
echo "1. Anda a la web"
echo "2. Apreta 'Sincronizar' en el panel admin para traer imagenes"
echo "3. Entra a un producto del catalogo para ver la galeria"
