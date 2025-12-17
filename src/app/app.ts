import { Component, HostListener, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CharState {
  char: string;
  status: 'pending' | 'correct' | 'incorrect' | 'current';
  isSpace: boolean;
}

interface Word {
  chars: CharState[];
}

interface WpmDataPoint {
  time: number;
  wpm: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy, AfterViewInit {
  @ViewChild('wpmChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

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

  selectedDuration = 15;
  timeLeft = 15;
  hasStarted = false;
  showResults = false;

  correctChars = 0;
  incorrectChars = 0;
  totalCharsTyped = 0;

  liveWpm = 0;
  rawWpm = 0;
  netWpm = 0;
  accuracy = 0;

  wpmHistory: WpmDataPoint[] = [];
  private chart: Chart | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  constructor() {
    this.generateText();
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }

  get progress(): number {
    return this.flatChars.length ? (this.currentCharIndex / this.flatChars.length) * 100 : 0;
  }

  get isWarning(): boolean {
    return this.timeLeft <= 5 && this.hasStarted;
  }

  get totalCharacters(): number {
    return this.correctChars + this.incorrectChars;
  }

  setDuration(seconds: number) {
    if (this.hasStarted) return;
    this.selectedDuration = seconds;
    this.timeLeft = seconds;
  }

  generateText() {
    const wordCount = this.selectedDuration >= 60 ? 100 : this.selectedDuration >= 30 ? 70 : 45;
    const selectedWords: string[] = [];
    for (let i = 0; i < wordCount; i++) {
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
    this.wpmHistory = [];

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateLiveWpm();
      this.recordWpmDataPoint();

      if (this.timeLeft <= 0) {
        this.endTest();
      }
    }, 1000);
  }

  updateLiveWpm() {
    if (!this.hasStarted) return;
    const elapsedMinutes = (Date.now() - this.startTime) / 60000;
    if (elapsedMinutes > 0) {
      const wordsTyped = this.correctChars / 5;
      this.liveWpm = Math.round(wordsTyped / elapsedMinutes) || 0;
    }
  }

  recordWpmDataPoint() {
    const elapsedSeconds = this.selectedDuration - this.timeLeft;
    this.wpmHistory.push({
      time: elapsedSeconds,
      wpm: this.liveWpm
    });
  }

  endTest() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const elapsedMinutes = this.selectedDuration / 60;

    this.rawWpm = Math.round((this.totalCharsTyped / 5) / elapsedMinutes);
    this.netWpm = Math.round((this.correctChars / 5) / elapsedMinutes);
    this.accuracy = this.totalCharsTyped > 0
      ? Math.round((this.correctChars / this.totalCharsTyped) * 100)
      : 0;

    this.showResults = true;

    setTimeout(() => this.renderChart(), 300);
  }

  renderChart() {
    if (!this.chartCanvas?.nativeElement) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, 'rgba(139, 115, 85, 0.25)');
    gradient.addColorStop(1, 'rgba(139, 115, 85, 0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.wpmHistory.map(p => `${p.time}s`),
        datasets: [{
          label: 'WPM',
          data: this.wpmHistory.map(p => p.wpm),
          borderColor: '#8b7355',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2c2416',
          pointBorderColor: '#f5efe0',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#5a4a3a',
          pointHoverBorderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#2c2416',
            titleColor: '#f5efe0',
            bodyColor: '#f5efe0',
            padding: 12,
            cornerRadius: 6,
            borderColor: 'rgba(139, 115, 85, 0.3)',
            borderWidth: 1,
            displayColors: false,
            titleFont: {
              family: "'Courier New', monospace",
              size: 11
            },
            bodyFont: {
              family: "'Courier New', monospace",
              size: 14,
              weight: 'bold'
            },
            callbacks: {
              title: (items) => `Time: ${items[0].label}`,
              label: (item) => `${item.raw} WPM`
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(139, 115, 85, 0.1)'
            },
            ticks: {
              color: '#8b7355',
              font: {
                family: "'Courier New', monospace",
                size: 10
              },
              maxTicksLimit: 8
            },
            border: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(139, 115, 85, 0.1)'
            },
            ticks: {
              color: '#8b7355',
              font: {
                family: "'Courier New', monospace",
                size: 10
              },
              maxTicksLimit: 5
            },
            border: {
              display: false
            }
          }
        }
      }
    });
  }

  restart() {
    this.timeLeft = this.selectedDuration;
    this.currentCharIndex = 0;
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.totalCharsTyped = 0;
    this.hasStarted = false;
    this.startTime = 0;
    this.liveWpm = 0;
    this.rawWpm = 0;
    this.netWpm = 0;
    this.accuracy = 0;
    this.wpmHistory = [];
    this.showResults = false;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.generateText();
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
