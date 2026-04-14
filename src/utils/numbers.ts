import { Question } from '../types';

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

export function numberToFrench(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 10) return UNITS[n];
  if (n >= 10 && n < 20) return TEENS[n - 10];
  
  if (n < 70) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return TENS[ten];
    if (unit === 1) return `${TENS[ten]}-et-un`;
    return `${TENS[ten]}-${UNITS[unit]}`;
  }
  
  if (n < 80) {
    const unit = n % 10;
    if (unit === 1) return `soixante-et-onze`;
    return `soixante-${TEENS[unit]}`;
  }
  
  if (n < 90) {
    const unit = n % 10;
    if (unit === 0) return `quatre-vingts`;
    return `quatre-vingt-${UNITS[unit]}`;
  }
  
  if (n < 100) {
    const unit = n % 10;
    return `quatre-vingt-${TEENS[unit]}`;
  }
  
  if (n < 1000) {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    const hundredStr = hundred === 1 ? 'cent' : `${UNITS[hundred]}-cents`;
    if (remainder === 0) return hundredStr;
    return `${hundredStr.replace('cents', 'cent')}-${numberToFrench(remainder)}`;
  }
  
  return n.toString();
}

export function generateNumberQuestions(range: '1-digit' | '2-digits' | '3-digits', count: number = 10): Question[] {
  const questions: Question[] = [];
  const usedNumbers = new Set<number>();
  
  let min = 0;
  let max = 9;
  if (range === '2-digits') { min = 10; max = 99; }
  if (range === '3-digits') { min = 100; max = 999; }
  
  while (questions.length < count) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (usedNumbers.has(n)) continue;
    usedNumbers.add(n);
    
    const correct = numberToFrench(n);
    const options = [correct];
    
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrongN = Math.max(min, Math.min(max, n + offset));
      const wrong = numberToFrench(wrongN);
      if (!options.includes(wrong)) {
        options.push(wrong);
      }
    }
    
    questions.push({
      id: `num-${n}-${Date.now()}`,
      type: 'nombres',
      sentence: `Comment écrit-on le nombre ${n} ?`,
      correctAnswer: correct,
      options: options.sort(() => Math.random() - 0.5),
      numberValue: n
    });
  }
  
  return questions;
}
