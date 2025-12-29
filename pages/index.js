import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/styles/Home.module.css";

const scriptIdeas = [
  {
    title: "Morning Adventure",
    body: "“Good morning, Super Explorer! The sun is peeking over Rainbow Ridge and the giggle-birds are chirping hello. Stretch your arms wide, wriggle your toes, and get ready for a sparkle-bright day!”"
  },
  {
    title: "Space Bounce",
    body: "“Put on your moon boots! We’re floating past the marshmallow clouds of planet Puffy-Puff. Bouncy beats keep our spaceship dancing, and every star we pass pops with a happy little ping!”"
  },
  {
    title: "Underwater Parade",
    body: "“Splash into Seafoam City where the jellyfish twirl ribbons of light. The bubble drums go ‘boop-boop’ as we march with our dolphin friends. Wave your fins—it’s parade time!”"
  },
  {
    title: "Dreamy Wind-Down",
    body: "“Close your eyes and drift with the sleepy fireflies. Their glow hums a gentle lullaby while clouds of cotton-candy snowflakes tuck us into the coziest cloudbed.”"
  }
];

const warmUps = [
  "Bubble hums: blow a silent bubble while humming up and down the scale.",
  "Puppet smiles: big grin, relax, repeat—loosen cheeks for rounder vowels.",
  "Rainbow vowels: “Ah-Ee-Ay-Oh-Oo” like you’re painting colors across the sky.",
  "Soft drum beat taps on your chest to feel rhythm while you speak."
];

function useMusicPad() {
  const musicRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (isPlaying) {
      return;
    }

    const AudioContextRef = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextRef) {
      setIsSupported(false);
      return;
    }

    const context = musicRef.current?.context ?? new AudioContextRef();

    if (context.state === "suspended") {
      await context.resume();
    }

    const masterGain = context.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(context.destination);

    const bpm = 92;
    const beatInterval = (60 / bpm) * 1000;
    const stepDivision = 2;
    const stepInterval = beatInterval / stepDivision;

    const trackDefinitions = [
      {
        type: "pad",
        baseGain: 0.22,
        waveform: "sine",
        pattern: [1, 0.6, 0, 0.6],
        notes: [261.63, 329.63, 392]
      },
      {
        type: "sparkle",
        baseGain: 0.12,
        waveform: "triangle",
        pattern: [0, 1, 0, 1, 0, 0, 1, 0],
        notes: [523.25, 659.25, 783.99, 659.25]
      },
      {
        type: "bass",
        baseGain: 0.28,
        waveform: "square",
        pattern: [1, 0, 1, 0, 0, 1, 0, 0],
        notes: [130.81]
      }
    ];

    const tracks = trackDefinitions.map((definition) => {
      const oscillators = definition.notes.map((frequency) => {
        const gain = context.createGain();
        gain.gain.value = 0.0001;
        gain.connect(masterGain);

        const oscillator = context.createOscillator();
        oscillator.type = definition.waveform;
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();

        return { gain, oscillator };
      });

      return {
        ...definition,
        oscillators
      };
    });

    const pulseGain = context.createGain();
    pulseGain.gain.value = 0.0001;
    pulseGain.connect(masterGain);

    const pulseOsc = context.createOscillator();
    pulseOsc.type = "sawtooth";
    pulseOsc.frequency.value = 45;
    pulseOsc.connect(pulseGain);
    pulseOsc.start();

    let stepIndex = 0;
    const intervalId = setInterval(() => {
      const now = context.currentTime;
      tracks.forEach((track) => {
        const strength = track.pattern[stepIndex % track.pattern.length];
        track.oscillators.forEach((oscillatorNode, idx) => {
          const intensity = strength ? track.baseGain * strength : 0.0001;
          oscillatorNode.gain.gain.cancelScheduledValues(now);
          oscillatorNode.gain.gain.setTargetAtTime(intensity, now, 0.09);

          if (track.type === "sparkle") {
            const vibrato = Math.sin((stepIndex + idx) * 0.9) * 3;
            oscillatorNode.oscillator.frequency.setValueAtTime(track.notes[idx], now);
            oscillatorNode.oscillator.frequency.exponentialRampToValueAtTime(
              track.notes[idx] + vibrato,
              now + 0.22
            );
          }
        });
      });

      const pulseStrength = stepIndex % 4 === 0 ? 0.2 : 0.05;
      pulseGain.gain.cancelScheduledValues(now);
      pulseGain.gain.setTargetAtTime(pulseStrength, now, 0.03);
      pulseGain.gain.setTargetAtTime(0.0001, now + 0.12, 0.08);

      stepIndex += 1;
    }, stepInterval);

    musicRef.current = {
      context,
      masterGain,
      pulseGain,
      pulseOsc,
      tracks,
      intervalId
    };

    setIsPlaying(true);
  };

  const stop = () => {
    const music = musicRef.current;
    if (!music) {
      setIsPlaying(false);
      return;
    }

    const { context, masterGain, pulseGain, pulseOsc, tracks, intervalId } = music;

    if (intervalId) {
      clearInterval(intervalId);
    }

    const now = context.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(0.0001, now, 0.12);

    tracks.forEach((track) => {
      track.oscillators.forEach(({ gain, oscillator }) => {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.1);
        oscillator.stop(now + 0.3);
      });
    });

    pulseGain.gain.cancelScheduledValues(now);
    pulseGain.gain.setTargetAtTime(0.0001, now, 0.08);
    pulseOsc.stop(now + 0.3);

    setTimeout(() => {
      masterGain.disconnect();
      pulseGain.disconnect();
      tracks.forEach((track) => {
        track.oscillators.forEach(({ gain }) => gain.disconnect());
      });
      context.close().catch(() => {});
      musicRef.current = null;
    }, 450);

    setIsPlaying(false);
  };

  return {
    isPlaying,
    isSupported,
    start,
    stop
  };
}

