const words = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
    'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
    'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
    'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
    'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
    'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
    'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is'
];

let testText = '';
let currentCharIndex = 0;
let timeLeft = 15;
let startTime = 0;
let timerInterval;
let hasStarted = false;
let correctChars = 0;
let incorrectChars = 0;
let totalCharsTyped = 0;

const mainContainer = document.getElementById('mainContainer');
const textDisplay = document.getElementById('textDisplay');
const timerDisplay = document.getElementById('timer');
const liveWpmDisplay = document.getElementById('liveWpm');
const resultsOverlay = document.getElementById('resultsOverlay');
const instructions = document.getElementById('instructions');
const progressBar = document.getElementById('progressBar');

function generateText() {
    const selectedWords = [];
    for (let i = 0; i < 45; i++) {
        selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    testText = selectedWords.join(' ');
    displayText();
}

function displayText() {
    textDisplay.innerHTML = '<div class="progress-bar" id="progressBar"></div>';
    const words = testText.split(' ');
    let charIndex = 0;

    words.forEach((word, wordIndex) => {
        const wordContainer = document.createElement('span');
        wordContainer.className = 'word';

        for (let i = 0; i < word.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = word[i];
            charSpan.id = `char-${charIndex}`;
            if (charIndex === 0) {
                charSpan.classList.add('current');
            }
            wordContainer.appendChild(charSpan);
            charIndex++;
        }

        textDisplay.appendChild(wordContainer);

        if (wordIndex < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'char space';
            spaceSpan.innerHTML = '&nbsp;';
            spaceSpan.id = `char-${charIndex}`;
            textDisplay.appendChild(spaceSpan);
            charIndex++;
        }
    });
}

function updateProgress() {
    const progress = (currentCharIndex / testText.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function updateLiveWpm() {
    if (!hasStarted) return;
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const wordsTyped = correctChars / 5;
    const wpm = Math.round(wordsTyped / elapsedMinutes);
    liveWpmDisplay.textContent = wpm;
}

function startTimer() {
    hasStarted = true;
    startTime = Date.now();
    instructions.style.display = 'none';

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        updateLiveWpm();

        if (timeLeft <= 5) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            endTest();
        }
    }, 1000);
}

function typewriterReveal(element, text, delay = 80) {
    return new Promise((resolve) => {
        element.innerHTML = '';
        const chars = text.split('');
        let index = 0;

        function typeChar() {
            if (index < chars.length) {
                const span = document.createElement('span');
                span.className = 'digit';
                span.textContent = chars[index];
                element.appendChild(span);

                setTimeout(() => {
                    span.classList.add('show');
                }, 10);

                index++;
                setTimeout(typeChar, delay);
            } else {
                resolve();
            }
        }

        typeChar();
    });
}

async function endTest() {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', handleKeyPress);

    const totalWords = correctChars / 5;
    const wpm = Math.round(totalWords * (60 / 15));
    const accuracy = totalCharsTyped > 0 ? Math.round((correctChars / totalCharsTyped) * 100) : 0;

    mainContainer.classList.add('blurred');
    resultsOverlay.classList.add('show');

    await new Promise(resolve => setTimeout(resolve, 300));
    document.getElementById('resultsTitle').classList.add('show');

    await new Promise(resolve => setTimeout(resolve, 800));
    document.getElementById('wpmStat').classList.add('show');
    await typewriterReveal(document.getElementById('wpmValue'), wpm.toString(), 120);

    await new Promise(resolve => setTimeout(resolve, 400));
    document.getElementById('wpmLabel').classList.add('show');

    await new Promise(resolve => setTimeout(resolve, 600));
    document.getElementById('accuracyStat').classList.add('show');
    await typewriterReveal(document.getElementById('accuracyValue'), accuracy + '%', 120);

    await new Promise(resolve => setTimeout(resolve, 400));
    document.getElementById('accuracyLabel').classList.add('show');

    await new Promise(resolve => setTimeout(resolve, 500));
    document.getElementById('restartBtn').classList.add('show');
}

function handleKeyPress(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (!hasStarted) {
        startTimer();
    }

    const key = e.key;

    if (key === 'Backspace') {
        e.preventDefault();
        if (currentCharIndex > 0) {
            currentCharIndex--;
            const currentChar = document.getElementById(`char-${currentCharIndex}`);
            currentChar.classList.remove('correct', 'incorrect');
            currentChar.classList.add('current');

            if (currentCharIndex < testText.length - 1) {
                document.getElementById(`char-${currentCharIndex + 1}`).classList.remove('current');
            }
            updateProgress();
            updateLiveWpm();
        }
        return;
    }

    if (key.length === 1) {
        e.preventDefault();

        const currentChar = document.getElementById(`char-${currentCharIndex}`);
        const expectedChar = testText[currentCharIndex];

        currentChar.classList.remove('current');
        totalCharsTyped++;

        if (key === expectedChar) {
            currentChar.classList.add('correct');
            correctChars++;
        } else {
            currentChar.classList.add('incorrect');
            incorrectChars++;
        }

        currentCharIndex++;
        updateProgress();
        updateLiveWpm();

        if (currentCharIndex < testText.length) {
            document.getElementById(`char-${currentCharIndex}`).classList.add('current');
        } else {
            endTest();
        }
    }
}

document.addEventListener('keydown', handleKeyPress);

function restart() {
    timeLeft = 15;
    currentCharIndex = 0;
    correctChars = 0;
    incorrectChars = 0;
    totalCharsTyped = 0;
    hasStarted = false;
    startTime = 0;

    timerDisplay.textContent = timeLeft;
    liveWpmDisplay.textContent = '0';
    timerDisplay.classList.remove('warning');

    mainContainer.classList.remove('blurred');
    resultsOverlay.classList.remove('show');
    instructions.style.display = 'block';

    document.getElementById('resultsTitle').classList.remove('show');
    document.getElementById('wpmStat').classList.remove('show');
    document.getElementById('accuracyStat').classList.remove('show');
    document.getElementById('wpmLabel').classList.remove('show');
    document.getElementById('accuracyLabel').classList.remove('show');
    document.getElementById('restartBtn').classList.remove('show');

    generateText();
    updateProgress();
    document.addEventListener('keydown', handleKeyPress);
}

generateText();
updateProgress();
