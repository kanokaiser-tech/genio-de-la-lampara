<?php
// PROXY PHP - Redirige todo al backend Node.js
$port = 3002;
$path = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

$url = "http://127.0.0.1:$port$path";

// Leer el body
$body = file_get_contents('php://input');

// Preparar headers
$headers = [];
$headers[] = "Host: 127.0.0.1:$port";
$headers[] = "Content-Type: application/json";
$headers[] = "Accept: application/json";

foreach (getallheaders() as $key => $value) {
    $k = strtolower($key);
    if ($k === 'host' || $k === 'content-type' || $k === 'accept') continue;
    $headers[] = "$key: $value";
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($body !== '' && $body !== false) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    echo json_encode(["error" => "Backend unavailable: " . curl_error($ch)]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

$headersList = explode("\r\n", $rawHeaders);
foreach ($headersList as $header) {
    if (empty($header) || stripos($header, 'Transfer-Encoding:') === 0) continue;
    if (stripos($header, 'HTTP/') === 0) {
        http_response_code($httpCode);
        continue;
    }
    header($header);
}

echo $responseBody;
curl_close($ch);
