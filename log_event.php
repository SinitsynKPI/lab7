<?php
// log_event.php - ФІНАЛЬНА ВЕРСІЯ: ЛОГУВАННЯ У ФАЙЛ (server_events.log)

// =========================================================
// КОНФІГУРАЦІЯ
// =========================================================
$logFile = 'server_events.log';
// =========================================================


// --- Налаштування середовища та функціонал ---
ini_set('display_errors', 0); 
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Усунення проблем з кодуванням (КРИТИЧНО для кирилиці)
date_default_timezone_set('Europe/Kyiv'); 
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding("UTF-8");
    mb_http_output("UTF-8");
    mb_http_input("UTF-8");
    mb_regex_encoding("UTF-8");
}


// --- Функція для фіксації серверного часу ---
function getServerTime() {
    $microtime = microtime(true);
    $timestamp = floor($microtime);
    $milliseconds = round(($microtime - $timestamp) * 1000);
    return date('Y-m-d H:i:s', $timestamp) . '.' . str_pad($milliseconds, 3, '0', STR_PAD_LEFT);
}


// --- Функція запису у файл ---
function insertLogToFile($logFile, $logType, $sequence, $localTime, $serverTime, $message) {
    // Формат: LOG_TYPE|SEQUENCE|LOCAL_TIME|SERVER_TIME|MESSAGE\n
    $logContent = sprintf(
        "%s|%s|%s|%s|%s\n",
        $logType,
        $sequence,
        $localTime,
        $serverTime,
        str_replace(["\n", "\r"], ' ', $message) // Видаляємо переноси рядків з повідомлення
    );
    
    // Запис логу. Використовуємо FILE_APPEND | LOCK_EX для безпечного дозапису
    return file_put_contents($logFile, $logContent, FILE_APPEND | LOCK_EX);
}


// =========================================================
// ОБРОБКА GET-ЗАПИТУ: Зчитування логів (для відображення)
// =========================================================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Важливо: Content-Type: text/plain
    header('Content-Type: text/plain; charset=utf-8'); 
    
    if (!file_exists($logFile) || filesize($logFile) === 0) {
        echo ''; // Порожня відповідь, якщо файл не існує
        exit;
    }
    
    try {
        // Читаємо весь файл
        $logOutput = file_get_contents($logFile);
        echo $logOutput;
        exit; 
        
    } catch (Exception $e) {
        error_log("File Read Error (GET): " . $e->getMessage());
        echo ''; 
        exit;
    }
}


// =========================================================
// ОБРОБКА POST-ЗАПИТУ (Логування)
// =========================================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    header('Content-Type: application/json; charset=utf-8');
    
    $eventDataEncoded = $_POST['event'] ?? null;
    $logType = $_POST['type'] ?? 'unknown'; 
    $serverTime = getServerTime();
    
    if (!$eventDataEncoded || !in_array($logType, ['immediate', 'final'])) {
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid request or missing data']);
        exit;
    }
    
    try {
        $eventData = urldecode($eventDataEncoded); 
        $successCount = 0;
        
        if ($logType === 'immediate') {
            $data = json_decode($eventData, true);

            if ($data && isset($data['seq']) && isset($data['message'])) {
                 insertLogToFile(
                    $logFile, 'IMMEDIATE', $data['seq'], $data['localTime'] ?? 'N/A', $serverTime, $data['message']
                );
                $successCount++;
            } else {
                 throw new Exception("Invalid IMMEDIATE data format.");
            }
        } elseif ($logType === 'final') {
            $dataArray = json_decode($eventData, true);
            
            if (is_array($dataArray) && !empty($dataArray)) {
                foreach ($dataArray as $data) {
                    if (isset($data['seq']) && isset($data['message'])) {
                        insertLogToFile(
                            $logFile, 'FINAL', $data['seq'], $data['localTime'] ?? 'N/A', $serverTime, $data['message']
                        );
                        $successCount++;
                    }
                }
            } else {
                throw new Exception("Invalid FINAL data format or empty array.");
            }
        }
        
        echo json_encode(['status' => 'success', 'serverTime' => $serverTime, 'logs_written' => $successCount]);
        
    } catch (Exception $e) {
        error_log("Log Insert Error: " . $e->getMessage());
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'Server error during file logging.']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
}

?>
