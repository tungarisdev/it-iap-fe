import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Lightbulb,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Clock,
  Loader2,
  AlertCircle,
  X,
  LogOut,
  Eye,
  CheckCircle2,
  Bot,
  UserIcon,
  Trophy,
} from "lucide-react";
import interviewService from "../../../services/user/interviewService";
import type {
  InterviewQuestion,
  ChatMessage,
  ApiErrorResponse,
} from "../../../services/user/interviewService";
import useInterviewStore from "../../../store/interviewStore";
import { useSpeechSynthesis } from "../../../hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "../../../hooks/useSpeechRecognition";
import type { AxiosError } from "axios";

// ── Countdown Timer Hook ──
function useCountdown(timeEnd: string | null, bufferSeconds: number = 3) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!timeEnd) {
      setSecondsLeft(null);
      return;
    }

    // Parse "dd/MM/yyyy HH:mm:ss" format
    const parts = timeEnd.match(
      /(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/
    );
    if (!parts) {
      setSecondsLeft(null);
      return;
    }

    const endDate = new Date(
      Number(parts[3]),
      Number(parts[2]) - 1,
      Number(parts[1]),
      Number(parts[4]),
      Number(parts[5]),
      Number(parts[6])
    );

    const calcRemaining = () => {
      const now = new Date();
      // Subtract bufferSeconds so that when countdown hits 0s, actual server still has 3s buffer to process the answer!
      const rawDiff = Math.floor((endDate.getTime() - now.getTime()) / 1000);
      const diff = Math.max(0, rawDiff - bufferSeconds);
      setSecondsLeft(diff);
      return diff;
    };

    calcRemaining();
    const interval = setInterval(() => {
      const remaining = calcRemaining();
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeEnd, bufferSeconds]);

  return secondsLeft;
}

