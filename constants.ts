
import { Language, Scenario } from './types';

export const LANGUAGES: Language[] = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'casual',
    title: 'Casual Chat',
    description: 'General friendly conversation to build confidence.',
    icon: '💬',
    instruction: 'Act as a friendly local friend. Keep sentences natural and varied.'
  },
  {
    id: 'restaurant',
    title: 'Ordering Coffee',
    description: 'Practice ordering at a local cafe or restaurant.',
    icon: '☕',
    instruction: 'Act as a busy but polite barista. Use common industry phrases.'
  },
  {
    id: 'travel',
    title: 'Airport Check-in',
    description: 'Navigate travel situations and luggage issues.',
    icon: '✈️',
    instruction: 'Act as an airline counter agent. Ask about passport and luggage.'
  },
  {
    id: 'business',
    title: 'Job Interview',
    description: 'Formal professional practice for career growth.',
    icon: '💼',
    instruction: 'Act as a professional hiring manager. Ask about experience and skills.'
  }
];
