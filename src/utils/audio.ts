const AUDIO_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  start: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  finish: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
};

export function playSound(type: keyof typeof AUDIO_URLS) {
  const audio = new Audio(AUDIO_URLS[type]);
  audio.volume = 0.4;
  audio.play().catch(e => console.log('Audio play blocked', e));
}
