import { useState, useEffect, useRef } from "react";

type TimerMode = "WORK" | "BREAK";

export default function PomodoroWidget() {
  const [mode, setMode] = useState<TimerMode>("WORK");
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [customWorkMin, setCustomWorkMin] = useState<number>(25);
  const [customBreakMin, setCustomBreakMin] = useState<number>(5);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const totalSeconds = mode === "WORK" ? customWorkMin * 60 : customBreakMin * 60;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize timer duration changes cleanly when values or modes alter
  useEffect(() => {
    if (!isActive) {
      setSecondsLeft(mode === "WORK" ? customWorkMin * 60 : customBreakMin * 60);
    }
  }, [customWorkMin, customBreakMin, mode]);

  // Unified core ticker countdown loops mechanism
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            triggerCompletionNotification();
            // Automatically switch modes upon completion state transition
            setMode((oldMode) => (oldMode === "WORK" ? "BREAK" : "WORK"));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(mode === "WORK" ? customWorkMin * 60 : customBreakMin * 60);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setSecondsLeft(newMode === "WORK" ? customWorkMin * 60 : customBreakMin * 60);
  };

  const triggerCompletionNotification = () => {
    // Subtle non-intrusive HTML5 Web Audio API synthesization mapping context without forbidden 'any'
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 high tone hint note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Web Audio alert synthesized hint skipped block:", e);
    }

    if (Notification.permission === "granted") {
      new Notification(`${mode === "WORK" ? "Work Session" : "Break Session"} Concluded!`, {
        body: mode === "WORK" ? "Time to take a well-deserved short break!" : "Ready to jump back into hyper-focus work session?",
      });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Structural SVG circle stroke computation mapping properties
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalSeconds > 0 ? circumference - (secondsLeft / totalSeconds) * circumference : circumference;

  const formatTime = (totalSecs: number): string => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm max-w-sm w-full transition-all">
      <div className="flex items-center gap-2 mb-4 w-full justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Focus Session</h3>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-blue-500 hover:underline focus:outline-none"
        >
          {showSettings ? "Close Config" : "Settings"}
        </button>
      </div>

      {showSettings ? (
        <div className="flex flex-col gap-3 w-full my-6 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400">Work Duration (m):</span>
            <input 
              type="number" 
              value={customWorkMin} 
              onChange={(e) => setCustomWorkMin(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded text-center focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400">Break Duration (m):</span>
            <input 
              type="number" 
              value={customBreakMin} 
              onChange={(e) => setCustomBreakMin(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded text-center focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mb-6 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => switchMode("WORK")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "WORK" 
                ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Work Mode
          </button>
          <button
            onClick={() => switchMode("BREAK")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "BREAK" 
                ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Break Mode
          </button>
        </div>
      )}

      {/* Real-time Circular SVG Progression Indicator Rings */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-zinc-100 dark:stroke-zinc-800 fill-none"
            strokeWidth="8"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className={`fill-none transition-all duration-300 ease-linear ${
              mode === "WORK" ? "stroke-red-500" : "stroke-green-500"
            }`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">
            {mode === "WORK" ? "Focusing" : "Resting"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium text-white transition-all shadow-sm focus:outline-none ${
            isActive 
              ? "bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500" 
              : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          }`}
        >
          {isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          className="py-2 px-4 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-sm font-medium transition-all focus:outline-none"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

