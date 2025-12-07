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

const SQUARE_SIZE = 15;
let animationFrameId = null;
let isAnimating = false;
let eventSequence = 0;
const animationInterval = 20; 

let bluePos = { x: 0, y: 0 };
let orangePos = { x: 0, y: 0 };
let blueVel = { x: 2.2, y: 1.6 };
let orangeVel = { x: -1.8, y: -1.3 };

let localEvents = []; 
const MAX_LOG_SIZE = 1500;

function getCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

function logEvent(message) {
    eventSequence++;
    const localTime = getCurrentTime();
    messageDisplay.textContent = `${eventSequence}: ${message}`;

    const logData = {
        log_type: 'IMMEDIATE',
        sequence: eventSequence,
        local_time: localTime,
        server_time: 'N/A',
        message: message,
    };

    localEvents.push(logData);

    if (localEvents.length > MAX_LOG_SIZE) {
        localEvents = localEvents.slice(localEvents.length - MAX_LOG_SIZE); 
    }

    try {
        localStorage.setItem('animation_logs', JSON.stringify(localEvents));
    } catch (e) {
        console.error("Помилка LocalStorage при записі логів:", e);
        messageDisplay.textContent = 'УВАГА: LocalStorage переповнене. Логування призупинено.';
    }
}

function initSquares() {
    const animRect = anim.getBoundingClientRect();
    const animWidth = animRect.width;
    const animHeight = animRect.height;
    if (animWidth <= 0 || animHeight <= 0) {
        console.warn("Anim area dimensions are zero or invalid. Cannot initialize squares."); 
        if (work.style.display !== 'block') return;
    }
    bluePos.x = animWidth - SQUARE_SIZE;
    bluePos.y = Math.random() * (animHeight - SQUARE_SIZE);

    orangePos.y = animHeight - SQUARE_SIZE;
    orangePos.x = Math.random() * (animWidth - SQUARE_SIZE);

    blueSquare.style.transform = `translate(${bluePos.x}px, ${bluePos.y}px)`;
    orangeSquare.style.transform = `translate(${orangePos.x}px, ${orangePos.y}px)`;

    logEvent('Квадрати встановлені на нові стартові позиції');
}

function checkCollision(pos1, pos2) {
    return pos1.x < pos2.x + SQUARE_SIZE &&
        pos1.x + SQUARE_SIZE > pos2.x &&
        pos1.y < pos2.y + SQUARE_SIZE &&
        pos1.y + SQUARE_SIZE > pos2.y;
}

function animate() {
    if (!isAnimating) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    const animRect = anim.getBoundingClientRect();
    const animWidth = animRect.width;
    const animHeight = animRect.height;

    bluePos.x += blueVel.x;
    bluePos.y += blueVel.y;
    orangePos.x += orangeVel.x;
    orangePos.y += orangeVel.y;

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

    if (checkCollision(bluePos, orangePos)) {
        isAnimating = false;
        logEvent('Квадрати зіткнулися! Анімація зупинена');
        stopButton.style.display = 'none';
        startButton.style.display = 'none';
        reloadButton.style.display = 'inline-block';
        return;
    }

    blueSquare.style.transform = `translate(${bluePos.x}px, ${bluePos.y}px)`;
    orangeSquare.style.transform = `translate(${orangePos.x}px, ${orangePos.y}px)`;

    setTimeout(() => {
        animationFrameId = requestAnimationFrame(animate);
    }, animationInterval);
}

function displayLogs() {
    const storedLogs = localStorage.getItem('animation_logs');
    
    let logsArray;

    try {
        logsArray = storedLogs ? JSON.parse(storedLogs) : localEvents;
    } catch (e) {
        console.error("Помилка JSON при зчитуванні логів:", e);
        logsArray = localEvents;
    }
    
    logsOutput.innerHTML = '<h3>Протокол подій (Клієнтський лог)</h3>';

    if (!Array.isArray(logsArray) || logsArray.length === 0) {
        logsOutput.innerHTML += '<p>Логи відсутні або мають некоректний формат.</p>';
        return;
    }

    logsArray = logsArray.filter(log => log !== null && typeof log === 'object');


    let tableHTML = '<table><thead><tr><th>Подія #</th><th>Тип</th><th>Лок. час</th><th>Повідомлення</th></tr></thead><tbody>';

    logsArray.forEach(log => {
        if (log && log.local_time) {
            const timeDisplay = log.local_time; 
            
            tableHTML += `<tr>
                <td>${log.sequence}</td>
                <td>${log.log_type}</td>
                <td>${timeDisplay}</td>
                <td>${log.message}</td>
            </tr>`;
        } else {
            console.warn("Пропущено пошкоджений або неповний запис логу:", log);
            tableHTML += `<tr><td colspan="4" style="color: red; font-style: italic;">[Пошкоджений запис логу]</td></tr>`;
        }
    });

    tableHTML += '</tbody></table>';
    logsOutput.innerHTML += tableHTML;
}

playButton.addEventListener('click', () => {
    work.style.display = 'block';
    if (!isAnimating && startButton.style.display !== 'none' && reloadButton.style.display === 'none') {
        initSquares();
    }
    logEvent('Натиснута кнопка "play"');
});

closeButton.addEventListener('click', () => {
    work.style.display = 'none';
    isAnimating = false;
    cancelAnimationFrame(animationFrameId);

    displayLogs();
});

startButton.addEventListener('click', () => {
    if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(animate);
        logEvent('Натиснута кнопка "start". Анімація розпочата');
        startButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
    }
});
stopButton.addEventListener('click', () => {
    if (isAnimating) {
        isAnimating = false;
        cancelAnimationFrame(animationFrameId);
        logEvent('Натиснута кнопка "stop". Анімація зупинена');
        stopButton.style.display = 'none';
        startButton.style.display = 'inline-block';
    }
});

reloadButton.addEventListener('click', () => {
    initSquares(); 
    isAnimating = false;
    logEvent('Натиснута кнопка "reload". Квадрати скинуто');

    reloadButton.style.display = 'none';
    startButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
});
document.addEventListener('DOMContentLoaded', () => {
    const storedLogs = localStorage.getItem('animation_logs');
    if (storedLogs) {
        try {
            const parsedLogs = JSON.parse(storedLogs);
            if (Array.isArray(parsedLogs)) {
                localEvents = parsedLogs.filter(log => log && typeof log.sequence === 'number' && log.local_time);
                eventSequence = localEvents.length;
            } else {
                 localEvents = [];
            }
        } catch (e) {
            console.error("Помилка JSON при зчитуванні логів з LocalStorage:", e);
            localEvents = []; 
        }
    }
    initSquares();
});


