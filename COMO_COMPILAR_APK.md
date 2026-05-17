# Como compilar la APK para Android

## Requisitos

1. **Android Studio** - Descargar de https://developer.android.com/studio
2. **Java JDK 17** (Android Studio lo incluye)
3. **Git** (opcional, para clonar)

## Pasos

### 1. Copiar la carpeta `android/` a tu computadora

Descarga la carpeta `android/` completa del proyecto.

### 2. Configurar la URL de tu sitio

Abre el archivo `android/app/src/main/assets/capacitor.config.json` y cambia la URL:

```json
{
  "appId": "com.genio.revendedores",
  "appName": "Genio Revendedores",
  "webDir": "public",
  "server": {
    "url": "https://TU-URL-AQUI.replit.app",
    "cleartext": true
  }
}
```

Reemplaza `https://TU-URL-AQUI.replit.app` con la URL real de tu sitio en Kimi.

**IMPORTANTE:** La URL debe ser la de tu sitio desplegado, por ejemplo:
- `https://genio-revendedores-abc123.kimiapps.com`
- O la URL que te da Kimi cuando publicas

### 3. Abrir en Android Studio

1. Abre Android Studio
2. Selecciona "Open an Existing Project"
3. Navega a la carpeta `android/` y abrela
4. Espera a que Gradle sincronice (puede tardar unos minutos la primera vez)

### 4. Compilar la APK

1. En Android Studio, anda al menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Espera a que termine la compilacion
3. La APK se guarda en:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Instalar en el celular

Opcion A - Por USB:
1. Conecta el celular por USB con modo desarrollador activado
2. En Android Studio, click en el boton verde de "Run" (triangulo verde)

Opcion B - APK directa:
1. Copia el archivo `app-debug.apk` al celular
2. En el celular, abri el archivo e instala (permite "fuentes desconocidas" si pide)

## Funciones que incluye la app

- **WhatsApp**: Al tocar "Enviar pedido por WhatsApp" se abre la app de WhatsApp directamente
- **PDF**: Los PDFs se descargan automaticamente al celular
- **Offline**: La app funciona con los archivos locales si no hay internet
- **Pantalla completa**: Sin barra de navegacion del navegador

## Solucion de problemas

### "Gradle sync failed"
- Anda a **File > Invalidate Caches / Restart** y selecciona "Invalidate and Restart"

### "Could not resolve all dependencies"
- Asegurate de tener conexion a internet
- Anda a **File > Sync Project with Gradle Files**

### La app abre pero no carga el sitio
- Verifica que la URL en `capacitor.config.json` sea correcta
- Asegurate de que el sitio este accesible publicamente

### WhatsApp no se abre
- Asegurate de tener WhatsApp instalado en el celular
- La app detecta automaticamente WhatsApp o WhatsApp Business
