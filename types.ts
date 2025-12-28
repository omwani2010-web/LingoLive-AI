
export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  instruction: string;
}

export interface TranscriptionEntry {
  id: string;
  type: 'user' | 'model';
  text: string;
  timestamp: number;
}
