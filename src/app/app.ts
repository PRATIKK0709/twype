import { Component, HostListener, OnDestroy } from '@angular/core';

interface CharState {
  char: string;
  status: 'pending' | 'correct' | 'incorrect' | 'current';
  isSpace: boolean;
}

interface Word {
  chars: CharState[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  private words = [
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

  testWords: Word[] = [];
  flatChars: CharState[] = [];
  currentCharIndex = 0;
  timeLeft = 15;
  hasStarted = false;
  showResults = false;
  correctChars = 0;
  incorrectChars = 0;
  totalCharsTyped = 0;
  liveWpm = 0;
  finalWpm = 0;
  accuracy = 0;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  constructor() {
    this.generateText();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get progress(): number {
    return this.flatChars.length ? (this.currentCharIndex / this.flatChars.length) * 100 : 0;
  }

  get isWarning(): boolean {
    return this.timeLeft <= 5 && this.hasStarted;
  }

  generateText() {
    const selectedWords: string[] = [];
    for (let i = 0; i < 45; i++) {
      selectedWords.push(this.words[Math.floor(Math.random() * this.words.length)]);
    }

    this.testWords = [];
    this.flatChars = [];

    selectedWords.forEach((word, wordIndex) => {
      const wordObj: Word = { chars: [] };

      for (const char of word) {
        const charState: CharState = {
          char,
          status: 'pending',
          isSpace: false
        };
        wordObj.chars.push(charState);
        this.flatChars.push(charState);
      }

      this.testWords.push(wordObj);

      if (wordIndex < selectedWords.length - 1) {
        const spaceState: CharState = {
          char: ' ',
          status: 'pending',
          isSpace: true
        };
        this.flatChars.push(spaceState);
      }
    });

    if (this.flatChars.length > 0) {
      this.flatChars[0].status = 'current';
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    if (this.showResults) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (!this.hasStarted) {
      this.startTimer();
    }

    const key = event.key;

    if (key === 'Backspace') {
      event.preventDefault();
      if (this.currentCharIndex > 0) {
        this.flatChars[this.currentCharIndex].status = 'pending';
        this.currentCharIndex--;
        this.flatChars[this.currentCharIndex].status = 'current';
      }
      return;
    }

    if (key.length === 1 && this.currentCharIndex < this.flatChars.length) {
      event.preventDefault();

      const currentChar = this.flatChars[this.currentCharIndex];
      const expectedChar = currentChar.char;

      this.totalCharsTyped++;

      if (key === expectedChar) {
        currentChar.status = 'correct';
        this.correctChars++;
      } else {
        currentChar.status = 'incorrect';
        this.incorrectChars++;
      }

      this.currentCharIndex++;
      this.updateLiveWpm();

      if (this.currentCharIndex < this.flatChars.length) {
        this.flatChars[this.currentCharIndex].status = 'current';
      } else {
        this.endTest();
      }
    }
  }

  startTimer() {
    this.hasStarted = true;
    this.startTime = Date.now();

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateLiveWpm();

      if (this.timeLeft <= 0) {
        this.endTest();
      }
    }, 1000);
  }

  updateLiveWpm() {
    if (!this.hasStarted) return;
    const elapsedMinutes = (Date.now() - this.startTime) / 60000;
    const wordsTyped = this.correctChars / 5;
    this.liveWpm = Math.round(wordsTyped / elapsedMinutes) || 0;
  }

  endTest() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const totalWords = this.correctChars / 5;
    this.finalWpm = Math.round(totalWords * (60 / 15));
    this.accuracy = this.totalCharsTyped > 0 ? Math.round((this.correctChars / this.totalCharsTyped) * 100) : 0;
    this.showResults = true;
  }

  restart() {
    this.timeLeft = 15;
    this.currentCharIndex = 0;
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.totalCharsTyped = 0;
    this.hasStarted = false;
    this.startTime = 0;
    this.liveWpm = 0;
    this.showResults = false;

    this.generateText();
  }

  getSpaceChar(index: number): CharState | null {
    const wordEndIndex = this.testWords.slice(0, index + 1).reduce((acc, w) => acc + w.chars.length, 0) + index;
    if (wordEndIndex < this.flatChars.length) {
      const char = this.flatChars[wordEndIndex];
      return char.isSpace ? char : null;
    }
    return null;
  }

  getSpaceIndex(wordIndex: number): number {
    let index = 0;
    for (let i = 0; i <= wordIndex; i++) {
      index += this.testWords[i].chars.length;
      if (i < wordIndex) index++;
    }
    return index;
  }
}
