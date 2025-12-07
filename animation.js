// animation.js

const work = document.getElementById('work');
const anim = document.getElementById('anim');
const playButton = document.getElementById('play-button');
const closeButton = document.getElementById('close-button');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const reloadButton = document.getElementById('reload-button');
const messageDisplay = document.getElementById('message-display');
const blueSquare = document.getElementById('blue-square');
const orangeSquare = document.getElementById('orange-square');
const logsOutput = document.getElementById('logs-output');

// Параметри анімації
const SQUARE_SIZE = 15;
let animationFrameId = null;
let isAnimating = false;
let eventSequence = 0; // Порядковий номер події (пункт h)
const animationInterval = 20; // Часовий проміжок між кроками/зміщеннями (пункт i)

// Позиції та швидкості
let bluePos = { x: 0, y: 0 };
let orangePos = { x: 0, y: 0 };
let blueVel = { x: 2.2, y: 1.6 };
let orangeVel = { x: -1.8, y: -1.3 };

// Логування подій
let localEvents = []; // Акумулятор для LocalStorage (Спосіб 2)
const LOG_FILE_PATH = 'log_event.php'; // Шлях до PHP-скрипта

/**
 * Отримання поточного часу з мілісекундами
 */
function getCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

/**
 * Логує подію обома способами: 
 * 1. Негайне відправлення на сервер (Спосіб 1)
 * 2. Акумуляція в LocalStorage (Спосіб 2)
 */
