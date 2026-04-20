"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const STATUS_OPTIONS = [
  { value: "seed", label: "種", icon: "🌱" },
  { value: "growing", label: "育成中", icon: "🌿" },
  { value: "ready", label: "使える", icon: "🔥" },
  { value: "done", label: "使用済み", icon: "✔" },
];

const STORAGE_KEY = "hirameki-techo-v0";

const initialIdeas = [
  {
    id: "idea-1",
    content: "黒猫の瞳が最後にだけ映る",
    status: "seed",
    tags: ["黒猫文庫"],
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-04-20T09:00:00.000Z",
  },
  {
    id: "idea-2",
    content: "潮見沢 sequel 山下公園で再会",
    status: "growing",
    tags: ["潮見沢"],
    createdAt: "2026-04-20T01:00:00.000Z",
    updatedAt: "2026-04-20T06:00:00.000Z",
  },
];

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function getAllTags(ideas) {
  return [...new Set(ideas.flatMap((idea) => idea.tags))];
}

function loadIdeasFromStorage() {
  if (typeof window === "undefined") return initialIdeas;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialIdeas;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : initialIdeas;
  } catch {
    return initialIdeas;
  }
}

function runTests() {
  console.assert(classNames("a", false, "b") === "a b", "classNames should join truthy values");
  console.assert(getAllTags([{ tags: ["x", "y"] }, { tags: ["y", "z"] }]).length === 3, "getAllTags should dedupe tags");
  console.assert(STATUS_OPTIONS.find((s) => s.value === "seed")?.label === "種", "seed status should exist");
  console.assert(Array.isArray(loadIdeasFromStorage()), "loadIdeasFromStorage should always return an array");
}

runTests();