// ── Elapsed Timer Hook ──
function useElapsedTime() {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return seconds;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Main Component ──
const InterviewSessionPage = () => {
  const { t } = useTranslation("Interview");
  const navigate = useNavigate();
  const { interviewId } = useParams<{ interviewId: string }>();
  const location = useLocation();
  // firstQuestion is set in navigation state by InterviewPrepPage after calling /start.
  // When present, we skip the current-question API call (fresh start flow).
  // When absent (resume from history), we call current-question as usual.
  const navFirstQuestion = (location.state as { firstQuestion?: InterviewQuestion } | null)?.firstQuestion;

  // Store
  const {
    currentQuestion,
    isComplete,
    messages,
    isAnswering,
    previousQuestions,
    viewingPreviousIndex,
    interviewMode,
    setCurrentQuestion,
    setIsComplete,
    setMessages,
    addMessage,
    setIsAnswering,
    saveCurrentToHistory,
    viewPrevious,
    viewCurrent,
  } = useInterviewStore();

  // Local state
  const [userAnswer, setUserAnswer] = useState("");
  const userAnswerRef = useRef(userAnswer);
  useEffect(() => {
    userAnswerRef.current = userAnswer;
  }, [userAnswer]);

  const [hint, setHint] = useState<string | null>(null);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  // Track whether the scoring call (/next on last question) has already been triggered
  // to avoid double-calling when the user clicks the "View Result" button
  const hasScoringTriggered = useRef(false);

  // Track cursor position & latest user answer for speech chunk insertion
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseTextRef = useRef(userAnswer);
  const speechInsertionStartRef = useRef(0);

  const handleSpeechChunk = useCallback(
    (data: { text: string; isFinal: boolean }) => {
      const rawSpeech = data.text.trim();
      if (!rawSpeech) return;

      const base = baseTextRef.current;
      const start = Math.max(0, Math.min(speechInsertionStartRef.current, base.length));

      // Check preceding context to decide smart capitalization and spacing
      const prefixSlice = base.slice(0, start);
      const isStartOfSentence = start === 0 || /[.!?\n]\s*$/.test(prefixSlice);
      const needsSpaceBefore = start > 0 && !/\s$/.test(prefixSlice);

      // Normalize first character: lowercase if not start of a sentence
      let speechText = rawSpeech;
      if (!isStartOfSentence && speechText.length > 0) {
        speechText = speechText.charAt(0).toLowerCase() + speechText.slice(1);
      }

      // Suffix context
      const suffixSlice = base.slice(start);
      const needsSpaceAfter =
        data.isFinal && suffixSlice.length > 0 && !/^[\s.,?!;:]/.test(suffixSlice);

      const textToInsert =
        (needsSpaceBefore ? " " : "") +
        speechText +
        (data.isFinal ? (needsSpaceAfter ? " " : " ") : "");
      const nextVal = prefixSlice + textToInsert + suffixSlice;
      const nextCursor = prefixSlice.length + textToInsert.length;

      setUserAnswer(nextVal);

      if (data.isFinal) {
        // Commit this speech segment into base text
        baseTextRef.current = nextVal;
        speechInsertionStartRef.current = nextCursor;
      }

      // Keep textarea cursor positioned directly after inserted words
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    },
    []
  );

  // Hooks
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const {
    startListening,
    stopListening,
    restartListening,
    isListening,
    isSupported: sttSupported,
  } = useSpeechRecognition({ onSpeechChunk: handleSpeechChunk });

  // Sync speech base whenever user changes text or moves cursor
  const handleUserCursorChange = useCallback(
    (newText: string, cursorIndex: number) => {
      baseTextRef.current = newText;
      speechInsertionStartRef.current = Math.max(0, Math.min(cursorIndex, newText.length));
      if (isListening) {
        restartListening();
      }
    },
    [isListening, restartListening]
  );

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isInteractive = interviewMode === "INTERACTIVE_INTERVIEW" || currentQuestion?.interviewMode === "INTERACTIVE_INTERVIEW";
  const isViewingPrevious = viewingPreviousIndex !== null;
  const isInterviewFinished = isInteractive
    ? isComplete && currentQuestion?.hasNext === false
    : isComplete;
  const isInputDisabled = isInteractive ? isComplete || isAnswering : isInterviewFinished || isAnswering;

  const handleToggleMic = useCallback(() => {
    if (isInputDisabled) return;
    if (isListening) {
      stopListening();
    } else {
      const pos = textareaRef.current?.selectionStart ?? userAnswer.length;
      baseTextRef.current = userAnswer;
      speechInsertionStartRef.current = Math.max(0, Math.min(pos, userAnswer.length));
      startListening();
    }
  }, [isInputDisabled, isListening, startListening, stopListening, userAnswer]);

  // Stop mic automatically if question/interview becomes complete
  useEffect(() => {
    if (isComplete && isListening) {
      stopListening();
    }
  }, [isComplete, isListening, stopListening]);

  const secondsLeft = useCountdown(
    isViewingPrevious ? null : currentQuestion?.timeEnd ?? null
  );
  const elapsedTime = useElapsedTime();

  // Exit handler: smoothly exit fullscreen then navigate
  const handleConfirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore
      }
    }
    navigate("/history");
  }, [navigate]);

  // Fullscreen helper: checks both Document Fullscreen API and Browser F11 mode
  const checkIsFullscreen = useCallback(() => {
    if (typeof window === "undefined") return true;
    const isDocFullscreen = !!document.fullscreenElement;
    const isDisplayModeFullscreen = window.matchMedia?.("(display-mode: fullscreen)").matches;
    const isWindowFullscreen =
      window.innerHeight >= screen.height - 2 && window.innerWidth >= screen.width - 2;
    return Boolean(isDocFullscreen || isDisplayModeFullscreen || isWindowFullscreen);
  }, []);

  const handleRequestFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Ignore
      }
    }
    setIsFullscreen(checkIsFullscreen());
  };

  // Fullscreen monitor (no exitFullscreen in cleanup!)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(checkIsFullscreen());
    };
    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleFullscreenChange);
    };
  }, [checkIsFullscreen]);

  // Reset store and load current question when interviewId changes
  useEffect(() => {
    if (!interviewId) return;

    // Always reset store when entering a session to avoid stale data from a previous interview
    useInterviewStore.getState().reset();
    hasScoringTriggered.current = false;
    setIsLoading(true);

    // ── Fresh start flow (from InterviewPrepPage via /start API) ──
    // The first question was already returned by /start and passed via navigation state.
    // Use it directly — no need to call current-question API.
    if (navFirstQuestion) {
      setCurrentQuestion(navFirstQuestion);
      setIsLoading(false);
      return;
    }

    // ── Resume flow (from history page or page reload) ──
    // Call current-question to get where the user left off.
    const loadQuestion = async () => {
      try {
        const res = await interviewService.getCurrentQuestion(Number(interviewId));
        const questionData = res.data.data;
        if (!questionData) throw new Error("Question response data is missing");

        if (questionData.isComplete) {
          if (questionData.interviewMode === "INTERACTIVE_INTERVIEW") {
            if (questionData.hasNext) {
              // Current question is done but there are more — unlock the
              // "Next Question" button so the user can proceed.
              // handleNextInteractive will call /next and update all state properly.
              setCurrentQuestion(questionData);
              setIsComplete(true);
              // Load existing chat history so user can review the conversation
              try {
                const msgRes = await interviewService.getInteractiveMessages(
                  questionData.interviewQuestionId
                );
                setMessages(msgRes.data.data ?? []);
              } catch {
                // No chat history yet
              }
            } else {
              // Last question is complete and no more questions remain.
              // Show the question on screen, trigger scoring silently,
              // and let user click "Xem kết quả" themselves.
              setCurrentQuestion(questionData);
              setIsComplete(true);
              // Load existing chat history so user can review the conversation
              try {
                const msgRes = await interviewService.getInteractiveMessages(
                  questionData.interviewQuestionId
                );
                setMessages(msgRes.data.data ?? []);
              } catch {
                // No chat history yet
              }
              if (!hasScoringTriggered.current) {
                hasScoringTriggered.current = true;
                try {
                  await interviewService.nextInteractive(questionData.interviewQuestionId);
                } catch {
                  // Scoring trigger failed silently
                }
              }
            }
          } else {
            // Stress mode: interview already fully complete → go to result
            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => {});
            }
            navigate(`/history/${interviewId}/result`, { replace: true });
            return;
          }
        } else {
          setCurrentQuestion(questionData);

          // If interactive, load chat history
          if (questionData.interviewMode === "INTERACTIVE_INTERVIEW") {
            try {
              const msgRes = await interviewService.getInteractiveMessages(
                questionData.interviewQuestionId
              );
              setMessages(msgRes.data.data ?? []);
            } catch {
              // No history yet
            }
          }
        }

        // Auto-enter fullscreen when resuming from history
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {
        setError(t("errors.sessionNotFound"));
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Time up handler
  useEffect(() => {
    if (secondsLeft === 0 && !isInteractive) {
      // Auto-submit on time up for stress mode
      handleStressAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // ── Handlers ──

  const handleInteractiveAnswer = useCallback(async () => {
    if (!currentQuestion || !userAnswer.trim() || isAnswering) return;

    setIsAnswering(true);
    setError("");

    // Add user message to chat
    addMessage({ role: "USER", content: userAnswer.trim() });
    const sentAnswer = userAnswer.trim();
    setUserAnswer("");

    try {
      const res = await interviewService.answerInteractive(
        currentQuestion.interviewQuestionId,
        sentAnswer
      );

      const result = res.data.data;
      if (!result) throw new Error("Answer response data is missing");

      // Add AI response
      addMessage({ role: "ASSISTANT", content: result.content });
      setIsComplete(result.isComplete);

      // Auto-trigger scoring when the LAST question's conversation is complete.
      // Trigger is based on actual API response (isComplete from answers API),
      // not from UI state — so the user cannot bypass this by manipulating the DOM.
      if (result.isComplete && !currentQuestion.hasNext && !hasScoringTriggered.current) {
        hasScoringTriggered.current = true;
        try {
          await interviewService.nextInteractive(currentQuestion.interviewQuestionId);
        } catch {
          // Scoring trigger failed silently; the button will still appear
          // and navigating to result will attempt feedback retrieval
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setError(axiosErr.response?.data?.message || t("errors.answerFailed"));
    } finally {
      setIsAnswering(false);
    }
  }, [currentQuestion, userAnswer, isAnswering, setIsAnswering, addMessage, setIsComplete, t]);

  const handleStressAnswer = useCallback(async (explicitAnswer?: string) => {
    if (!currentQuestion || isAnswering || isComplete) return;

    setIsAnswering(true);
    setError("");

    const rawText = typeof explicitAnswer === "string" ? explicitAnswer : userAnswerRef.current;
    const answerText = rawText.trim() || "Không có câu trả lời";

    try {
      const res = await interviewService.answerStress(
        currentQuestion.interviewQuestionId,
        answerText
      );

      const nextQuestion = res.data?.data;

      // Save current to history
      saveCurrentToHistory(answerText);
      setUserAnswer("");
      userAnswerRef.current = "";
      setHint(null);
      setIsHintVisible(false);

      // If the response is a new question, set it
      const hasValidNext =
        nextQuestion &&
        nextQuestion.interviewQuestionId &&
        nextQuestion.interviewQuestionId !== currentQuestion.interviewQuestionId;

      if (hasValidNext) {
        setCurrentQuestion(nextQuestion);
      } else {
        // Last question answered — mark isComplete without calling setCurrentQuestion (which would reset isComplete to false)
        setIsComplete(true);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      // If error is 400 because question was already submitted on the last question, mark isComplete
      if (axiosErr.response?.status === 400 && currentQuestion.hasNext === false) {
        setIsComplete(true);
      } else {
        setError(axiosErr.response?.data?.message || t("errors.answerFailed"));
      }
    } finally {
      setIsAnswering(false);
    }
  }, [currentQuestion, isAnswering, isComplete, setIsAnswering, saveCurrentToHistory, setCurrentQuestion, setIsComplete, t]);

  const handleNextInteractive = useCallback(async () => {
    if (!currentQuestion || !isComplete || isAnswering) return;

    setIsAnswering(true);
    setError("");

    try {
      const res = await interviewService.nextInteractive(
        currentQuestion.interviewQuestionId
      );

      const nextQuestion = res.data.data;
      if (!nextQuestion) throw new Error("Next question response data is missing");

      // Save current to history
      saveCurrentToHistory("");
      setUserAnswer("");
      userAnswerRef.current = "";
      setHint(null);
      setIsHintVisible(false);
      setCurrentQuestion(nextQuestion);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setError(axiosErr.response?.data?.message || t("errors.nextFailed"));
    } finally {
      setIsAnswering(false);
    }
  }, [currentQuestion, isComplete, isAnswering, setIsAnswering, saveCurrentToHistory, setCurrentQuestion, t]);

  const handleShowHint = useCallback(async () => {
    if (!currentQuestion) return;

    if (isHintVisible) {
      setIsHintVisible(false);
      return;
    }

    if (hint) {
      setIsHintVisible(true);
      return;
    }

    setIsLoadingHint(true);
    try {
      const res = await interviewService.getQuestionHint(
        currentQuestion.interviewQuestionId
      );
      const hintData = res.data.data;
      if (!hintData) throw new Error("Hint response data is missing");
      setHint(hintData.hint);
      setIsHintVisible(true);
    } catch {
      setError(t("errors.hintFailed"));
    } finally {
      setIsLoadingHint(false);
    }
  }, [currentQuestion, hint, isHintVisible, t]);

  const handleFinishInterview = async () => {
    if (isAnswering) return;

    // Exit fullscreen before navigating to result page
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    navigate(`/history/${interviewId}/result`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isInteractive && !isComplete && !isAnswering) {
        handleInteractiveAnswer();
      }
    }
  };

  // ── Viewing Previous Question ──
  const viewedQuestion =
    viewingPreviousIndex !== null
      ? previousQuestions[viewingPreviousIndex]
      : null;
  const displayQuestion = viewedQuestion?.question || currentQuestion;
  const questionNumber = isViewingPrevious
    ? (viewingPreviousIndex ?? 0) + 1
    : !isInteractive && isComplete
    ? Math.max(1, previousQuestions.length)
    : previousQuestions.length + 1;

  const getCategoryLabel = (category: string): string => {
    const label = t(`sessionPage.categoryLabel.${category}`, { defaultValue: "" });
    return label || category;
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // ── Error State ──
  if (error && !currentQuestion) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-xl border border-rose-200 bg-rose-50 p-6 text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={handleConfirmExit}
            className="mt-4 rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("resultPage.retryInterview")}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!displayQuestion) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Exit + Question Number */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              title={t("sessionPage.exitInterview")}
            >
              <LogOut className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                {t("sessionPage.question")} {questionNumber}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  getCategoryLabel(displayQuestion.category).includes("Kỹ thuật") ||
                  getCategoryLabel(displayQuestion.category).includes("Technical")
                    ? "bg-blue-50 text-sky-700"
                    : getCategoryLabel(displayQuestion.category).includes("Hành vi") ||
                        getCategoryLabel(displayQuestion.category).includes("Behavioral")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {getCategoryLabel(displayQuestion.category)}
              </span>
            </div>
          </div>

          {/* Right: Timer + Mode Badge */}
          <div className="flex items-center gap-3">
            {/* Timer */}
            {secondsLeft !== null ? (
              <motion.div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-mono font-medium ${
                  secondsLeft <= 60
                    ? "bg-rose-50 text-rose-700"
                    : secondsLeft <= 300
                      ? "bg-amber-50 text-amber-700"
                      : "bg-zinc-100 text-zinc-700"
                }`}
                animate={
                  secondsLeft <= 60
                    ? { scale: [1, 1.02, 1] }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Clock className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-mono font-medium text-zinc-600">
                <Clock className="h-4 w-4" />
                {formatTime(elapsedTime)}
              </div>
            )}

            {/* Mode badge */}
            <span
              className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isInteractive
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isInteractive ? "Interactive" : "Stress"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Fullscreen Warning ── */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center gap-4 bg-amber-500 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md z-50"
          >
            <span>⚠️ Bạn đã thoát chế độ toàn màn hình. Hãy bật lại để có trải nghiệm phỏng vấn tốt nhất.</span>
            <button
              onClick={handleRequestFullscreen}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50"
            >
              Bật toàn màn hình
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Viewing Previous Banner ── */}
      <AnimatePresence>
        {isViewingPrevious && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-amber-200 bg-amber-50"
          >
            <div className="mx-auto flex items-center justify-between px-4 py-2 sm:px-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  {t("sessionPage.viewingPrevious")}
                </span>
              </div>
              <button
                onClick={viewCurrent}
                className="rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-700"
              >
                {t("sessionPage.backToCurrent")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
          {/* Question Card */}
          <motion.div
            key={displayQuestion.interviewQuestionId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-base leading-relaxed text-zinc-900 sm:text-lg font-medium">
                {displayQuestion.questionContent}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* TTS Button */}
              {ttsSupported && (
                <button
                  onClick={() =>
                    isSpeaking
                      ? stopSpeaking()
                      : speak(displayQuestion.questionContent)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isSpeaking
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  {isSpeaking
                    ? t("sessionPage.stopListening")
                    : t("sessionPage.listenQuestion")}
                </button>
              )}

              {/* Hint Button */}
              {!isViewingPrevious && (
                <button
                  onClick={handleShowHint}
                  disabled={isLoadingHint}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isHintVisible
                      ? "bg-amber-100 text-amber-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {isLoadingHint ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5" />
                  )}
                  {isHintVisible
                    ? t("sessionPage.hideHint")
                    : t("sessionPage.showHint")}
                </button>
              )}

              {/* Completed badge for interactive */}
              {isInteractive && isComplete && !isViewingPrevious && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("sessionPage.completedBadge")}
                </motion.span>
              )}
            </div>

            {/* Hint Content */}
            <AnimatePresence>
              {isHintVisible && hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">
                        {t("sessionPage.hintTitle")}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-700">
                      {hint}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Error Display */}
          <AnimatePresence>
            {error && currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-700">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="ml-auto text-rose-400 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Interactive Mode: Chat ── */}
          {isInteractive && (
            <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* Display messages */}
                {(isViewingPrevious ? viewedQuestion?.messages || [] : messages).map(
                  (msg: ChatMessage, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={`mb-3 flex gap-3 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === "USER"
                            ? "bg-zinc-900"
                            : "bg-blue-100"
                        }`}
                      >
                        {msg.role === "USER" ? (
                          <UserIcon className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-blue-600" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.role === "USER"
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        {/* TTS for AI messages */}
                        {msg.role === "ASSISTANT" && ttsSupported && (
                          <button
                            onClick={() => speak(msg.content)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition"
                          >
                            <Volume2 className="h-3 w-3" />
                            {t("sessionPage.listenAI")}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                )}

                {/* Typing indicator */}
                <AnimatePresence>
                  {isAnswering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="rounded-2xl bg-zinc-100 px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="h-2 w-2 rounded-full bg-zinc-400"
                              animate={{ y: [0, -6, 0] }}
                              transition={{
                                duration: 0.6,
                                delay: i * 0.15,
                                repeat: Infinity,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              {!isViewingPrevious && (
                <div className="relative border-t border-zinc-200 p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    {/* Mic button */}
                    {sttSupported && (
                      <button
                        onClick={handleToggleMic}
                        disabled={isComplete || isAnswering}
                        className={`shrink-0 rounded-full p-2.5 transition ${
                          isComplete || isAnswering
                            ? "opacity-40 cursor-not-allowed bg-zinc-100 text-zinc-400"
                            : isListening
                            ? "bg-rose-100 text-rose-600 animate-pulse"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                        title={
                          isListening
                            ? t("sessionPage.stopMic")
                            : t("sessionPage.startMic")
                        }
                      >
                        {isListening ? (
                          <MicOff className="h-5 w-5" />
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </button>
                    )}

                    <textarea
                      ref={textareaRef}
                      value={userAnswer}
                      onChange={(e) => {
                        setUserAnswer(e.target.value);
                        handleUserCursorChange(
                          e.target.value,
                          e.target.selectionStart ?? e.target.value.length
                        );
                      }}
                      onSelect={(e) =>
                        handleUserCursorChange(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ??
                            e.currentTarget.value.length
                        )
                      }
                      onClick={(e) =>
                        handleUserCursorChange(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ??
                            e.currentTarget.value.length
                        )
                      }
                      onKeyUp={(e) =>
                        handleUserCursorChange(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ??
                            e.currentTarget.value.length
                        )
                      }
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isInterviewFinished
                          ? t("sessionPage.interviewFinishedPlaceholder")
                          : isComplete
                          ? t("sessionPage.questionCompletedPlaceholder")
                          : t("sessionPage.chatPlaceholder")
                      }
                      disabled={isAnswering || isComplete}
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 disabled:opacity-60 disabled:bg-zinc-100/80 disabled:cursor-not-allowed"
                      style={{ maxHeight: "120px" }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height =
                          Math.min(target.scrollHeight, 120) + "px";
                      }}
                    />

                    <button
                      onClick={handleInteractiveAnswer}
                      disabled={!userAnswer.trim() || isAnswering || isComplete}
                      className="shrink-0 rounded-full bg-zinc-900 p-2.5 text-white transition hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isAnswering ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Finished notice or Question Completed notice or Not Complete Warning */}
                  {isInterviewFinished ? (
                    <p className="mt-2.5 text-xs font-medium text-blue-600 flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{t("sessionPage.interviewFinishedNote")}</span>
                    </p>
                  ) : isComplete ? (
                    <p className="mt-2.5 text-xs font-medium text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{t("sessionPage.questionCompletedNote")}</span>
                    </p>
                  ) : messages.length > 0 ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      {t("sessionPage.interactiveNotComplete")}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ── Stress Mode: Simple Answer ── */}
          {!isInteractive && (
            <div className="flex flex-1 flex-col">
              {/* Viewing previous answer */}
              {isViewingPrevious && viewedQuestion ? (
                <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-sm font-medium text-zinc-500 mb-2">
                    {t("resultPage.yourAnswer")}
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                    {viewedQuestion.userAnswer || "(Không có câu trả lời)"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5">
                  <textarea
                    ref={textareaRef}
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      handleUserCursorChange(
                        e.target.value,
                        e.target.selectionStart ?? e.target.value.length
                      );
                    }}
                    onSelect={(e) =>
                      handleUserCursorChange(
                        e.currentTarget.value,
                        e.currentTarget.selectionStart ??
                          e.currentTarget.value.length
                      )
                    }
                    onClick={(e) =>
                      handleUserCursorChange(
                        e.currentTarget.value,
                        e.currentTarget.selectionStart ??
                          e.currentTarget.value.length
                      )
                    }
                    onKeyUp={(e) =>
                      handleUserCursorChange(
                        e.currentTarget.value,
                        e.currentTarget.selectionStart ??
                          e.currentTarget.value.length
                      )
                    }
                    placeholder={
                      isInterviewFinished
                        ? t("sessionPage.interviewFinishedPlaceholder")
                        : t("sessionPage.answerPlaceholder")
                    }
                    disabled={isAnswering || isInterviewFinished}
                    className="flex-1 w-full resize-none rounded-sm border-0 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ minHeight: "180px" }}
                  />

                  {/* Finished notice or Mic */}
                  {isInterviewFinished ? (
                    <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 text-xs font-medium text-blue-600 animate-fadeIn">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{t("sessionPage.interviewFinishedNote")}</span>
                    </div>
                  ) : (
                    sttSupported && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                        <button
                          onClick={handleToggleMic}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            isListening
                              ? "bg-rose-100 text-rose-600 animate-pulse"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="h-3.5 w-3.5" />
                              {t("sessionPage.stopMic")}
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5" />
                              {t("sessionPage.startMic")}
                            </>
                          )}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Navigation Bar ── */}
        <div className="sticky bottom-0 border-t border-zinc-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6 max-w-4xl">
            {/* Previous */}
            <button
              onClick={() => {
                if (isViewingPrevious && viewingPreviousIndex !== null) {
                  if (viewingPreviousIndex > 0) {
                    viewPrevious(viewingPreviousIndex - 1);
                  }
                } else if (previousQuestions.length > 0) {
                  viewPrevious(previousQuestions.length - 1);
                }
              }}
              disabled={
                (isViewingPrevious && viewingPreviousIndex === 0) ||
                (!isViewingPrevious && previousQuestions.length === 0)
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("sessionPage.previousQuestion")}
            </button>

            {/* Back to current (when viewing previous) */}
            {isViewingPrevious && (
              <button
                onClick={viewCurrent}
                className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                {t("sessionPage.backToCurrent")}
              </button>
            )}

            {/* Next / View Result */}
            {!isViewingPrevious && (
              <>
                {/*
                  "Xem kết quả" button appears ONLY when:
                  - In Interactive mode: isComplete === true AND currentQuestion.hasNext === false
                  - In Stress mode: isComplete === true (after final question was answered via timeout or button)
                */}
                {isComplete && (!isInteractive || currentQuestion?.hasNext === false) ? (
                  <button
                    onClick={handleFinishInterview}
                    disabled={isAnswering}
                    className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                    {t("sessionPage.viewResult")}
                  </button>
                ) : isInteractive ? (
                  <button
                    onClick={handleNextInteractive}
                    disabled={!isComplete || isAnswering}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("sessionPage.nextQuestion")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStressAnswer()}
                    disabled={isAnswering}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAnswering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {t("sessionPage.nextQuestion")}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Exit Confirmation Modal ── */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                {t("sessionPage.exitInterview")}
              </h3>
              <p className="mb-6 text-sm text-zinc-600">
                {t("sessionPage.exitConfirm")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  {t("sessionPage.exitNo")}
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  {t("sessionPage.exitYes")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterviewSessionPage;