function logEvent(message) {
    eventSequence++;
    const localTime = getCurrentTime();
    messageDisplay.textContent = `${eventSequence}: ${message}`;

    const eventData = {
        seq: eventSequence,
        localTime: localTime,
        message: message,
    };

    // --- Спосіб 1: Негайне відправлення на сервер (пункт b) ---
    fetch(LOG_FILE_PATH, {
        method: 'POST',
        headers: {
            // Додавати charset=utf-8 тут не обов'язково, але не завадить
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        // !!! ВИПРАВЛЕНО !!!: Використання encodeURIComponent для безпечної передачі JSON
        body: `event=${encodeURIComponent(JSON.stringify(eventData))}&type=immediate`
    })
        .then(response => response.json())
        .then(data => {
            // console.log(`Event ${eventData.seq} saved on server at: ${data.serverTime}`);
        })
        .catch(error => {
            console.error('Error logging immediate event:', error);
        });

    // --- Спосіб 2: Акумуляція в LocalStorage (пункт c) ---
    localEvents.push(eventData);
    // Зберігаємо поточний акумулятор у LocalStorage
    localStorage.setItem('animation_logs', JSON.stringify(localEvents));
}

/**
 * Ініціалізація початкових позицій квадратів (пункт f)
 */
function initSquares() {
    const animRect = anim.getBoundingClientRect();
    const animWidth = animRect.width;
    const animHeight = animRect.height;

    // Перевірка, чи область 'anim' має коректні розміри
    if (animWidth <= 0 || animHeight <= 0) {
        console.warn("Anim area dimensions are zero or invalid. Cannot initialize squares.");
        return;
    }

    // Синій квадрат: біля правої стінки, випадкова вертикальна координата
    bluePos.x = animWidth - SQUARE_SIZE;
    bluePos.y = Math.random() * (animHeight - SQUARE_SIZE);

    // Помаранчевий квадрат: біля нижньої стінки, випадкова горизонтальна координата
    orangePos.y = animHeight - SQUARE_SIZE;
    orangePos.x = Math.random() * (animWidth - SQUARE_SIZE);

    // Встановлюємо початкові позиції
    blueSquare.style.transform = `translate(${bluePos.x}px, ${bluePos.y}px)`;
    orangeSquare.style.transform = `translate(${orangePos.x}px, ${orangePos.y}px)`;

    logEvent('Квадрати встановлені на нові стартові позиції');
}

/**
 * Перевірка зіткнення двох квадратів
 */
function checkCollision(pos1, pos2) {
    return pos1.x < pos2.x + SQUARE_SIZE &&
        pos1.x + SQUARE_SIZE > pos2.x &&
        pos1.y < pos2.y + SQUARE_SIZE &&
        pos1.y + SQUARE_SIZE > pos2.y;
}

/**
 * Основний цикл анімації
 */
function animate() {
    if (!isAnimating) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    const animRect = anim.getBoundingClientRect();
    const animWidth = animRect.width;
    const animHeight = animRect.height;

    // 1. Рух
    bluePos.x += blueVel.x;
    bluePos.y += blueVel.y;
    orangePos.x += orangeVel.x;
    orangePos.y += orangeVel.y;

    // Log кожне зміщення (крок) (пункт h)
    logEvent('Крок/зміщення квадратів');

    // 2. Дотик до стінок (зміна напрямку) (пункт f)

    // Синій квадрат
    if (bluePos.x + SQUARE_SIZE > animWidth) {
        blueVel.x *= -1;
        bluePos.x = animWidth - SQUARE_SIZE;
        logEvent('Синій квадрат: дотик до правої стінки');
    } else if (bluePos.x < 0) {
        blueVel.x *= -1;
        bluePos.x = 0;
        logEvent('Синій квадрат: дотик до лівої стінки');
    }
    if (bluePos.y + SQUARE_SIZE > animHeight) {
        blueVel.y *= -1;
        bluePos.y = animHeight - SQUARE_SIZE;
        logEvent('Синій квадрат: дотик до нижньої стінки');
    } else if (bluePos.y < 0) {
        blueVel.y *= -1;
        bluePos.y = 0;
        logEvent('Синій квадрат: дотик до верхньої стінки');
    }

    // Помаранчевий квадрат
    if (orangePos.x + SQUARE_SIZE > animWidth) {
        orangeVel.x *= -1;
        orangePos.x = animWidth - SQUARE_SIZE;
        logEvent('Помаранчевий квадрат: дотик до правої стінки');
    } else if (orangePos.x < 0) {
        orangeVel.x *= -1;
        orangePos.x = 0;
        logEvent('Помаранчевий квадрат: дотик до лівої стінки');
    }
    if (orangePos.y + SQUARE_SIZE > animHeight) {
        orangeVel.y *= -1;
        orangePos.y = animHeight - SQUARE_SIZE;
        logEvent('Помаранчевий квадрат: дотик до нижньої стінки');
    } else if (orangePos.y < 0) {
        orangeVel.y *= -1;
        orangePos.y = 0;
        logEvent('Помаранчевий квадрат: дотик до верхньої стінки');
    }

    // 3. Дотик квадратів між собою (зупинка) (пункт f, g)
    if (checkCollision(bluePos, orangePos)) {
        isAnimating = false;
        logEvent('Квадрати зіткнулися! Анімація зупинена');

        // Зміна кнопок при зіткненні
        stopButton.style.display = 'none';
        startButton.style.display = 'none';
        reloadButton.style.display = 'inline-block';
        return;
    }

    // 4. Оновлення позицій на екрані
    blueSquare.style.transform = `translate(${bluePos.x}px, ${bluePos.y}px)`;
    orangeSquare.style.transform = `translate(${orangePos.x}px, ${orangePos.y}px)`;

    // Рекурсивний виклик через setTimeout для контролю інтервалу (пункт i)
    setTimeout(() => {
        animationFrameId = requestAnimationFrame(animate);
    }, animationInterval);
}


// --- Функції логування та відображення ---

/**
 * Спосіб 2: Відправлення акумульованих логів на сервер при закритті (пункт c, h)
 */
function sendFinalLogs() {
    const logs = localStorage.getItem('animation_logs');
    if (logs && localEvents.length > 0) {
        // Надсилаємо батч акумульованих логів
        fetch(LOG_FILE_PATH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            },
            // !!! ВИПРАВЛЕНО !!!: Використання encodeURIComponent для безпечної передачі JSON
            body: `event=${encodeURIComponent(logs)}&type=final`
        })
            .then(response => response.json())
            .then(data => {
                console.log('Final logs batch sent to server.');
                // Очищення LocalStorage після успішної відправки
                localStorage.removeItem('animation_logs');
                localEvents = [];
            })
            .catch(error => {
                console.error('Error sending final logs batch:', error);
            });
    }
}

