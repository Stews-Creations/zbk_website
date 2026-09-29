import latestShort from './latest-short.json';
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const images = {
  de: 'de-castle', courtyard: 'de-courtyard', crypt: 'de-undercroft', deSign: 'de-sign',
  nacht: 'nacht-exterior', interior: 'nacht-interior', lobby: 'nacht-lobby',
};
export const videos = [
  { ...latestShort, label: 'DEVELOPMENT SHORT', map: 'de', platform: 'YouTube Shorts', vertical: true, image: images.courtyard, start: 0 },
  { id: 'vloxgEYfgbU', title: 'Step inside Nacht der Untoten.', label: 'MAP SHOWCASE', map: 'nacht', platform: 'YouTube', vertical: false, image: images.nacht, href: 'https://www.youtube.com/watch?v=vloxgEYfgbU', start: 0 },
];
