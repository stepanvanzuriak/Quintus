"use strict";
(() => {
  // lib/quintus_audio.js
  var quintusAudio = function(Quintus) {
    Quintus.Audio = function(Q) {
      Q.audio = {
        channels: [],
        channelMax: Q.options.channelMax || 10,
        active: {},
        play() {
        }
      };
      Q.hasWebAudio = typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined";
      if (Q.hasWebAudio) {
        if (typeof AudioContext !== "undefined") {
          Q.audioContext = new AudioContext();
        } else {
          Q.audioContext = new window.webkitAudioContext();
        }
      }
      Q.enableSound = function() {
        const hasTouch = typeof window !== "undefined" && !!("ontouchstart" in window);
        if (Q.hasWebAudio) {
          Q.audio.enableWebAudioSound();
        } else {
          Q.audio.enableHTML5Sound();
        }
        return Q;
      };
      Q.audio.enableWebAudioSound = function() {
        Q.audio.type = "WebAudio";
        Q.audio.soundID = 0;
        Q.audio.playingSounds = {};
        Q.audio.removeSound = function(soundID) {
          delete Q.audio.playingSounds[soundID];
        };
        Q.audio.play = function(s, options) {
          const now = (/* @__PURE__ */ new Date()).getTime();
          if (Q.audio.active[s] && Q.audio.active[s] > now) {
            return;
          }
          if (options && options.debounce) {
            Q.audio.active[s] = now + options.debounce;
          } else {
            delete Q.audio.active[s];
          }
          const soundID = Q.audio.soundID++;
          const source = Q.audioContext.createBufferSource();
          source.buffer = Q.asset(s);
          source.connect(Q.audioContext.destination);
          if (options && options.loop) {
            source.loop = true;
          } else {
            setTimeout(() => {
              Q.audio.removeSound(soundID);
            }, source.buffer.duration * 1e3);
          }
          source.assetName = s;
          if (source.start) {
            source.start(0);
          } else {
            source.noteOn(0);
          }
          Q.audio.playingSounds[soundID] = source;
        };
        Q.audio.stop = function(s) {
          for (const key in Q.audio.playingSounds) {
            const snd = Q.audio.playingSounds[key];
            if (!s || s === snd.assetName) {
              if (snd.stop) {
                snd.stop(0);
              } else {
                snd.noteOff(0);
              }
            }
          }
        };
      };
      Q.audio.enableHTML5Sound = function() {
        Q.audio.type = "HTML5";
        for (let i = 0; i < Q.audio.channelMax; i++) {
          Q.audio.channels[i] = {};
          Q.audio.channels[i].channel = new Audio();
          Q.audio.channels[i].finished = -1;
        }
        Q.audio.play = function(s, options) {
          const now = (/* @__PURE__ */ new Date()).getTime();
          if (Q.audio.active[s] && Q.audio.active[s] > now) {
            return;
          }
          if (options && options.debounce) {
            Q.audio.active[s] = now + options.debounce;
          } else {
            delete Q.audio.active[s];
          }
          for (let i = 0; i < Q.audio.channels.length; i++) {
            if (!Q.audio.channels[i].loop && Q.audio.channels[i].finished < now) {
              Q.audio.channels[i].channel.src = Q.asset(s).src;
              if (options && options.loop) {
                Q.audio.channels[i].loop = true;
                Q.audio.channels[i].channel.loop = true;
              } else {
                Q.audio.channels[i].finished = now + Q.asset(s).duration * 1e3;
              }
              Q.audio.channels[i].channel.load();
              Q.audio.channels[i].channel.play();
              break;
            }
          }
        };
        Q.audio.stop = function(s) {
          const src = s ? Q.asset(s).src : null;
          const tm = (/* @__PURE__ */ new Date()).getTime();
          for (let i = 0; i < Q.audio.channels.length; i++) {
            if ((!src || Q.audio.channels[i].channel.src === src) && (Q.audio.channels[i].loop || Q.audio.channels[i].finished >= tm)) {
              Q.audio.channels[i].channel.pause();
              Q.audio.channels[i].loop = false;
            }
          }
        };
      };
    };
  };
  if (window.Quintus) {
    quintusAudio(window.Quintus);
  }
  var quintus_audio_default = quintusAudio;
})();
