/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw, 
  Trophy,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Rocket,
  Timer,
  Settings as SettingsIcon,
  Check,
  Hash,
  LayoutGrid,
  Flame,
  Award,
  BarChart3,
  ChevronLeft,
  Home,
  X
} from 'lucide-react';
import { QUIZ_QUESTIONS } from './constants';
import { QuizState, VerbCategory, QuizMode, Question, MasteryItem } from './types';
import { generateNumberQuestions } from './utils/numbers';
import { playSound } from './utils/audio';

const CATEGORIES: VerbCategory[] = ['être', 'avoir', 'aller', 'faire', 'dire', 'venir', '1er groupe'];
const MASTERY_THRESHOLD = 3;

export default function App() {
  const [state, setState] = useState<QuizState>(() => {
    const savedMastery = localStorage.getItem('mastery');
    return {
      currentQuestionIndex: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      status: 'start',
      answers: [],
      settings: {
        mode: 'conjugaison',
        selectedCategories: [...CATEGORIES],
        numberRange: '1-digit',
      },
      startTime: null,
      endTime: null,
      lastAnswerCorrect: null,
      mastery: savedMastery ? JSON.parse(savedMastery) : {},
      failedQuestionIds: [],
    };
  });

  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  useEffect(() => {
    localStorage.setItem('mastery', JSON.stringify(state.mastery));
  }, [state.mastery]);

  const activeQuestions = useMemo(() => {
    let questions: Question[] = [];
    if (state.settings.mode === 'conjugaison') {
      questions = QUIZ_QUESTIONS.filter(q => 
        q.type === 'conjugaison' && q.category && state.settings.selectedCategories.includes(q.category)
      );
    } else if (state.settings.mode === 'grammaire') {
      questions = QUIZ_QUESTIONS.filter(q => q.type === 'grammaire');
    } else {
      questions = generatedQuestions;
    }
    return questions.sort(() => Math.random() - 0.5);
  }, [state.settings.mode, state.settings.selectedCategories, generatedQuestions]);

  const currentQuestion = useMemo(() => {
    // If we have failed questions to repeat, prioritize them occasionally or at the end
    // For simplicity, we'll just use the activeQuestions list
    return activeQuestions[state.currentQuestionIndex];
  }, [activeQuestions, state.currentQuestionIndex]);

  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state.status === 'playing') {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoToModeSelect = () => {
    setState(prev => ({ ...prev, status: 'mode-select' }));
  };

  const handleSelectMode = (mode: QuizMode) => {
    setState(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, mode },
      status: 'settings' 
    }));
  };

  const toggleCategory = (cat: VerbCategory) => {
    setState(prev => {
      const current = prev.settings.selectedCategories;
      const next = current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat];
      if (next.length === 0) return prev;
      return {
        ...prev,
        settings: { ...prev.settings, selectedCategories: next }
      };
    });
  };

  const setNumberRange = (range: '1-digit' | '2-digits' | '3-digits') => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, numberRange: range }
    }));
  };

  const handleStart = () => {
    playSound('start');
    if (state.settings.mode === 'nombres') {
      setGeneratedQuestions(generateNumberQuestions(state.settings.numberRange));
    }
    
    setState(prev => ({
      ...prev,
      currentQuestionIndex: 0,
      score: 0,
      combo: 0,
      status: 'playing',
      answers: [],
      startTime: Date.now(),
      endTime: null,
      lastAnswerCorrect: null,
      failedQuestionIds: [],
    }));
    setCurrentTime(0);
  };

  const handleAnswer = (selectedAnswer: string) => {
    if (state.status === 'feedback') return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) playSound('correct');
    else playSound('incorrect');

    const masteryKey = currentQuestion.type === 'conjugaison' 
      ? `${currentQuestion.verb}-${currentQuestion.tense}-${currentQuestion.pronoun}`
      : currentQuestion.type === 'grammaire'
        ? `${currentQuestion.sentence}`
        : `${currentQuestion.numberValue}`;

    const currentMastery = state.mastery[masteryKey] || { key: masteryKey, correctCount: 0, totalSeen: 0 };
    
    const newMastery: MasteryItem = {
      ...currentMastery,
      totalSeen: currentMastery.totalSeen + 1,
      correctCount: isCorrect ? currentMastery.correctCount + 1 : currentMastery.correctCount,
    };

    const newAnswers = [
      ...state.answers,
      { questionId: currentQuestion.id, selectedAnswer, isCorrect }
    ];
    
    setState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      combo: isCorrect ? prev.combo + 1 : 0,
      maxCombo: Math.max(prev.maxCombo, isCorrect ? prev.combo + 1 : 0),
      answers: newAnswers,
      lastAnswerCorrect: isCorrect,
      status: 'feedback',
      mastery: { ...prev.mastery, [masteryKey]: newMastery },
      failedQuestionIds: isCorrect ? prev.failedQuestionIds : [...prev.failedQuestionIds, currentQuestion.id],
    }));

    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    setState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      const isFinished = nextIndex >= activeQuestions.length;

      if (isFinished) {
        // If we have failed questions, we could repeat them here
        // For now, let's just finish
        playSound('finish');
        return {
          ...prev,
          status: 'finished',
          endTime: Date.now(),
        };
      } else {
        return {
          ...prev,
          currentQuestionIndex: nextIndex,
          status: 'playing',
          lastAnswerCorrect: null,
        };
      }
    });
  };

  const handleRestart = () => {
    setState(prev => ({ ...prev, status: 'start' }));
  };

  const handleBackToModeSelect = () => {
    setState(prev => ({ ...prev, status: 'mode-select' }));
  };

  const handleQuitGame = () => {
    if (window.confirm('Veux-tu vraiment quitter la mission en cours ?')) {
      setState(prev => ({ ...prev, status: 'start' }));
    }
  };

  const showProgress = () => {
    setState(prev => ({ ...prev, status: 'progress' }));
  };

  return (
    <div className="fixed inset-0 bg-app-bg flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      {/* Header */}
      {(state.status === 'playing' || state.status === 'feedback') && (
        <div className="absolute top-4 w-full max-w-3xl px-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleQuitGame}
              className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-app-light hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-full shadow-sm border border-slate-100">
              <Timer size={14} className="text-app-primary" />
              <span className="text-xs font-bold text-app-dark">{formatTime(currentTime)}</span>
            </div>
            {state.combo > 1 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full border border-orange-200"
              >
                <Flame size={14} className="text-orange-500" />
                <span className="text-xs font-bold text-orange-600">x{state.combo}</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end ml-4">
            <div className="flex-1 max-w-[150px] h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-app-success"
                initial={{ width: 0 }}
                animate={{ width: `${((state.currentQuestionIndex) / activeQuestions.length) * 100}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-app-light whitespace-nowrap">
              {state.currentQuestionIndex + 1} / {activeQuestions.length}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl h-full flex flex-col justify-center py-12">
        <AnimatePresence mode="wait">
          {state.status === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="quiz-card p-8 md:p-16 text-center space-y-8"
            >
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-white to-red-600 rounded-full opacity-20 blur-xl animate-pulse" />
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-100 overflow-hidden"
                >
                  <div className="absolute inset-0 flex">
                    <div className="w-1/3 h-full bg-blue-600 opacity-10" />
                    <div className="w-1/3 h-full bg-white" />
                    <div className="w-1/3 h-full bg-red-600 opacity-10" />
                  </div>
                  <Rocket size={40} className="text-app-primary relative z-10" />
                </motion.div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-app-primary">
                  Mission Français
                </h1>
                <p className="text-lg text-app-light max-w-md mx-auto font-medium">
                  Apprends le français en t'amusant !
                </p>
              </div>
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={handleGoToModeSelect}
                  className="w-full max-w-xs py-4 font-bold text-white bg-app-primary rounded-2xl hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-app-primary/20 flex items-center justify-center gap-2"
                >
                  <Rocket size={20} />
                  Choisir une Mission
                </button>
                <button
                  onClick={showProgress}
                  className="w-full max-w-xs py-4 font-bold text-app-primary bg-white border-2 border-app-primary rounded-2xl hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <BarChart3 size={20} />
                  Ma Progression
                </button>
              </div>
            </motion.div>
          )}

          {state.status === 'mode-select' && (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="quiz-card p-6 md:p-16 text-center space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={handleRestart}
                  className="p-2 hover:bg-slate-100 rounded-full text-app-light transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-app-dark">Choisis ta mission</h2>
                <div className="w-10" /> {/* Spacer */}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSelectMode('conjugaison')}
                  className="p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-app-primary hover:bg-blue-50 transition-all text-center space-y-2 group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto text-app-primary group-hover:scale-110 transition-transform">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-app-dark">Conjugaison</h3>
                </button>
                <button
                  onClick={() => handleSelectMode('nombres')}
                  className="p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-app-primary hover:bg-blue-50 transition-all text-center space-y-2 group"
                >
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto text-app-accent group-hover:scale-110 transition-transform">
                    <Hash size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-app-dark">Nombres</h3>
                </button>
                <button
                  onClick={() => handleSelectMode('grammaire')}
                  className="p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-app-primary hover:bg-blue-50 transition-all text-center space-y-2 group"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto text-purple-600 group-hover:scale-110 transition-transform">
                    <LayoutGrid size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-app-dark">Grammaire</h3>
                </button>
              </div>
            </motion.div>
          )}

          {state.status === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="quiz-card p-6 md:p-14 space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={handleBackToModeSelect}
                  className="p-2 hover:bg-slate-100 rounded-full text-app-light transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-app-dark">Réglages</h2>
                  <p className="text-app-light text-xs font-medium">
                    {state.settings.mode === 'conjugaison' ? 'Choisis les verbes :' : 
                     state.settings.mode === 'grammaire' ? 'Prêt pour la grammaire ?' : 'Choisis la difficulté :'}
                  </p>
                </div>
                <button 
                  onClick={handleRestart}
                  className="p-2 hover:bg-slate-100 rounded-full text-app-light transition-colors"
                >
                  <Home size={20} />
                </button>
              </div>

              {state.settings.mode === 'conjugaison' ? (
                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-1 custom-scrollbar">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between text-sm ${
                        state.settings.selectedCategories.includes(cat)
                          ? 'border-app-primary bg-blue-50 text-app-primary'
                          : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      <span className="font-bold capitalize">{cat}</span>
                      {state.settings.selectedCategories.includes(cat) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              ) : state.settings.mode === 'nombres' ? (
                <div className="grid grid-cols-1 gap-3">
                  {(['1-digit', '2-digits', '3-digits'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setNumberRange(range)}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        state.settings.numberRange === range
                          ? 'border-app-primary bg-blue-50 text-app-primary'
                          : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xl font-bold">
                          {range === '1-digit' ? '0-9' : range === '2-digits' ? '10-99' : '100-999'}
                        </span>
                      </div>
                      {state.settings.numberRange === range && <Check size={20} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-purple-50 rounded-2xl text-center">
                  <p className="text-purple-700 font-medium">Genre (Masculin/Féminin) et Nombre (Singulier/Pluriel)</p>
                </div>
              )}

              <div className="pt-4 flex justify-center">
                <button
                  onClick={handleStart}
                  className="w-full py-4 bg-app-primary text-white font-bold rounded-2xl hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-app-primary/20"
                >
                  C'est parti !
                </button>
              </div>
            </motion.div>
          )}

          {(state.status === 'playing' || state.status === 'feedback') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="quiz-card p-6 md:p-16 space-y-6 text-center flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="inline-block bg-app-badge px-3 py-1 rounded-lg text-[10px] font-bold text-app-dark uppercase tracking-wide">
                  {state.settings.mode === 'conjugaison' 
                    ? `${currentQuestion.verb?.toUpperCase()} (${currentQuestion.tense})`
                    : state.settings.mode === 'grammaire'
                      ? `GRAMMAIRE (${currentQuestion.grammarType})`
                      : `NOMBRES`
                  }
                </div>
                
                <h2 className="text-3xl md:text-5xl font-bold text-app-dark leading-tight">
                  {state.settings.mode === 'conjugaison' ? (
                    currentQuestion.sentence.split('___').map((part, i) => (
                      <span key={i}>
                        {part}
                        {i === 0 && (
                          <span className={`inline-block min-w-[100px] border-b-2 mx-2 transition-colors ${
                            state.status === 'feedback' 
                              ? state.lastAnswerCorrect 
                                ? 'border-app-success text-app-success' 
                                : 'border-red-500 text-red-500'
                              : 'border-app-primary text-app-primary'
                          }`}>
                            {state.status === 'feedback' ? state.answers[state.answers.length - 1].selectedAnswer : '?'}
                          </span>
                        )}
                      </span>
                    ))
                  ) : state.settings.mode === 'nombres' ? (
                    <div className="text-6xl font-black text-app-primary bg-slate-50 py-4 rounded-2xl border-2 border-slate-100 inline-block px-8">
                      {currentQuestion.numberValue}
                    </div>
                  ) : (
                    currentQuestion.sentence
                  )}
                </h2>
              </div>

              <div className={`grid grid-cols-1 gap-3 ${currentQuestion.options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                {currentQuestion.options.map((option) => {
                  const isSelected = state.status === 'feedback' && state.answers[state.answers.length - 1].selectedAnswer === option;
                  const isCorrect = state.status === 'feedback' && currentQuestion.correctAnswer === option;
                  return (
                    <button
                      key={option}
                      disabled={state.status === 'feedback'}
                      onClick={() => handleAnswer(option)}
                      className={`group relative p-4 text-center border-2 rounded-xl transition-all duration-200 ${
                        state.status === 'feedback'
                          ? isCorrect
                            ? 'border-app-success bg-green-50 text-app-success'
                            : isSelected
                              ? 'border-red-500 bg-red-50 text-red-500'
                              : 'border-slate-100 bg-white opacity-50'
                          : 'bg-[#F8F9FA] border-[#EEEEEE] active:scale-[0.96]'
                      }`}
                    >
                      <span className="text-xl font-bold">{option}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {state.status === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="quiz-card p-8 md:p-16 text-center space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="text-4xl">🏆</div>
              <h2 className="text-3xl font-bold text-app-dark tracking-tight">Mission Accomplie !</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-app-primary">{state.score}</div>
                  <div className="text-[8px] font-bold text-app-light uppercase tracking-widest mt-1">Correct</div>
                </div>
                <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-app-primary">{state.maxCombo}</div>
                  <div className="text-[8px] font-bold text-app-light uppercase tracking-widest mt-1">Combo Max</div>
                </div>
                <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-app-primary">{Math.round((state.score / activeQuestions.length) * 100)}%</div>
                  <div className="text-[8px] font-bold text-app-light uppercase tracking-widest mt-1">Précision</div>
                </div>
              </div>
              <button
                onClick={handleRestart}
                className="w-full py-4 font-bold text-white bg-app-primary rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-app-primary/20 flex items-center justify-center"
              >
                <RotateCcw className="mr-2" size={18} />
                Recommencer
              </button>
            </motion.div>
          )}

          {state.status === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="quiz-card p-6 md:p-12 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={handleRestart}
                  className="p-2 hover:bg-slate-100 rounded-full text-app-light transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-app-dark">Ma Progression</h2>
                <button 
                  onClick={handleRestart}
                  className="p-2 hover:bg-slate-100 rounded-full text-app-light transition-colors"
                >
                  <Home size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {Object.values(state.mastery).length === 0 ? (
                  <p className="text-center text-app-light py-10">Commence une mission pour voir ta progression !</p>
                ) : (
                  (Object.values(state.mastery) as MasteryItem[]).sort((a, b) => b.correctCount - a.correctCount).map((item) => {
                    const progress = (item.correctCount / MASTERY_THRESHOLD) * 100;
                    const isMastered = item.correctCount >= MASTERY_THRESHOLD;
                    return (
                      <div key={item.key} className="p-4 bg-white border border-slate-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-app-dark capitalize">{item.key.replace(/-/g, ' ')}</span>
                          {isMastered && <Award className="text-yellow-500" size={18} />}
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isMastered ? 'bg-app-success' : 'bg-app-primary'}`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-app-light font-bold uppercase tracking-wider">
                          {item.correctCount} / {MASTERY_THRESHOLD} réussites
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
