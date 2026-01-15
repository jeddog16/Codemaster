"use client";

import { useEffect, useMemo, useState } from "react";
import LoginGate from "@/components/LoginGate";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
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
  updatedAt?: any;
};

export default function Home() {
  // ===== Auth user (so we can save score to their UID) =====
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
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
  const [saving, setSaving] = useState(false);

  const correctObject = normalize(guessObject) === normalize(current.answerObject);
  const correctOwner = normalize(guessOwner) === normalize(current.answerOwner);
  const bothCorrect = correctObject && correctOwner;

  function submit() {
    setSubmitted(true);

    // Award 1 point only once per round, when both correct
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

  function restart() {
    setIndex(0);
    setGuessObject("");
    setGuessOwner("");
    setSubmitted(false);
    setShowFull(false);
    setScoredThisRound(false);
    setScore(0);
    setGameOver(false);
  }

  // ===== Leaderboard =====
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(20));

    const unsub = onSnapshot(q, (snap) => {
      const rows: LeaderRow[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          uid: d.id,
          name: data.name ?? "",
          email: data.email ?? "",
          score: Number(data.score ?? 0),
          updatedAt: data.updatedAt,
        };
      });
      setLeaders(rows);
    });

    return () => unsub();
  }, []);

  async function saveScore() {
    if (!user) return;

    setSaving(true);
    try {
      const ref = doc(db, "leaderboard", user.uid);

      // keep the best score (don’t overwrite if they already have higher)
      const existing = leaders.find((l) => l.uid === user.uid);
      const best = Math.max(existing?.score ?? 0, score);

      await setDoc(
        ref,
        {
          uid: user.uid,
          email: user.email ?? "",
          name: user.displayName ?? (user.email ?? "").split("@")[0],
          score: best,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <LoginGate>
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">Whose Junk Is This?</h1>
                <p className="text-white/70">
                  Guess the object and the Now Buildings staff member it belongs to.
                </p>
              </div>

              <div className="text-right">
                <div className="text-white/70 text-sm">Score</div>
                <div className="text-2xl font-bold">{score} / {ITEMS.length}</div>
              </div>
            </div>
          </header>

          {/* GAME OVER SCREEN */}
          {gameOver ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-2xl font-bold">Game Over 🎉</h2>
              <p className="text-white/70">
                Final score: <span className="text-white font-semibold">{score}</span> / {ITEMS.length}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveScore}
                  disabled={saving || !user}
                  className="px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save score to leaderboard"}
                </button>

                <button
                  onClick={restart}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                >
                  Play again
                </button>
              </div>

              <Leaderboard leaders={leaders} currentUid={user?.uid ?? ""} />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="text-white/70">
                    Round <span className="text-white font-semibold">{index + 1}</span> / {ITEMS.length}
                  </div>

                  <button
                    onClick={next}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
                  >
                    {index === ITEMS.length - 1 ? "Finish →" : "Skip →"}
                  </button>
                </div>

                {/* IMAGE AREA */}
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

                {/* BUTTONS */}
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
                        Try again
                      </button>
                    </>
                  )}
                </div>

                {/* RESULTS */}
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
                      <div className="text-white/60 text-sm">
                        +1 point ✅
                      </div>
                    )}

                    {!showFull && (
                      <div className="text-white/60 text-sm">
                        Tip: click “Reveal full image” to see the full photo.
                      </div>
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
            Images live in <span className="text-white/70">/public/junk/</span>. Each item uses a zoom + full image.
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
        <div className="text-white/50 text-sm">Top 20</div>
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
                className={`flex items-center justify-between p-3 ${
                  isMe ? "bg-white/10" : "bg-black/20"
                }`}
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

      <div className="text-white/40 text-xs">
        Tip: Score saves your best result (it won’t overwrite a higher score).
      </div>
    </div>
  );
}
