<?php
// log_event.php - ФІНАЛЬНА ВЕРСІЯ: ЛОГУВАННЯ В БАЗУ ДАНИХ (ПОВНИЙ КОД)

// =========================================================
// КОНФІГУРАЦІЯ БАЗИ ДАНИХ (ПЕРЕВІРЕНІ ДАНІ)
// =========================================================
define('DB_HOST', 'sql308.byetcluster.com');
define('DB_NAME', 'if0_40622081_data');
define('DB_USER', 'if0_40622081');
define('DB_PASS', '8zLdfDEoLFn');
$tableName = 'events_log';
// =========================================================


// --- Налаштування середовища та функціонал ---
ini_set('display_errors', 0); // Вимкнено для коректного повернення JSON
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

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

// --- Функція підключення до БД (PDO) ---
function connectDB() {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (\PDOException $e) {
        error_log("Database Connection Error: " . $e->getMessage());
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'DB Connection failed']); 
        exit;
    }
}

// --- Функція запису в БД ---
function insertLog($pdo, $tableName, $logType, $sequence, $localTime, $serverTime, $message) {
    $sql = "INSERT INTO `{$tableName}` (log_type, sequence, local_time, server_time, message) 
            VALUES (:log_type, :sequence, :local_time, :server_time, :message)";
            
    $stmt = $pdo->prepare($sql);
    
    return $stmt->execute([
        'log_type' => $logType,
        'sequence' => $sequence,
        'local_time' => $localTime,
        'server_time' => $serverTime,
        'message' => $message
    ]);
}

// =========================================================
// ОБРОБКА GET-ЗАПИТУ: Зчитування логів 
// =========================================================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Важливо: Content-Type: text/plain, оскільки JS його очікує
    header('Content-Type: text/plain; charset=utf-8'); 
    
    try {
        $pdo = connectDB(); 
        
        $stmt = $pdo->query("SELECT log_type, sequence, local_time, server_time, message 
                              FROM `{$tableName}` 
                              ORDER BY sequence ASC, created_at ASC");
        
        $logOutput = '';
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $logOutput .= sprintf(
                "%s|%s|%s|%s|%s\n",
                $row['log_type'],
                $row['sequence'],
                $row['local_time'],
                $row['server_time'],
                str_replace(["\n", "\r"], ' ', $row['message'])
            );
        }
        
        echo $logOutput;
        exit; 
        
    } catch (Exception $e) {
        error_log("Database Read Error (GET): " . $e->getMessage());
        echo ''; // Повертаємо порожню відповідь, щоб не зламати JS
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
    
    $pdo = connectDB();
    
    try {
        $eventData = urldecode($eventDataEncoded); 
        
        if ($logType === 'immediate') {
            $data = json_decode($eventData, true);

            if ($data && isset($data['seq']) && isset($data['message'])) {
                 insertLog(
                    $pdo, $tableName, 
                    'IMMEDIATE', $data['seq'], $data['localTime'] ?? 'N/A', $serverTime, $data['message']
                );
            } else {
                 throw new Exception("Invalid IMMEDIATE data format.");
            }
        } elseif ($logType === 'final') {
            $dataArray = json_decode($eventData, true);
            
            if (is_array($dataArray) && !empty($dataArray)) {
                foreach ($dataArray as $data) {
                    if (isset($data['seq']) && isset($data['message'])) {
                        insertLog(
                            $pdo, $tableName, 
                            'FINAL', $data['seq'], $data['localTime'] ?? 'N/A', $serverTime, $data['message']
                        );
                    }
                }
            } else {
                throw new Exception("Invalid FINAL data format or empty array.");
            }
        }
        
        echo json_encode(['status' => 'success', 'serverTime' => $serverTime]);
        
    } catch (Exception $e) {
        error_log("Log Insert Error: " . $e->getMessage());
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'Server error during logging.']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
}

?>