"use client";

import * as React from "react";
import { useState } from "react";
import { Customer } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { searchCustomersAction, createCustomerAction } from "@/server/actions/customers";

interface CustomerPickerProps {
  businessId: string;
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
}

/**
 * Search-by-phone-first, per the spec: typing a phone number should surface
 * an existing customer before offering "add new", to avoid duplicate
 * customer records piling up over time.
 */
export function CustomerPicker({ businessId, selected, onSelect }: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  async function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const found = await searchCustomersAction({ businessId, query: value.trim() });
      setResults(found);
    } finally {
      setSearching(false);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-surface p-3">
        <div>
          <p className="font-medium">{selected.name}</p>
          <p className="text-sm text-ink/60">{selected.phone}</p>
        </div>
        <button onClick={() => onSelect(null as unknown as Customer)} className="text-sm text-marigold">
          Change
        </button>
      </div>
    );
  }

  if (showNewForm) {
    return (
      <NewCustomerForm
        businessId={businessId}
        initialPhone={/^\d+$/.test(query) ? query : ""}
        onCreated={(c) => {
          onSelect(c);
          setShowNewForm(false);
        }}
        onCancel={() => setShowNewForm(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-surface px-3">
        <Search className="h-4 w-4 shrink-0 text-ink/40" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by name or phone"
          className="h-11 border-0 px-0 text-base focus-visible:ring-0"
          autoFocus
        />
      </div>

      {searching && <p className="mt-2 text-sm text-ink/50">Searching…</p>}

      {!searching && results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="flex items-center justify-between rounded-lg border border-surface p-3 text-left"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-ink/60">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowNewForm(true)}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-marigold"
      >
        <Plus className="h-4 w-4" /> Add new customer
      </button>
    </div>
  );
}

function NewCustomerForm({
  businessId,
  initialPhone,
  onCreated,
  onCancel,
}: {
  businessId: string;
  initialPhone: string;
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createCustomerAction({
        businessId,
        name,
        phone,
        whatsappNumber: whatsapp || null,
        email: email || null,
      });
      onCreated(created);
    } catch {
      setError("We couldn't save this customer. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Customer name"
        className="h-12 text-base"
        required
        autoFocus
      />
      <Input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
        className="h-12 text-base"
        required
      />
      <Input
        type="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="WhatsApp number (optional)"
        className="h-12 text-base"
      />
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional)"
        className="h-12 text-base"
      />
      {error && <p className="text-sm text-tamarind">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="h-11 flex-1 bg-marigold text-white hover:bg-marigold/90"
        >
          {saving ? "Saving…" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
