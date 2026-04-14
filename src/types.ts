export type Tense = 'présent' | 'passé composé' | 'futur proche';

export type VerbCategory = 'être' | 'avoir' | 'aller' | 'faire' | 'dire' | 'venir' | '1er groupe';

export type QuizMode = 'conjugaison' | 'nombres' | 'grammaire';

export interface Question {
  id: string;
  type: QuizMode;
  verb?: string;
  category?: VerbCategory;
  pronoun?: string;
  tense?: Tense;
  sentence: string;
  correctAnswer: string;
  options: string[];
  numberValue?: number;
  grammarType?: 'genre' | 'nombre';
}

export interface QuizSettings {
  mode: QuizMode;
  selectedCategories: VerbCategory[];
  numberRange: '1-digit' | '2-digits' | '3-digits';
}

export interface MasteryItem {
  key: string; // e.g., "être-présent-je" or "42" or "chat-genre"
  correctCount: number;
  totalSeen: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  status: 'start' | 'mode-select' | 'settings' | 'playing' | 'feedback' | 'finished' | 'progress';
  answers: { questionId: string; selectedAnswer: string; isCorrect: boolean }[];
  settings: QuizSettings;
  startTime: number | null;
  endTime: number | null;
  lastAnswerCorrect: boolean | null;
  mastery: Record<string, MasteryItem>;
  failedQuestionIds: string[];
}
