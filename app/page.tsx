"use client";

import { useMemo, useState } from "react";
import LoginGate from "@/components/LoginGate";

type JunkItem = {
  id: string;
  zoomImage: string; // you provide this (already zoomed/cropped)
  fullImage: string; // full image revealed later
  answerObject: string; // what is it?
  answerOwner: string; // whose is it?
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

export default function Home() {
  // ✅ Safety: if ITEMS is empty, show a helpful message instead of crashing
  if (!ITEMS.length) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-white/70">No items yet. Add some images to ITEMS.</div>
      </main>
    );
  }

  const [index, setIndex] = useState(0);
  const current = useMemo(() => ITEMS[index], [index]);

  const [guessObject, setGuessObject] = useState("");
  const [guessOwner, setGuessOwner] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const correctObject = normalize(guessObject) === normalize(current.answerObject);
  const correctOwner = normalize(guessOwner) === normalize(current.answerOwner);
  const bothCorrect = correctObject && correctOwner;

  function submit() {
    setSubmitted(true);
  }

  function reveal() {
    setShowFull(true);
  }

  function resetRound() {
    setGuessObject("");
    setGuessOwner("");
    setSubmitted(false);
    setShowFull(false);
  }

  function next() {
    const nextIndex = (index + 1) % ITEMS.length;
    setIndex(nextIndex);
    resetRound(); // ✅ important
  }

  function retry() {
    resetRound();
  }

  // ✅ Debug info (helps when Vercel looks blank / images not loading)
  const debug = {
    index,
    id: current.id,
    showing: showFull ? "full" : "zoom",
    imageSrc: showFull ? current.fullImage : current.zoomImage,
    // These will be "undefined" if you forgot env vars on Vercel
    hasFirebaseEnv:
      !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return (
    <LoginGate>
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Whose Junk Is This?</h1>
            <p className="text-white/70">
              Guess the object and the Now Buildings staff member it belongs to.
            </p>

            {/* ✅ Debug panel (remove anytime) */}
            <div className="text-xs text-white/40 break-all">
              <div>debug: {JSON.stringify(debug)}</div>
            </div>
          </header>

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
                Skip →
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
                  onError={(e) => {
                    // ✅ If images fail on Vercel, you'll see it immediately in console
                    console.error("Image failed to load:", (e.target as HTMLImageElement).src);
                  }}
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
                    Next →
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

                {!showFull && (
                  <div className="text-white/60 text-sm">
                    Tip: click “Reveal full image” to see the full photo.
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="text-white/50 text-sm">
            Images live in <span className="text-white/70">/public/junk/</span>. Each
            item uses a zoom + full image.
          </footer>
        </div>
      </main>
    </LoginGate>
  );
}
