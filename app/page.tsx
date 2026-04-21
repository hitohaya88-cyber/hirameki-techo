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

const initialIdeas: Idea[] = [
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
  return [...new Set(ideas.flatMap((idea: Idea) => idea.tags))];
}

function runTests(): void {
  console.assert(classNames("a", false, "b") === "a b", "classNames should join truthy values");
  console.assert(getAllTags([{ ...initialIdeas[0], tags: ["x", "y"] }, { ...initialIdeas[1], tags: ["y", "z"] }]).length === 3, "getAllTags should dedupe tags");
  console.assert(STATUS_OPTIONS.find((s: StatusOption) => s.value === "seed")?.label === "種", "seed status should exist");
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
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIdeas(initialIdeas);
      } else {
        const parsed = JSON.parse(raw) as Idea[];
        setIdeas(Array.isArray(parsed) && parsed.length ? parsed : initialIdeas);
      }
    } catch {
      setIdeas(initialIdeas);
    } finally {
      setIsHydrated(true);
    }
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
    const t = window.setTimeout(() => setLastCreatedId(null), 800);
    return () => window.clearTimeout(t);
  }, [lastCreatedId]);

  useEffect(() => {
    if (!randomFlashId) return;
    const t = window.setTimeout(() => setRandomFlashId(null), 800);
    return () => window.clearTimeout(t);
  }, [randomFlashId]);

  const filtered = useMemo<Idea[]>(() => {
    const keyword = search.trim().toLowerCase();

    return [...ideas]
      .filter(
        (idea: Idea) =>
          !keyword ||
          idea.content.toLowerCase().includes(keyword) ||
          idea.tags.some((tag: string) => tag.toLowerCase().includes(keyword)),
      )
      .filter((idea: Idea) => !activeTag || idea.tags.includes(activeTag))
      .filter((idea: Idea) => !activeStatus || idea.status === activeStatus)
      .sort((a: Idea, b: Idea) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [ideas, search, activeTag, activeStatus]);

  const selected: Idea | null = ideas.find((idea: Idea) => idea.id === selectedId) || null;

  useEffect(() => {
    if (selectedId) return;
    if (filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [selectedId, filtered]);

  function patchIdea(id: string, patch: Partial<Idea>): void {
    setIdeas((prev: Idea[]) =>
      prev.map((idea: Idea) =>
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

    setIdeas((prev: Idea[]) => [next, ...prev]);
    setSelectedId(next.id);
    setLastCreatedId(next.id);
    setInput("");
    setDraftTag("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pickRandom(): void {
    if (!ideas.length) return;
    const picked = ideas[Math.floor(Math.random() * ideas.length)];
    setSelectedId(picked.id);
    setRandomFlashId(picked.id);
    document.getElementById(`idea-${picked.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleMainKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (selected) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createIdea();
    }
  }

  function toggleTag(tag: string): void {
    setActiveTag((prev: string | null) => (prev === tag ? null : tag));
  }

  function toggleStatus(status: StatusValue): void {
    setActiveStatus((prev: StatusValue | null) => (prev === status ? null : status));
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
    requestAnimationFrame(() => tagInputRef.current?.focus());
  }

  function removeTagFromSelected(tag: string): void {
    if (!selected) return;
    const nextTags = selected.tags.filter((t: string) => t !== tag);
    patchIdea(selected.id, { tags: nextTags });
    if (activeTag === tag && !ideas.some((idea: Idea) => idea.id !== selected.id && idea.tags.includes(tag))) {
      setActiveTag(null);
    }
  }

  function clearSelection(): void {
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
            <button onClick={() => setShowFilters((v: boolean) => !v)} className="rounded-lg border px-2 py-1 text-xs">整理</button>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="検索"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm md:w-auto"
          />
        </div>

        {(activeTag || activeStatus) && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-zinc-300">
            {activeTag && <span className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-2 py-1">#{activeTag}</span>}
            {activeStatus && (
              <span className="rounded-lg border border-purple-500/60 bg-purple-500/10 px-2 py-1">
                {STATUS_OPTIONS.find((s: StatusOption) => s.value === activeStatus)?.icon} {STATUS_OPTIONS.find((s: StatusOption) => s.value === activeStatus)?.label}
              </span>
            )}
          </div>
        )}

        {showFilters && (
          <div className="mb-4 rounded-2xl border border-zinc-800 p-3">
            <div className="mb-2 text-xs text-zinc-400">タグ</div>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 && <div className="text-xs text-zinc-500">タグはまだありません</div>}
              {allTags.map((tag: string) => (
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
              {STATUS_OPTIONS.map((status: StatusOption) => (
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
              {selected.tags.map((tag: string) => (
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftTag(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
              {STATUS_OPTIONS.map((status: StatusOption) => (
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
          {filtered.map((idea: Idea) => {
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
                    {STATUS_OPTIONS.find((s: StatusOption) => s.value === idea.status)?.icon}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag: string) => (
                      <button
                        key={tag}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
