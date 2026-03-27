"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Search, Pencil, Trash2, X, Check, Settings } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Customer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { sheets: number };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const INPUT =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-[18px] focus:border-[#CC0000] focus:outline-none";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newName, setNewName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ---- Fetch customers ----
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ---- Debounced search (300ms) ----
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ---- Filtered list (client-side) ----
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  // ---- Create customer ----
  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created: Customer = await res.json();
      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowNewPrompt(false);
      setNewName("");
    } catch (err) {
      console.error("Error creating customer:", err);
    }
  };

  // ---- Rename customer ----
  const startEditing = (c: Customer) => {
    setEditingId(c.id);
    setEditName(c.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/customers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setCustomers((prev) =>
        prev
          .map((c) => (c.id === editingId ? { ...c, name: trimmed } : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      console.error("Error renaming customer:", err);
    }
    setEditingId(null);
  };

  // ---- Delete customer ----
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting customer:", err);
    }
    setDeletingId(null);
  };

  // ---- Format date ----
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ---- Focus new-customer input when prompt opens ----
  useEffect(() => {
    if (showNewPrompt) {
      setTimeout(() => newInputRef.current?.focus(), 50);
    }
  }, [showNewPrompt]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-6 max-w-4xl mx-auto">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center justify-center text-gray-500 hover:text-white rounded-xl hover:bg-[#1e1e1e] active:bg-[#2a2a2a] transition-colors"
            style={{ width: 48, height: 48 }}
            aria-label="Settings"
          >
            <Settings size={22} />
          </button>
          <button
            onClick={() => setShowNewPrompt(true)}
            className="flex items-center gap-2 bg-[#CC0000] text-white font-semibold px-5 py-3 rounded-xl text-base active:opacity-80 transition-opacity"
            style={{ minHeight: 48 }}
          >
            <Plus size={20} />
            New Customer
          </button>
        </div>
      </div>

      {/* ---- New Customer Prompt ---- */}
      {showNewPrompt && (
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 mb-6 flex gap-3 items-center">
          <input
            ref={newInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowNewPrompt(false);
                setNewName("");
              }
            }}
            placeholder="Customer name"
            className={INPUT + " flex-1"}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center bg-[#CC0000] text-white rounded-xl active:opacity-80 transition-opacity"
            style={{ width: 48, height: 48 }}
            aria-label="Create customer"
          >
            <Check size={22} />
          </button>
          <button
            onClick={() => {
              setShowNewPrompt(false);
              setNewName("");
            }}
            className="flex items-center justify-center bg-[#1e1e1e] text-gray-400 rounded-xl hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
            style={{ width: 48, height: 48 }}
            aria-label="Cancel"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* ---- Search Bar ---- */}
      <div className="relative mb-6">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className={INPUT + " pl-12"}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ---- Customer Grid ---- */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 mt-16">
          {customers.length === 0
            ? 'No customers yet. Tap "New Customer" to get started.'
            : "No customers match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="relative group">
              {/* ---- Delete Confirmation Overlay ---- */}
              {deletingId === c.id && (
                <div className="absolute inset-0 z-20 bg-[#141414]/95 border border-red-900 rounded-xl flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-white text-center text-sm">
                    Delete <span className="font-bold">{c.name}</span> and all
                    their sheets?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="bg-[#CC0000] text-white font-semibold px-5 py-2.5 rounded-lg active:opacity-80 transition-opacity"
                      style={{ minHeight: 44 }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="bg-[#2a2a2a] text-gray-300 px-5 py-2.5 rounded-lg hover:bg-[#333] active:bg-[#444] transition-colors"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ---- Card ---- */}
              <div
                onClick={() => {
                  if (editingId === c.id || deletingId === c.id) return;
                  router.push(`/customers/${c.id}`);
                }}
                className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 cursor-pointer hover:border-[#2a2a2a] active:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FolderOpen
                    size={28}
                    className="text-[#CC0000] shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Editable name */}
                    {editingId === c.id ? (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={commitRename}
                          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-lg font-semibold focus:border-[#CC0000] focus:outline-none w-full"
                          style={{ fontSize: 18 }}
                        />
                      </div>
                    ) : (
                      <h2 className="text-lg font-semibold text-white truncate">
                        {c.name}
                      </h2>
                    )}

                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400">
                      <span>
                        {c._count.sheets}{" "}
                        {c._count.sheets === 1 ? "sheet" : "sheets"}
                      </span>
                      <span>Updated {fmtDate(c.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startEditing(c)}
                      className="flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
                      style={{ width: 44, height: 44 }}
                      aria-label={`Rename ${c.name}`}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="flex items-center justify-center text-gray-500 hover:text-red-500 rounded-lg hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
                      style={{ width: 44, height: 44 }}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