export default function App() {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const tagInputRef = useRef(null);

  // Hydration mismatch回避のため、初回は固定データで描画してから client 側で差し替える
  const [ideas, setIdeas] = useState(initialIdeas);
  const [isHydrated, setIsHydrated] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [lastCreatedId, setLastCreatedId] = useState(null);
  const [randomFlashId, setRandomFlashId] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [activeStatus, setActiveStatus] = useState(null);

  const [draftTag, setDraftTag] = useState("");

  useEffect(() => {
    const storedIdeas = loadIdeasFromStorage();
    setIdeas(storedIdeas);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  }, [ideas, isHydrated]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!lastCreatedId) return;
    const el = document.getElementById(`idea-${lastCreatedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setLastCreatedId(null), 800);
    return () => clearTimeout(t);
  }, [lastCreatedId]);

  useEffect(() => {
    if (!randomFlashId) return;
    const t = setTimeout(() => setRandomFlashId(null), 800);
    return () => clearTimeout(t);
  }, [randomFlashId]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...ideas]
      .filter(
        (idea) =>
          !keyword ||
          idea.content.toLowerCase().includes(keyword) ||
          idea.tags.some((tag) => tag.toLowerCase().includes(keyword)),
      )
      .filter((idea) => !activeTag || idea.tags.includes(activeTag))
      .filter((idea) => !activeStatus || idea.status === activeStatus)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [ideas, search, activeTag, activeStatus]);

  const selected = ideas.find((idea) => idea.id === selectedId) || null;

  useEffect(() => {
    if (selectedId) return;
    if (filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [selectedId, filtered]);

  function patchIdea(id, patch) {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : idea,
      ),
    );
  }

  function createIdea() {
    const content = input.trim();
    if (!content) return;

    const now = new Date().toISOString();
    const next = {
      id: crypto.randomUUID(),
      content,
      status: "seed",
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    setIdeas((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setLastCreatedId(next.id);
    setInput("");
    setDraftTag("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pickRandom() {
    if (!ideas.length) return;
    const picked = ideas[Math.floor(Math.random() * ideas.length)];
    setSelectedId(picked.id);
    setRandomFlashId(picked.id);
    document.getElementById(`idea-${picked.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleMainKeyDown(e) {
    if (selected) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createIdea();
    }
  }

  function toggleTag(tag) {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }

  function toggleStatus(status) {
    setActiveStatus((prev) => (prev === status ? null : status));
  }

  function addTagToSelected() {
    if (!selected) return;
    const value = draftTag.trim().replace(/^#/, "");
    if (!value) return;
    if (selected.tags.includes(value)) {
      setDraftTag("");
      return;
    }
    patchIdea(selected.id, { tags: [...selected.tags, value] });
    setDraftTag("");
    requestAnimationFrame(() => tagInputRef.current?.focus());
  }

  function removeTagFromSelected(tag) {
    if (!selected) return;
    const nextTags = selected.tags.filter((t) => t !== tag);
    patchIdea(selected.id, { tags: nextTags });
    if (activeTag === tag && !ideas.some((idea) => idea.id !== selected.id && idea.tags.includes(tag))) {
      setActiveTag(null);
    }
  }

  function clearSelection() {
    setSelectedId(null);
    setDraftTag("");
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const allTags = getAllTags(ideas);
  const mainValue = selected ? selected.content : input;

  return (
    <div className="min-h-screen bg-zinc-950 p-3 text-zinc-100 sm:p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl">ひらめき手帳</h1>
            <button onClick={pickRandom} className="rounded-lg border px-2 py-1 text-xs">ランダム</button>
            <button onClick={() => setShowFilters((v) => !v)} className="rounded-lg border px-2 py-1 text-xs">整理</button>
            {selected && (
              <button onClick={clearSelection} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400">新規に戻る</button>
            )}
            {(activeTag || activeStatus) && (
              <button
                onClick={() => {
                  setActiveTag(null);
                  setActiveStatus(null);
                }}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
              >
                絞り込み解除
              </button>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="検索"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm md:w-auto"
          />
        </div>

        {(activeTag || activeStatus) && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-zinc-300">
            {activeTag && <span className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-2 py-1">#{activeTag}</span>}
            {activeStatus && (
              <span className="rounded-lg border border-purple-500/60 bg-purple-500/10 px-2 py-1">
                {STATUS_OPTIONS.find((s) => s.value === activeStatus)?.icon} {STATUS_OPTIONS.find((s) => s.value === activeStatus)?.label}
              </span>
            )}
          </div>
        )}

        {showFilters && (
          <div className="mb-4 rounded-2xl border border-zinc-800 p-3">
            <div className="mb-2 text-xs text-zinc-400">タグ</div>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 && <div className="text-xs text-zinc-500">タグはまだありません</div>}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={classNames(
                    "rounded-lg border px-2 py-1 text-xs",
                    activeTag === tag ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-700",
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>

            <div className="mb-2 mt-3 text-xs text-zinc-400">ステータス</div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => toggleStatus(status.value)}
                  className={classNames(
                    "rounded-lg border px-2 py-1 text-xs",
                    activeStatus === status.value ? "border-purple-400 bg-purple-500/20" : "border-zinc-700",
                  )}
                >
                  {status.icon} {status.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          ref={inputRef}
          value={mainValue}
          onChange={(e) => {
            if (selected) {
              patchIdea(selected.id, { content: e.target.value });
            } else {
              setInput(e.target.value);
            }
          }}
          onKeyDown={handleMainKeyDown}
          placeholder="思いつきを書く…"
          className="mb-3 h-28 w-full rounded-3xl bg-zinc-900 p-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 md:h-24 md:p-3"
        />

        {selected && (
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 text-xs text-zinc-400">このメモの整理</div>

            <div className="mb-2 text-xs text-zinc-400">タグ</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {selected.tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1">
                  <button
                    onClick={() => toggleTag(tag)}
                    className={classNames(
                      "rounded-lg border px-2 py-1 text-xs",
                      activeTag === tag ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-700",
                    )}
                  >
                    #{tag}
                  </button>
                  <button
                    onClick={() => removeTagFromSelected(tag)}
                    className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                ref={tagInputRef}
                value={draftTag}
                onChange={(e) => setDraftTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagToSelected();
                  }
                }}
                placeholder="タグを追加"
                className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm md:w-auto"
              />
              <button onClick={addTagToSelected} className="rounded-lg border px-2 py-1 text-xs">追加</button>
            </div>

            <div className="mb-2 text-xs text-zinc-400">ステータス</div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => patchIdea(selected.id, { status: status.value })}
                  className={classNames(
                    "rounded-lg border px-2 py-1 text-xs",
                    selected.status === status.value ? "border-purple-400 bg-purple-500/20" : "border-zinc-700",
                  )}
                >
                  {status.icon} {status.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={listRef} className="space-y-2 md:max-h-[400px] md:overflow-y-auto">
          {filtered.map((idea) => {
            const isNew = idea.id === lastCreatedId;
            const isRandom = idea.id === randomFlashId;
            const isSelected = selected?.id === idea.id;

            return (
              <div
                key={idea.id}
                id={`idea-${idea.id}`}
                onClick={() => setSelectedId(idea.id)}
                className={classNames(
                  "cursor-pointer rounded-lg border p-3 transition",
                  isSelected ? "border-zinc-500 bg-zinc-900/80" : "border-zinc-800",
                  isNew && "bg-emerald-500/10",
                  isRandom && "bg-purple-500/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm leading-6">{idea.content}</div>
                  <div className="shrink-0 text-xs text-zinc-400">
                    {STATUS_OPTIONS.find((s) => s.value === idea.status)?.icon}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag(tag);
                        }}
                        className={classNames(
                          "rounded-lg border px-2 py-1 text-xs",
                          activeTag === tag ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-700 text-zinc-400",
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-zinc-500">{formatDate(idea.updatedAt)}</div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-500">該当するひらめきがありません。</div>}
        </div>
      </div>
    </div>
  );
}
