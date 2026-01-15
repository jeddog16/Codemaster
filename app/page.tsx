"use client";

import { useEffect, useMemo, useState } from "react";
import LoginGate from "@/components/LoginGate";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

type JunkItem = {
  id: string;
  zoomImage: string;
  fullImage: string;
  answerObject: string;
  answerOwner: string;
};

const ITEMS: JunkItem[] = [
  {
    id: "eclipse-nick",
    zoomImage: "/junk/eclipsezoomed.jpeg",
    fullImage: "/junk/eclipse.jpeg",
    answerObject: "Eclipse",
    answerOwner: "Nick",
  },
  {
    id: "therock-lenka",
    zoomImage: "/junk/therockzoomed.jpeg",
    fullImage: "/junk/therock.jpeg",
    answerObject: "The Rock",
    answerOwner: "Lenka",
  },
  {
    id: "mouse-jed",
    zoomImage: "/junk/mousezoomed.jpeg",
    fullImage: "/junk/mouse.jpeg",
    answerObject: "Mouse",
    answerOwner: "Jed",
  },
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

type LeaderRow = {
  uid: string;
  name: string;
  email: string;
  score: number;
  season: number;
  submittedAt?: any;
};

const ADMIN_EMAIL = "jed@nowbuildings.com.au";

export default function Home() {
  // ===== Auth user =====
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  const isAdmin = (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // ===== Season state =====
  const [season, setSeason] = useState<number | null>(null);

  useEffect(() => {
    // Live read season
    return onSnapshot(doc(db, "meta", "game"), (snap) => {
      const s = snap.data()?.season;
      setSeason(typeof s === "number" ? s : null);
    });
  }, []);

  // ===== Game state =====
  const [index, setIndex] = useState(0);
  const current = useMemo(() => ITEMS[index], [index]);

  const [guessObject, setGuessObject] = useState("");
  const [guessOwner, setGuessOwner] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const [score, setScore] = useState(0);
  const [scoredThisRound, setScoredThisRound] = useState(false);

  const [gameOver, setGameOver] = useState(false);

  // One-attempt enforcement UI state
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const correctObject = normalize(guessObject) === normalize(current.answerObject);
  const correctOwner = normalize(guessOwner) === normalize(current.answerOwner);
  const bothCorrect = correctObject && correctOwner;

  // Check if this user already submitted for this season
  useEffect(() => {
    const run = async () => {
      if (!user || season == null) {
        setAlreadySubmitted(false);
        setCheckingAttempt(false);
        return;
      }

      setCheckingAttempt(true);
      const ref = doc(db, "leaderboard", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setAlreadySubmitted(false);
        setCheckingAttempt(false);
        return;
      }

      const data = snap.data() as any;
      setAlreadySubmitted(data?.season === season);
      setCheckingAttempt(false);
    };

    run();
  }, [user?.uid, season]);

  function submit() {
    setSubmitted(true);

    if (bothCorrect && !scoredThisRound) {
      setScore((s) => s + 1);
      setScoredThisRound(true);
    }
  }

  function reveal() {
    setShowFull(true);
  }

  function next() {
    const isLast = index === ITEMS.length - 1;

    if (isLast) {
      setGameOver(true);
      return;
    }

    setIndex((i) => i + 1);
    setGuessObject("");
    setGuessOwner("");
    setSubmitted(false);
    setShowFull(false);
    setScoredThisRound(false);
  }

  function retry() {
    setGuessObject("");
    setGuessOwner("");
    setSubmitted(false);
    setShowFull(false);
    setScoredThisRound(false);
  }

  function restartLocalOnly() {
    // This does NOT let them re-submit to leaderboard (rules block it)
    setIndex(0);
    setGuessObject("");
    setGuessOwner("");
    setSubmitted(false);
    setShowFull(false);
    setScoredThisRound(false);
    setScore(0);
    setGameOver(false);
    setSaveError(null);
  }

  // ===== Leaderboard =====
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    if (season == null) return;

    const q = query(
      collection(db, "leaderboard"),
      orderBy("score", "desc"),
      limit(50)
    );

    // We’ll filter season client-side for simplicity
    const unsub = onSnapshot(q, (snap) => {
      const rows: LeaderRow[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            uid: d.id,
            name: data.name ?? "",
            email: data.email ?? "",
            score: Number(data.score ?? 0),
            season: Number(data.season ?? -1),
            submittedAt: data.submittedAt,
          };
        })
        .filter((r) => r.season === season);

      setLeaders(rows);
    });

    return () => unsub();
  }, [season]);

  async function saveScoreOnce() {
    if (!user) return;
    if (season == null) {
      setSaveError("Season not loaded. Check meta/game exists in Firestore.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // IMPORTANT: setDoc without merge so it is a CREATE.
      // Firestore rules allow create only once per season.
      await setDoc(doc(db, "leaderboard", user.uid), {
        uid: user.uid,
        email: user.email ?? "",
        name: user.displayName ?? (user.email ?? "").split("@")[0],
        score,
        season,
        submittedAt: serverTimestamp(),
      });

      setAlreadySubmitted(true);
    } catch (e: any) {
      // Most common: permission denied because they already submitted
      setSaveError(e?.message || "Could not save score.");
    } finally {
      setSaving(false);
    }
  }

  async function resetLeaderboardSeason() {
    if (!isAdmin) return;
    if (season == null) return;

    await updateDoc(doc(db, "meta", "game"), {
      season: season + 1,
    });

    // After reset, allow fresh plays
    restartLocalOnly();
  }

  // ===== Loading gates =====
  if (season == null) {
    return (
      <LoginGate>
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="text-white/70">
            Loading game settings… (Did you create Firestore doc meta/game with season=1?)
          </div>
        </main>
      </LoginGate>
    );
  }

  if (checkingAttempt) {
    return (
      <LoginGate>
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="text-white/70">Loading…</div>
        </main>
      </LoginGate>
    );
  }

  // If they already submitted for this season, block the game and show leaderboard
  if (alreadySubmitted) {
    return (
      <LoginGate>
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="w-full max-w-3xl space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-2">
              <h1 className="text-2xl font-bold">You’ve already had your one attempt ✅</h1>
              <p className="text-white/70">
                This season only allows one score per person.
              </p>

              {isAdmin && (
                <button
                  onClick={resetLeaderboardSeason}
                  className="mt-3 px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
                >
                  Admin: Reset leaderboard (new season)
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Leaderboard leaders={leaders} currentUid={user?.uid ?? ""} />
              <div className="text-white/40 text-xs mt-3">
                Season #{season}
              </div>
            </div>
          </div>
        </main>
      </LoginGate>
    );
  }

  // ===== Normal game UI =====
  return (
    <LoginGate>
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">Whose Junk Is This?</h1>
                <p className="text-white/70">
                  Guess the object and the owner. One attempt per season.
                </p>
                <div className="text-white/40 text-xs mt-1">Season #{season}</div>
              </div>

              <div className="text-right">
                <div className="text-white/70 text-sm">Score</div>
                <div className="text-2xl font-bold">
                  {score} / {ITEMS.length}
                </div>
              </div>
            </div>
          </header>

          {/* GAME OVER */}
          {gameOver ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-2xl font-bold">Game Over 🎉</h2>
              <p className="text-white/70">
                Final score: <span className="text-white font-semibold">{score}</span> /{" "}
                {ITEMS.length}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveScoreOnce}
                  disabled={saving || !user}
                  className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Submit my one attempt"}
                </button>

                <button
                  onClick={restartLocalOnly}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                >
                  Replay locally (won’t resubmit)
                </button>

                {isAdmin && (
                  <button
                    onClick={resetLeaderboardSeason}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                  >
                    Admin: Reset leaderboard
                  </button>
                )}
              </div>

              {saveError && (
                <div className="text-red-300 text-sm">
                  {saveError}
                </div>
              )}

              <Leaderboard leaders={leaders} currentUid={user?.uid ?? ""} />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="text-white/70">
                    Round{" "}
                    <span className="text-white font-semibold">{index + 1}</span> /{" "}
                    {ITEMS.length}
                  </div>

                  <button
                    onClick={next}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
                  >
                    {index === ITEMS.length - 1 ? "Finish →" : "Skip →"}
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <div className="aspect-[16/9] w-full relative">
                    <img
                      src={showFull ? current.fullImage : current.zoomImage}
                      alt="Junk"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">What is it?</label>
                    <input
                      value={guessObject}
                      onChange={(e) => setGuessObject(e.target.value)}
                      placeholder="e.g. keys"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-white/30"
                      disabled={submitted}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-white/70">Whose is it?</label>
                    <input
                      value={guessOwner}
                      onChange={(e) => setGuessOwner(e.target.value)}
                      placeholder="e.g. Jed"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-white/30"
                      disabled={submitted}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {!submitted ? (
                    <button
                      onClick={submit}
                      className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
                    >
                      Submit guess
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={reveal}
                        className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                      >
                        Reveal full image
                      </button>

                      <button
                        onClick={next}
                        className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
                      >
                        {index === ITEMS.length - 1 ? "Finish →" : "Next →"}
                      </button>

                      <button
                        onClick={retry}
                        className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                      >
                        Try again (this round)
                      </button>
                    </>
                  )}
                </div>

                {submitted && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="text-lg font-semibold">
                      {bothCorrect ? "✅ Nailed it!" : "❌ Not quite"}
                    </div>

                    <div className="text-white/80">
                      <div>
                        Object:{" "}
                        <span className={correctObject ? "text-white" : "text-white/50"}>
                          {guessObject || "(blank)"}
                        </span>{" "}
                        {correctObject ? "✅" : "❌"}{" "}
                        <span className="text-white/50">(Answer: {current.answerObject})</span>
                      </div>

                      <div>
                        Owner:{" "}
                        <span className={correctOwner ? "text-white" : "text-white/50"}>
                          {guessOwner || "(blank)"}
                        </span>{" "}
                        {correctOwner ? "✅" : "❌"}{" "}
                        <span className="text-white/50">(Answer: {current.answerOwner})</span>
                      </div>
                    </div>

                    {bothCorrect && (
                      <div className="text-white/60 text-sm">+1 point ✅</div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <Leaderboard leaders={leaders} currentUid={user?.uid ?? ""} />
              </div>
            </>
          )}

          <footer className="text-white/50 text-sm">
            Images live in <span className="text-white/70">/public/junk/</span>.
          </footer>
        </div>
      </main>
    </LoginGate>
  );
}

function Leaderboard({ leaders, currentUid }: { leaders: LeaderRow[]; currentUid: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leaderboard</h3>
        <div className="text-white/50 text-sm">Top 50 (this season)</div>
      </div>

      {leaders.length === 0 ? (
        <div className="text-white/60 text-sm">No scores yet. Be the first!</div>
      ) : (
        <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
          {leaders.map((row, i) => {
            const isMe = row.uid === currentUid;
            return (
              <div
                key={row.uid}
                className={`flex items-center justify-between p-3 ${isMe ? "bg-white/10" : "bg-black/20"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-white/60">{i + 1}.</div>
                  <div>
                    <div className="font-semibold">
                      {row.name || row.email || "Unknown"}
                      {isMe ? <span className="text-white/60"> (you)</span> : null}
                    </div>
                    <div className="text-white/50 text-xs">{row.email}</div>
                  </div>
                </div>

                <div className="text-xl font-bold">{row.score}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