export default function Home() {
  const [recordingState, setRecordingState] = useState("idle");
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordingError, setRecordingError] = useState(null);
  const [isMediaSupported, setIsMediaSupported] = useState(true);
  const [downloadName, setDownloadName] = useState("kids-music-voice-over.webm");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const music = useMusicPad();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStartRecording = async () => {
    if (recordingState === "recording") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setIsMediaSupported(false);
      setRecordingError("Your browser does not support microphone recording.");
      return;
    }

    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = { recorder, stream };
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        setRecordingError(event.error?.message ?? "Recording error occurred.");
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        setDownloadName(`kids-voice-over-${timestamp}.webm`);
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setRecordingState("ready");
      };

      recorder.start();
      setRecordedUrl(null);
      setRecordingState("recording");
    } catch (error) {
      setRecordingError(error.message ?? "We could not access your microphone.");
      setIsMediaSupported(false);
    }
  };

  const handleStopRecording = () => {
    if (recordingState !== "recording") {
      return;
    }

    const recorder = mediaRecorderRef.current?.recorder;
    if (!recorder) {
      return;
    }

    recorder.stop();
    setRecordingState("processing");
  };

  const handleResetRecording = () => {
    setRecordedUrl(null);
    setRecordingError(null);
    setRecordingState("idle");
  };

  const recordingLabel = useMemo(() => {
    switch (recordingState) {
      case "recording":
        return "Recording… tap stop when you’re ready!";
      case "processing":
        return "Wrapping up your take…";
      case "ready":
        return "Ready to play back or download!";
      default:
        return "Microphone is standing by.";
    }
  }, [recordingState]);

  return (
    <>
      <Head>
        <title>Kids Music Voice Over Studio</title>
        <meta
          name="description"
          content="Create joyful kids voice overs with playful backing music, scripts, and recording tools."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={styles.page}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Kids Music Voice Over Studio</h1>
          <p className={styles.heroLead}>
            Craft imaginative stories, layer them with a gentle musical pad, and record playful voice overs that sparkle with
            kid-friendly energy.
          </p>
          <div className={styles.ctaGroup}>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={music.isPlaying ? music.stop : music.start}
              disabled={!music.isSupported}
            >
              {music.isPlaying ? "Stop Magical Music" : "Play Magical Music"}
            </button>
            <button
              type="button"
              className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}
              onClick={recordingState === "recording" ? handleStopRecording : handleStartRecording}
              disabled={!isMediaSupported || recordingState === "processing"}
            >
              {recordingState === "recording" ? "Stop Recording" : "Record Your Voice"}
            </button>
          </div>
          <p className={styles.tagline}>
            Mix the music with your performance by speaking while the backing track plays. Keep your delivery smiley, rhythmic,
            and full of wonder.
          </p>
        </section>

        <section className={styles.section}>
          <span className={styles.statusBubble}>{recordingLabel}</span>
          {recordingError ? <div className={styles.warning}>{recordingError}</div> : null}
          <div className={styles.waveform} aria-hidden="true" />
          <div className={styles.audioControls}>
            {recordedUrl ? (
              <>
                <audio className={styles.audioPlayer} src={recordedUrl} controls />
                <a className={styles.ctaButton} download={downloadName} href={recordedUrl}>
                  Download Take
                </a>
                <button type="button" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`} onClick={handleResetRecording}>
                  Reset
                </button>
              </>
            ) : (
              <p className={styles.tagline}>
                Tip: Keep the mic 15 cm from your mouth, speak with a smile, and use gestures even when unseen—they add sparkle to
                your voice!
              </p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Script Prompts</h2>
          <div className={styles.promptGrid}>
            {scriptIdeas.map((prompt) => (
              <article key={prompt.title} className={styles.promptCard}>
                <h3 className={styles.promptTitle}>{prompt.title}</h3>
                <p className={styles.promptBody}>{prompt.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Warm-Up Ritual</h2>
          <ul className={styles.tipsList}>
            {warmUps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.tagline}>
            Keep takes short and energetic. Layer multiple takes to capture the perfect mix of sparkle, clarity, and rhythm.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Production Magic Tips</h2>
          <ul className={styles.tipsList}>
            <li>
              Record a room tone of 10 seconds after each take—use it to smooth edits and keep background sounds consistent.
            </li>
              <li>Stack a whisper track underneath your main performance to add airy sparkle without raising volume.</li>
            <li>
              When mixing, duck the backing music by 4–6 dB whenever you speak so your storytelling shines through the melody.
            </li>
            <li>Close with a smile you can feel—it keeps the last syllable bright and friendly for young listeners.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