/**
 * Зчитування та відображення логів із сервера (Спосіб 1 та 2) (пункт h)
 */
function displayLogs() {
    // 1. Читання логів із сервера (лог-файл `server_events.log`)
    logsOutput.innerHTML = '<h3>Отримання логів із сервера...</h3>';

    // Додаємо заголовок Accept для забезпечення UTF-8
    fetch(LOG_FILE_PATH, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain; charset=utf-8'
        }
    })
        .then(response => response.text())
        .then(serverLogContent => {

            let tableHTML = '<h3>Протокол подій (Серверний лог)</h3>';
            tableHTML += '<table><thead><tr><th>Подія #</th><th>Повідомлення</th><th>Лок. час (JS)</th><th>Серв. час (PHP)</th><th>Спосіб</th></tr></thead><tbody>';

            // Парсинг серверних логів
            const serverLogs = serverLogContent.split('\n').filter(line => line.length > 0 && line.includes('|'));

            serverLogs.forEach(line => {
                const parts = line.split('|');
                // Очікуваний формат: TYPE|SEQ|LOCAL_TIME|SERVER_TIME|MESSAGE
                if (parts.length >= 5) {
                    const type = parts[0];
                    const seq = parts[1];
                    const localTime = parts[2];
                    const serverTime = parts[3];
                    const message = parts[4];

                    const displayType = type === 'IMMEDIATE' ? 'Негайний (1)' : 'Кінцевий (2)';

                    tableHTML += `<tr><td>${seq}</td><td>${message}</td><td>${localTime}</td><td>${serverTime}</td><td>${displayType}</td></tr>`;
                }
            });

            tableHTML += '</tbody></table>';
            logsOutput.innerHTML = tableHTML;
        })
        .catch(error => {
            logsOutput.innerHTML = '<p style="color: red;">Помилка зчитування логів із сервера. (Перевірте консоль браузера)</p>';
            console.error('Error fetching logs:', error);
        });
}


// --- Обробники кнопок ---

// Кнопка 'play' (пункт d)
playButton.addEventListener('click', () => {
    work.style.display = 'block';
    // Ініціалізація, якщо квадрати ще не були встановлені або анімація зупинена
    if (!isAnimating && startButton.style.display !== 'none' && reloadButton.style.display === 'none') {
        initSquares();
    }
    logEvent('Натиснута кнопка "play"');
});

// Кнопка 'close' (пункт d, h)
closeButton.addEventListener('click', () => {
    work.style.display = 'none';
    isAnimating = false;
    cancelAnimationFrame(animationFrameId);

    logEvent('Натиснута кнопка "close"');

    // Спосіб 2: Відправлення акумульованих логів
    sendFinalLogs();

    // Відображення логів
    displayLogs();
});

// Кнопка 'start' (пункт g)
startButton.addEventListener('click', () => {
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(animate);
        logEvent('Натиснута кнопка "start". Анімація розпочата');
        startButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
    }
});

// Кнопка 'stop' (пункт g)
stopButton.addEventListener('click', () => {
    if (isAnimating) {
        isAnimating = false;
        cancelAnimationFrame(animationFrameId);
        logEvent('Натиснута кнопка "stop". Анімація зупинена');
        stopButton.style.display = 'none';
        startButton.style.display = 'inline-block';
    }
});

// Кнопка 'reload' (пункт g)
reloadButton.addEventListener('click', () => {
    initSquares(); // Встановлення на нові стартові позиції
    isAnimating = false;
    logEvent('Натиснута кнопка "reload". Квадрати скинуто');

    // Кнопки: reload зникає, start з'являється
    reloadButton.style.display = 'none';
    startButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
});

// Ініціалізація при завантаженні: завантаження логів з LS та початкова установка
document.addEventListener('DOMContentLoaded', () => {
    const storedLogs = localStorage.getItem('animation_logs');
    if (storedLogs) {
        localEvents = JSON.parse(storedLogs);
        eventSequence = localEvents.length;
    }
    // Початкова ініціалізація позицій квадратів, навіть якщо work прихований
    // Це забезпечує коректні розміри при першому виклику 'play'
    initSquares();
});