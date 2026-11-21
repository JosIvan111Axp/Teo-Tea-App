// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
  };
};

// jsdom no implementa la reproducción de audio: se simula para las pruebas.
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { configurable: true, value: () => undefined });
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(window.HTMLMediaElement.prototype, 'load', { configurable: true, value: () => undefined });
