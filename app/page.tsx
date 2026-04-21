"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type StatusValue = "seed" | "growing" | "ready" | "done";

type Idea = {
  id: string;
  content: string;
  status: StatusValue;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type StatusOption = {
  value: StatusValue;
  label: string;
  icon: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "seed", label: "種", icon: "🌱" },
  { value: "growing", label: "育成中", icon: "🌿" },
  { value: "ready", label: "使える", icon: "🔥" },
  { value: "done", label: "使用済み", icon: "✔" },
];

const STORAGE_KEY = "hirameki-techo-v0";

const initialIdeas: Idea[] = [];

function classNames(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

function formatDate(value: string): string {
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

function getAllTags(ideas: Idea[]): string[] {
  return [...new Set(ideas.flatMap((idea) => idea.tags))];
}

function loadIdeas(): Idea[] {
  if (typeof window === "undefined") return initialIdeas;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialIdeas;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return initialIdeas;
    return parsed as Idea[];
  } catch {
    return initialIdeas;
  }
}

function runTests(): void {
  console.assert(classNames("a", false, "b") === "a b", "classNames should join truthy values");
  console.assert(classNames("a", undefined, null, "b") === "a b", "classNames should ignore undefined and null");
  console.assert(
    getAllTags([
      { ...initialIdeas[0], tags: ["x", "y"] },
      { ...initialIdeas[1], tags: ["y", "z"] },
    ]).length === 3,
    "getAllTags should dedupe tags",
  );
  console.assert(
    STATUS_OPTIONS.find((s) => s.value === "seed")?.label === "種",
    "seed status should exist",
  );
  console.assert(loadIdeas().length >= 1, "loadIdeas should always return at least one idea");
}

runTests();

export default function App(): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [randomFlashId, setRandomFlashId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusValue | null>(null);
  const [draftTag, setDraftTag] = useState<string>("");

  useEffect(() => {
    setIdeas(loadIdeas());
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
    const timer = window.setTimeout(() => setLastCreatedId(null), 800);
    return () => window.clearTimeout(timer);
  }, [lastCreatedId]);

  useEffect(() => {
    if (!randomFlashId) return;
    const timer = window.setTimeout(() => setRandomFlashId(null), 800);
    return () => window.clearTimeout(timer);
  }, [randomFlashId]);

  const filtered = useMemo<Idea[]>(() => {
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
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [ideas, search, activeTag, activeStatus]);

  const selected = ideas.find((idea) => idea.id === selectedId) ?? null;
  const allTags = getAllTags(ideas);
  const mainValue = selected ? selected.content : input;

  function patchIdea(id: string, patch: Partial<Idea>): void {
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

  function createIdea(): void {
    const content = input.trim();
    if (!content) return;

    const now = new Date().toISOString();
    const next: Idea = {
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

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function scrollToEditor(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function pickRandom(): void {
    if (!ideas.length) return;
    const picked = ideas[Math.floor(Math.random() * ideas.length)];
    setSelectedId(picked.id);
    setRandomFlashId(picked.id);
    scrollToEditor();
  }

  function handleMainKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (selected) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createIdea();
    }
  }

  function toggleTag(tag: string): void {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }

  function toggleStatus(status: StatusValue): void {
    setActiveStatus((prev) => (prev === status ? null : status));
  }

  function addTagToSelected(): void {
    if (!selected) return;
    const value = draftTag.trim().replace(/^#/, "");
    if (!value) return;
    if (selected.tags.includes(value)) {
      setDraftTag("");
      return;
    }

    patchIdea(selected.id, { tags: [...selected.tags, value] });
    setDraftTag("");

    requestAnimationFrame(() => {
      tagInputRef.current?.focus();
    });
  }

  function removeTagFromSelected(tag: string): void {
    if (!selected) return;
    const nextTags = selected.tags.filter((t) => t !== tag);
    patchIdea(selected.id, { tags: nextTags });

    if (activeTag === tag && !ideas.some((idea) => idea.id !== selected.id && idea.tags.includes(tag))) {
      setActiveTag(null);
    }
  }

  function clearSelection(): void {
    setSelectedId(null);
    setDraftTag("");
    setInput("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function deleteIdea(id: string, e?: React.MouseEvent<HTMLButtonElement>): void {
    e?.stopPropagation();

    const nextIdeas = ideas.filter((idea) => idea.id !== id);

    setIdeas(nextIdeas);
    setSelectedId(null);
    setInput("");
    setDraftTag("");
    setLastCreatedId(null);
    setRandomFlashId(null);

    if (isHydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdeas));
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-3 text-zinc-100 sm:p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold md:text-3xl">ひらめき手帳</h1>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200"
            >
              新規
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              整理
            </button>
            <button type="button" onClick={pickRandom} className="rounded-xl border px-3 py-2 text-sm">
              ランダム
            </button>
            {(activeTag || activeStatus) && (
              <button
                type="button"
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
          <div className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
            使い方：
・思いついたらそのまま入力 → Enterで保存
・過去のメモをタップすると編集できます
・タグやステータスで整理できます
・ランダムで過去のひらめきを再発見できます
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
            {activeTag && (
              <span className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-2 py-1">
                #{activeTag}
              </span>
            )}
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
                  type="button"
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
                  type="button"
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

        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm text-zinc-400">{selected ? "📝 編集中" : "✏️ 新規メモ"}</div>
        </div>

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
          placeholder="思いつきを書く…（Enterで保存 / Shift+Enterで改行）"
          className="mb-3 h-28 w-full rounded-3xl bg-zinc-900 p-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 md:h-24 md:p-3"
        />

        {!selected && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={createIdea}
              className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
            >
              保存
            </button>
          </div>
        )}

        {selected && (
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-zinc-400">このメモの整理</div>
              <button
                type="button"
                onClick={(e) => deleteIdea(selected.id, e)}
                className="rounded-lg border border-red-500/50 px-2 py-1 text-xs text-red-300"
              >
                削除
              </button>
            </div>

            <div className="mb-2 text-xs text-zinc-400">タグ</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {selected.tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={classNames(
                      "rounded-lg border px-2 py-1 text-xs",
                      activeTag === tag ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-700",
                    )}
                  >
                    #{tag}
                  </button>
                  <button
                    type="button"
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
              <button type="button" onClick={addTagToSelected} className="rounded-xl border px-3 py-2 text-sm">
                追加
              </button>
            </div>

            <div className="mb-2 text-xs text-zinc-400">ステータス</div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  type="button"
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
                onClick={() => {
                  setSelectedId(idea.id);
                  scrollToEditor();
                }}
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
                        type="button"
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
          {filtered.length === 0 && (
            <div className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-500">
              該当するひらめきがありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
