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

// --- ЗМІНЕНО: Логування подій для GitHub Pages (тільки LocalStorage) ---
let localEvents = []; // Акумулятор для LocalStorage
const MAX_LOG_SIZE = 1500; // Ліміт для уникнення переповнення LocalStorage
// LOG_FILE_PATH більше не використовується
// -------------------------------------------------------------------

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
 * Логує подію безпосередньо у LocalStorage, замінюючи серверне логування.
 */
function logEvent(message) {
    eventSequence++;
    const localTime = getCurrentTime();
    messageDisplay.textContent = `${eventSequence}: ${message}`;

    const logData = {
        log_type: 'IMMEDIATE', // Всі логи тепер Immediate (клієнтські)
        sequence: eventSequence,
        local_time: localTime,
        server_time: 'N/A', // Немає доступу до серверного часу
        message: message,
    };

    localEvents.push(logData);

    // Обмеження розміру логу
    if (localEvents.length > MAX_LOG_SIZE) {
        // Залишаємо лише останні MAX_LOG_SIZE логів
        localEvents = localEvents.slice(localEvents.length - MAX_LOG_SIZE); 
    }

    // Запис у LocalStorage
    try {
        localStorage.setItem('animation_logs', JSON.stringify(localEvents));
    } catch (e) {
        console.error("Помилка LocalStorage при записі логів:", e);
        // Додамо попередження на екран, якщо сховище переповнене
        messageDisplay.textContent = 'УВАГА: LocalStorage переповнене. Логування призупинено.';
    }
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

// Функція sendFinalLogs() ВИДАЛЕНА, оскільки всі логи вже зберігаються в LocalStorage.

/**
 * Зчитування та відображення логів з LocalStorage (Клієнтський лог)
 */
function displayLogs() {
    // 1. Отримання логів з LocalStorage
    const storedLogs = localStorage.getItem('animation_logs');
    
    // Якщо логів немає, перевіряємо, чи є логи в поточному сеансі (localEvents)
    const logsArray = storedLogs ? JSON.parse(storedLogs) : localEvents;
    
    logsOutput.innerHTML = '<h3>Протокол подій (Клієнтський лог)</h3>';

    if (logsArray.length === 0) {
        logsOutput.innerHTML += '<p>Логи відсутні.</p>';
        return;
    }

    let tableHTML = '<table><thead><tr><th>Подія #</th><th>Тип</th><th>Лок. час</th><th>Повідомлення</th></tr></thead><tbody>';

    logsArray.forEach(log => {
        // Очікувані поля: log_type, sequence, local_time, server_time, message
        // server_time більше не відображається, оскільки він N/A
        tableHTML += `<tr>
            <td>${log.sequence}</td>
            <td>${log.log_type}</td>
            <td>${log.local_time.substring(11, 23)}</td>
            <td>${log.message}</td>
        </tr>`;
    });

    tableHTML += '</tbody></table>';
    logsOutput.innerHTML = tableHTML;
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

    // sendFinalLogs() ВИДАЛЕНО
    
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
    initSquares();
});
