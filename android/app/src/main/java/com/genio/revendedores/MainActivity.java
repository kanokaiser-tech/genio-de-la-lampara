package com.genio.revendedores;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.os.Build;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_CODE_STORAGE = 100;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Solicitar permisos de almacenamiento en runtime (Android 6+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                                     android.Manifest.permission.READ_EXTERNAL_STORAGE},
                        REQUEST_CODE_STORAGE);
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();

        // Configurar el WebView para manejar WhatsApp y descargas
        WebView webView = getBridge().getWebView();

        // Interceptar URLs de WhatsApp y abrirlas con la app nativa
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://wa.me/") || url.startsWith("whatsapp://")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.setPackage("com.whatsapp");
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        // Si WhatsApp no esta instalado, intentar con WhatsApp Business
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            intent.setPackage("com.whatsapp.w4b");
                            startActivity(intent);
                            return true;
                        } catch (Exception e2) {
                            // Si ninguno esta instalado, abrir con navegador
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                            return true;
                        }
                    }
                }
                // Para el resto de URLs, dejar que el WebView las maneje
                return false;
            }
        });

        // Manejar descargas de archivos (PDFs)
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                // Para archivos generados con blobs (jsPDF), usar el navegador
                if (url.startsWith("blob:")) {
                    Toast.makeText(MainActivity.this, "Descargando PDF...", Toast.LENGTH_SHORT).show();
                    // Los blobs se manejan automaticamente con los permisos de almacenamiento
                    return;
                }
                // Para URLs normales, abrir con el navegador
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                startActivity(intent);
            }
        });
    }
}
