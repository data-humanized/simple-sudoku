# ZenSudoku

A minimalist, distraction-free Sudoku Progressive Web Application built with React, TypeScript, Vite, and Tailwind CSS.

## Core Design Principles
- **Distraction-Free**: No ads, no accounts, no logins, no notifications, no reminders, no popups, no confetti, and no social features.
- **Pure Local Storage**: All puzzles, history records, streaks, and settings persist securely on device storage.
- **Pure Game Engine**: All game logic (solving, uniqueness checking, logical difficulty grading, scoring, progression rules, and daily streak calculation) resides in pure TypeScript modules under `/src/logic` with zero UI or browser dependencies, ready to be ported to Flutter/Dart, React Native, or another platform.
- **Offline & PWA First**: Operates fully offline via service worker and Web App Manifest.

---

## Data Models Specification

All core types and interfaces are defined in `/src/logic/types.ts`.

### 1. `GameState`
Represents an active in-progress or completed Sudoku session:

```typescript
export interface GameState {
  id: string;                    // Unique game identifier
  level: DifficultyLevel;        // 'easy' | 'medium' | 'hard' | 'expert'
  initialGrid: number[][];       // 9x9 grid of given numbers (immutable)
  solution: number[][];          // 9x9 complete valid solution
  currentGrid: number[][];       // 9x9 current board state (0 = empty, 1..9 = value)
  notes: number[][][];           // 9x9 matrix of candidate notes (arrays of 1..9)
  hintedCells: boolean[][];      // 9x9 matrix: true if cell was auto-filled by a hint
  mistakes: number;              // Cumulative count of incorrect entries made
  hintsUsed: number;             // Cumulative count of hints used
  elapsedSeconds: number;        // Active playtime excluding paused time
  isPaused: boolean;             // Whether game is paused
  isCompleted: boolean;          // True when grid matches solution
  undoStack: MoveAction[];       // Unlimited undo history
  redoStack: MoveAction[];       // Redo history
  startedAt: number;             // Timestamp (ms)
  lastActiveAt: number;          // Timestamp (ms) of latest move
  completedAt?: number;          // Timestamp (ms) of completion
  finalScore?: number;           // Final score computed at completion
}
```

### 2. `HistoryRecord`
Represents an individual completed Sudoku game stored permanently:

```typescript
export interface HistoryRecord {
  id: string;                    // Unique record identifier
  date: string;                  // Local device date in 'YYYY-MM-DD' format
  completedAt: number;           // Timestamp (ms) of completion
  level: DifficultyLevel;        // 'easy' | 'medium' | 'hard' | 'expert'
  timeSeconds: number;           // Total active time in seconds
  score: number;                 // Calculated final score
  hintsUsed: number;             // Hints used in this game
  mistakes: number;              // Mistakes committed in this game
}
```

### 3. `GameStats` and `LevelStats`
Aggregated statistics computed directly from `HistoryRecord[]`:

```typescript
export interface LevelStats {
  completed: number;             // Total games completed at this level
  bestTime: number | null;       // Fastest time in seconds (or null if 0 games)
  averageTime: number | null;    // Mean time in seconds
  bestScore: number | null;      // Highest score achieved
  averageScore: number | null;   // Mean score
}

export interface GameStats {
  totalCompleted: number;        // Total games completed across all levels
  currentStreak: number;         // Current active consecutive days streak
  bestStreak: number;            // All-time best consecutive days streak
  levels: Record<DifficultyLevel, LevelStats>;
}
```

### 4. `AppSettings`
User preferences configurable in the Settings modal:

```typescript
export interface AppSettings {
  theme: 'system' | 'light' | 'dark' | 'contrast';
  fontSize: 'small' | 'medium' | 'large';
  showTimer: boolean;            // Default: true
  highlightSameNumbers: boolean; // Default: true
  colorFeedback: boolean;        // Default: true (Green for correct, Red for wrong)
  autoRemoveNotes: boolean;      // Default: true
  hapticFeedback: boolean;       // Default: false
  soundEffects: boolean;         // Default: false
}
```

### 5. Input Feedback & Three-Mistakes Rule
- **Instant Color Feedback**: On digit entry, compare against solution. Correct entries are displayed in green with a distinct dark green font; wrong entries are highlighted in red with a distinct dark red font. Given (pre-filled) puzzle digits remain neutral black/white bold.
- **Shake Indication**: Wrong entries trigger a ~350ms CSS shake animation (`translateX ±6px`) and haptic vibration if enabled.
- **Candidate Integrity**: Wrong entries never count as solved, are never used when calculating pencil candidates, and do not remove candidates from peer cells. They remain editable and erasable.
- **Three-Mistakes Rule**: Mistakes are tracked as `Mistakes: n/3` in the header. Upon reaching 3 mistakes, the game and timer pause, displaying a modal: *"Out of lives. Get a life to continue."*. A 5-second countdown (`5, 4, 3, 2, 1`) enables the *"Get a life"* button to reset mistakes to 0 and resume play. If the user leaves the tab during the wait, the countdown restarts to prevent skipping. No ads or external content.

### 5. `UnlockStatus` and `StreakInfo`
```typescript
export interface UnlockStatus {
  level: DifficultyLevel;
  isUnlocked: boolean;
  current: number;               // Completed prerequisite games
  required: number;              // Required games to unlock
  prerequisiteLevel: DifficultyLevel | null;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // 'YYYY-MM-DD'
}
```

---

## Game Logic Rules

### 1. Level Unlock Rules
- **Easy**: Unlocked from the start.
- **Medium**: Unlocks after **2** completed Easy games.
- **Hard**: Unlocks after **4** completed Medium games.
- **Expert**: Unlocks after **16** completed Hard games.

A game counts as completed when correctly solved (using hints does not disqualify it). Locked levels appear greyed out with a lock icon and quiet progress indicator (e.g. `1 / 2 Easy games`).

### 2. Difficulty Grader
Puzzles are graded strictly by the human logical techniques required to solve:
- **Easy**: Naked singles and hidden singles only.
- **Medium**: Adds naked/hidden pairs and pointing/claiming (box-line reduction).
- **Hard**: Adds naked/hidden triples, X-Wing, and Y-Wing.
- **Expert**: Requires advanced techniques (Swordfish, XY-Chains, and complex elimination).

### 3. Scoring Formula
Implemented as a pure function in `/src/logic/scoring.ts`:

$$\text{Score} = \max\left(\lfloor 0.2 \times \text{Base}\rfloor,\, \text{Base} - \lfloor \frac{\text{seconds}}{5} \rfloor - 25 \times \text{hintsUsed} - 10 \times \text{mistakes}\right)$$

Base values:
- Easy: 100
- Medium: 200
- Hard: 350
- Expert: 500

Daily score = Sum of scores of all games completed on that calendar day (local time).

### 4. Daily Streak Calculation
- A day counts toward the streak when $\ge 1$ game is completed that day (local time).
- If a day passes with no completed game, the streak resets to 0 on the next day.
- If the player has not yet completed a game today but completed one yesterday, the streak remains intact from yesterday until the day ends.
- Best streak is tracked across all historical records.

### 5. Number Pad Rule
The 1–9 number pad buttons always remain visible, enabled, and visually identical, even when a digit has been placed 9 times. No remaining counts or dimming are shown, preserving deduction integrity.

---

## Unit Testing
The logic engine contains unit tests covering all rules using Node's test runner:

```bash
npx --yes tsx --test src/logic/logic.test.ts
```
