"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  CircleDollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Upload,
  X,
  ChevronDown,
  Shield,
  AlertTriangle,
  Wallet,
  FileText,
  Trash2,
  ChevronRight,
  RotateCcw,
  Home,
  History,
  ArrowLeft,
} from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type CryptoNetwork = {
  id: number;
  network_key: string;
  display_name: string;
  currency_symbol: string;
  description: string | null;
  wallet_address: string | null;
  qr_code_path: string | null;
  is_enabled: boolean;
  display_order: number;
  min_deposit: number | null;
  max_deposit: number | null;
  payment_instructions?: string | null;
};

type InvestmentPlan = {
  id: number;
  name: string;
  description: string | null;
  min_deposit: number;
  max_deposit: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  is_active: boolean;
  sort_order: number;
};

type Deposit = {
  id: number;
  user_id: number;
  plan_id: number | null;
  plan_name?: string | null;
  amount: number;
  deposit_fee: number;
  credit_amount: number;
  method: string;
  network: string | null;
  reference: string | null;
  payer_account: string | null;
  request_reference: string | null;
  proof_file: string | null;
  evidence_path: string | null;
  admin_note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

const steps = [
  { label: "Process Deposit", icon: Wallet },
  { label: "Confirm Deposit", icon: FileText },
  { label: "Wallet Instructions", icon: CircleDollarSign },
  { label: "Required Info", icon: ArrowUpRight },
  { label: "Submit Request", icon: CheckCircle2 },
];

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-danger/10 text-danger", icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-muted-foreground/10 text-muted-foreground", icon: XCircle },
};

export function DepositView() {
  const [networks, setNetworks] = useState<CryptoNetwork[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number | null>(null);
  const [payerAccount, setPayerAccount] = useState("");
  const [reference, setReference] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyToast, setCopyToast] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: true, message: "" });
  const [currentStep, setCurrentStep] = useState(1);
  const [completedDeposit, setCompletedDeposit] = useState<Deposit | null>(null);
  const [expandedDeposit, setExpandedDeposit] = useState<number | null>(null);
  const [idempotencyKey] = useState(() => `dep-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [networksRes, plansRes, depositsRes] = await Promise.all([
          phpApi.cryptoNetworks(),
          phpApi.investmentPlans(),
          phpApi.deposits({ limit: 50 }),
        ]);
        if (active) {
          setNetworks(networksRes.networks as unknown as CryptoNetwork[]);
          setPlans(plansRes.plans as unknown as InvestmentPlan[]);
          setDeposits(depositsRes.deposits.items as unknown as Deposit[]);
        }
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const selectedNetworkData = networks.find((n) => n.id === selectedNetwork) ?? null;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const numericAmount = parseFloat(amount) || 0;

  // Fee calculation (display only — backend is authoritative)
  const depositFee = 0; // No fee configured by default
  const creditAmount = numericAmount - depositFee;
  const totalRequestAmount = numericAmount;

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }
    setEvidenceFile(file);
    setError("");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setEvidencePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setEvidencePreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeFile = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyWalletAddress = async () => {
    if (!selectedNetworkData?.wallet_address) return;
    const value = selectedNetworkData.wallet_address;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyToast({ show: true, success: true, message: "Wallet address copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setCopyToast((t) => ({ ...t, show: false })), 3000);
    } catch {
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setCopyToast({ show: true, success: true, message: "Wallet address copied to clipboard" });
        setTimeout(() => setCopied(false), 2000);
        setTimeout(() => setCopyToast((t) => ({ ...t, show: false })), 3000);
      } catch {
        setCopyToast({ show: true, success: false, message: "Failed to copy. Please copy manually." });
        setTimeout(() => setCopyToast((t) => ({ ...t, show: false })), 3000);
      }
    }
  };

  const validateStep1 = (): boolean => {
    if (!selectedPlanId) {
      setError("Please select an investment plan.");
      return false;
    }
    if (!selectedPlan) {
      setError("Selected plan is not available.");
      return false;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid deposit amount.");
      return false;
    }
    if (numericAmount < selectedPlan.min_deposit) {
      setError(`Minimum deposit for ${selectedPlan.name} is $${selectedPlan.min_deposit}.`);
      return false;
    }
    if (numericAmount > selectedPlan.max_deposit) {
      setError(`Maximum deposit for ${selectedPlan.name} is $${selectedPlan.max_deposit}.`);
      return false;
    }
    if (!selectedNetwork) {
      setError("Please select a payment network.");
      return false;
    }
    if (selectedNetworkData?.min_deposit && numericAmount < selectedNetworkData.min_deposit) {
      setError(`Minimum deposit for ${selectedNetworkData.display_name} is $${selectedNetworkData.min_deposit}.`);
      return false;
    }
    if (selectedNetworkData?.max_deposit && numericAmount > selectedNetworkData.max_deposit) {
      setError(`Maximum deposit for ${selectedNetworkData.display_name} is $${selectedNetworkData.max_deposit}.`);
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!payerAccount.trim()) {
      setError("Payer account / sender wallet is required.");
      return false;
    }
    if (payerAccount.trim().length < 4) {
      setError("Payer account must be at least 4 characters.");
      return false;
    }
    if (!reference.trim()) {
      setError("Transaction ID is required.");
      return false;
    }
    if (reference.trim().length < 6) {
      setError("Transaction ID must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const goToStep = (step: number) => {
    setError("");
    setSuccess("");
    setCurrentStep(step);
  };

  const handleContinueFromStep1 = () => {
    if (validateStep1()) {
      setError("");
      goToStep(2);
    }
  };

  const handleContinueFromStep2 = () => {
    goToStep(3);
  };

  const handleContinueFromStep3 = () => {
    goToStep(4);
  };

  const handleCancel = () => {
    // Reset form state without creating a deposit
    setSelectedPlanId(null);
    setAmount("");
    setSelectedNetwork(null);
    setPayerAccount("");
    setReference("");
    removeFile();
    setError("");
    setSuccess("");
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await phpApi.createDeposit({
        plan_id: selectedPlanId!,
        amount: numericAmount,
        network_id: selectedNetwork!,
        reference: reference.trim(),
        payer_account: payerAccount.trim(),
        evidence: evidenceFile ?? undefined,
        idempotency_key: idempotencyKey,
      });

      const deposit = response.deposit;
      setCompletedDeposit(deposit);
      setDeposits((prev) => [deposit, ...prev]);
      setCurrentStep(5);
      setSuccess("Deposit request submitted successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPlanId(null);
    setAmount("");
    setSelectedNetwork(null);
    setPayerAccount("");
    setReference("");
    removeFile();
    setError("");
    setSuccess("");
    setCompletedDeposit(null);
    setCurrentStep(1);
  };

  const refreshDeposits = async () => {
    try {
      const result = await phpApi.deposits({ limit: 50 });
      setDeposits(result.deposits.items as unknown as Deposit[]);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-7">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
        </div>
      </div>
    );
  }

  // ─── Confirmation Screen ────────────────────────────────────────────────
  if (currentStep === 5 && completedDeposit) {
    return (
      <div className="flex flex-col gap-7">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Deposit Confirmation</h1>
        </header>

        <div className="flex flex-col items-center gap-6 rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-success/10">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-success">Deposit Request Submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your deposit request has been submitted successfully and is awaiting administrative review.
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-warning">
              Sandbox Deposit — Manual Review Required
            </p>
          </div>
        </div>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h3 className="text-lg font-extrabold">Request Details</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Request Reference</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-bold">{completedDeposit.request_reference}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Plan</td>
                  <td className="px-4 py-2.5 font-bold">{completedDeposit.plan_name ?? "—"}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Amount</td>
                  <td className="px-4 py-2.5 font-bold">${completedDeposit.amount.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Cryptocurrency</td>
                  <td className="px-4 py-2.5">{completedDeposit.method}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Network</td>
                  <td className="px-4 py-2.5">{completedDeposit.network ?? "—"}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Submission Date</td>
                  <td className="px-4 py-2.5">{new Date(completedDeposit.created_at).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Transaction Reference</td>
                  <td className="px-4 py-2.5">{completedDeposit.reference ?? "—"}</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Evidence Upload</td>
                  <td className="px-4 py-2.5">{completedDeposit.proof_file ? "Attached" : "Not provided"}</td>
                </tr>
                <tr>
                  <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Status</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
                      <Clock size={12} /> Pending Review
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={resetForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            <RotateCcw size={16} /> Submit Another Request
          </button>
          <button
            onClick={() => { resetForm(); refreshDeposits(); }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold transition hover:border-primary/40"
          >
            <History size={16} /> View Deposit History
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold transition hover:border-primary/40"
          >
            <Home size={16} /> Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Multi-Step Form ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Deposit Funds</h1>
        <p className="mt-2 text-sm text-muted-foreground">Submit a deposit request. Funds are credited after admin approval.</p>
      </header>

      {/* Demo Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-bold text-warning">Sandbox Deposit Portal</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Submit a deposit request for administrative review. This is a sandbox environment — no real cryptocurrency payment is processed.
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = currentStep >= i + 1;
          const isCompleted = currentStep > i + 1;
          return (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive ? "bg-primary text-white" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-px w-4 ${isActive ? "bg-primary" : "bg-line"}`} />}
            </div>
          );
        })}
      </div>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      {/* Copy Toast Notification */}
      {copyToast.show && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
          copyToast.success
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}>
          {copyToast.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {copyToast.message}
        </div>
      )}

      {/* ─── STEP 1: Process Deposit ─────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign size={18} /></span>
              <div>
                <h2 className="text-lg font-extrabold">New Deposit</h2>
                <p className="text-xs text-muted-foreground">Choose a plan, amount, and payment method</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              {/* Plan Selection */}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Choose Plan
                <div className="relative mt-1.5">
                  <select
                    value={selectedPlanId ?? ""}
                    onChange={(e) => { setSelectedPlanId(e.target.value ? Number(e.target.value) : null); setError(""); }}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="" disabled>Select a plan</option>
                    {plans.filter(p => p.is_active).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — ${p.min_deposit} to ${p.max_deposit}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>

              {/* Plan Info */}
              {selectedPlan && (
                <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-sm font-bold">{selectedPlan.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedPlan.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <p className="font-bold text-muted-foreground">Min Deposit</p>
                      <p className="font-bold">${selectedPlan.min_deposit}</p>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <p className="font-bold text-muted-foreground">Max Deposit</p>
                      <p className="font-bold">${selectedPlan.max_deposit}</p>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <p className="font-bold text-muted-foreground">Daily Return</p>
                      <p className="font-bold">{selectedPlan.daily_return}%</p>
                    </div>
                    <div className="rounded-lg bg-surface-2/60 p-2">
                      <p className="font-bold text-muted-foreground">Duration</p>
                      <p className="font-bold">{selectedPlan.duration_days} days</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Deposit Amount (USD)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); }}
                  className={`${inputClass} mt-1.5`}
                  placeholder="Enter amount"
                />
              </label>

              {/* Payment Method */}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Payment Method
                <div className="relative mt-1.5">
                  <select
                    value={selectedNetwork ?? ""}
                    onChange={(e) => { setSelectedNetwork(e.target.value ? Number(e.target.value) : null); setError(""); }}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="" disabled>Select payment method</option>
                    {networks.map((n) => (
                      <option key={n.id} value={n.id}>Pay using {n.currency_symbol} ({n.display_name})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>

              <button
                type="button"
                onClick={handleContinueFromStep1}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </section>

          {/* Right: Network Info */}
          <section className="ui-card rounded-2xl p-5 sm:p-6">
            {selectedNetworkData ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Wallet size={18} /></span>
                  <div>
                    <h2 className="text-lg font-extrabold">{selectedNetworkData.display_name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedNetworkData.currency_symbol} Network</p>
                  </div>
                </div>

                {/* Demo Mode Notice */}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/5 px-3.5 py-2.5">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    <span className="font-bold text-warning">Sandbox Mode:</span> This is a simulated wallet identifier. No real cryptocurrency will be processed.
                  </p>
                </div>

                {/* Wallet Address Card */}
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Wallet Address</p>
                  {selectedNetworkData.wallet_address ? (
                    <div className="mt-2 rounded-xl border border-line bg-surface-2/60 p-3.5">
                      <code className="block break-all font-mono text-sm font-bold leading-6">
                        {selectedNetworkData.wallet_address}
                      </code>
                      <button
                        type="button"
                        onClick={copyWalletAddress}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Wallet'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-xl border border-warning/30 bg-warning/5 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0 text-warning" />
                        <p className="text-sm font-bold text-warning">Wallet Not Configured</p>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                        Wallet information has not been configured for this payment method. Please contact support or try again later.
                      </p>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {(selectedNetworkData.payment_instructions || selectedNetworkData.description) && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Payment Instructions</p>
                    <div className="mt-1.5 rounded-xl border border-line bg-surface-2/60 p-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {selectedNetworkData.payment_instructions || selectedNetworkData.description}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-line p-8 text-center">
                <Wallet size={32} className="text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">Select a Network</p>
                <p className="mt-1 text-xs text-muted-foreground">Choose a cryptocurrency network to view wallet details and payment instructions.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── STEP 2: Confirm Deposit ─────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileText size={18} /></span>
              <div>
                <h2 className="text-lg font-extrabold">Confirm Your Deposit</h2>
                <p className="text-xs text-muted-foreground">Review your selections before proceeding</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Selected Plan</p>
                <p className="mt-1 text-lg font-extrabold">{selectedPlan?.name ?? "—"}</p>
                {selectedPlan && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedPlan.daily_return}% daily for {selectedPlan.duration_days} days
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Deposit Amount</p>
                <p className="mt-1 text-lg font-extrabold">${numericAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Payment Method</p>
                <p className="mt-1 text-lg font-extrabold">{selectedNetworkData?.display_name ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedNetworkData?.currency_symbol} Network</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold transition hover:border-primary/40"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleContinueFromStep2}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-extrabold">Wallet Address</h3>
            <p className="mt-1 text-xs text-muted-foreground">Send {selectedNetworkData?.currency_symbol} to this address</p>

            {/* Demo Mode Notice */}
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/5 px-3.5 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-[11px] leading-4 text-muted-foreground">
                <span className="font-bold text-warning">Demo Mode:</span> This is a simulated wallet identifier. No real cryptocurrency will be processed.
              </p>
            </div>

            {selectedNetworkData?.wallet_address ? (
              <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3.5">
                <code className="block break-all font-mono text-sm font-bold leading-6">
                  {selectedNetworkData.wallet_address}
                </code>
                <button
                  type="button"
                  onClick={copyWalletAddress}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Wallet'}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-warning" />
                  <p className="text-sm font-bold text-warning">Wallet Not Configured</p>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Wallet information has not been configured for this payment method. Please contact support or try again later.
                </p>
              </div>
            )}

            {selectedNetworkData?.qr_code_path && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">QR Code</p>
                <div className="mt-1.5 flex items-center gap-4 rounded-xl border border-line bg-surface-2/60 p-4">
                  <div className="grid size-24 place-items-center rounded-lg bg-white p-2">
                    <div className="grid size-20 place-items-center rounded bg-[repeating-conic-gradient(#000_0%_25%,#fff_0%_50%)] bg-[length:8px_8px]">
                      <span className="rounded bg-white px-1 text-[8px] font-bold text-black">QR</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Scan to send</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Scan with your wallet app to send {selectedNetworkData.currency_symbol}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-warning">Sandbox QR — Not for real payments</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
              <Shield size={18} className="mt-0.5 shrink-0 text-danger" />
              <div>
                <p className="text-sm font-bold text-danger">Sandbox Mode — Do Not Send Real Funds</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This is a sandbox deposit portal. No real cryptocurrency transactions are processed. Do not send any real funds to this address.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ─── STEP 3: Deposit Summary ─────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign size={18} /></span>
              <div>
                <h2 className="text-lg font-extrabold">Deposit Summary</h2>
                <p className="text-xs text-muted-foreground">Review all details before submitting</p>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">PLAN</td>
                    <td className="px-4 py-2.5 font-bold">{selectedPlan?.name ?? "—"}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">AMOUNT</td>
                    <td className="px-4 py-2.5 font-bold">${numericAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">PAYMENT METHOD</td>
                    <td className="px-4 py-2.5">{selectedNetworkData?.currency_symbol} — {selectedNetworkData?.display_name}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">NETWORK</td>
                    <td className="px-4 py-2.5">{selectedNetworkData?.display_name ?? "—"}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">CREDIT AMOUNT</td>
                    <td className="px-4 py-2.5 font-bold text-primary">${creditAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">DEPOSIT FEE</td>
                    <td className="px-4 py-2.5">{depositFee > 0 ? `$${depositFee.toFixed(2)}` : "$0.00 (No fee)"}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">TOTAL REQUEST AMOUNT</td>
                    <td className="px-4 py-2.5 font-bold">${totalRequestAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">REQUEST REFERENCE</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">Will be generated on submission</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold transition hover:border-primary/40"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={handleContinueFromStep3}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-extrabold">Plan Details</h3>
            {selectedPlan && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-sm font-bold">{selectedPlan.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedPlan.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <p className="font-bold text-muted-foreground">Daily Return</p>
                    <p className="mt-0.5 text-sm font-extrabold">{selectedPlan.daily_return}%</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <p className="font-bold text-muted-foreground">Duration</p>
                    <p className="mt-0.5 text-sm font-extrabold">{selectedPlan.duration_days} days</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <p className="font-bold text-muted-foreground">Total Return</p>
                    <p className="mt-0.5 text-sm font-extrabold">{selectedPlan.total_return}%</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/60 p-3">
                    <p className="font-bold text-muted-foreground">Principal Return</p>
                    <p className="mt-0.5 text-sm font-extrabold">Yes</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── STEP 4: Required Information ────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ArrowUpRight size={18} /></span>
              <div>
                <h2 className="text-lg font-extrabold">Required Information</h2>
                <p className="text-xs text-muted-foreground">Provide transaction details and supporting evidence</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              {/* Payer Account */}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Payer Account / Sender Wallet
                <input
                  value={payerAccount}
                  onChange={(e) => { setPayerAccount(e.target.value); setError(""); }}
                  maxLength={190}
                  className={`${inputClass} mt-1.5`}
                  placeholder="e.g. bc1q... or 0x..."
                />
              </label>

              {/* Transaction ID */}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Transaction ID
                <input
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setError(""); }}
                  maxLength={120}
                  className={`${inputClass} mt-1.5`}
                  placeholder="e.g. TXN123456789"
                />
              </label>

              {/* Evidence Upload */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Supporting Evidence (Demo)</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                  className={`mt-1.5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                    dragOver ? "border-primary bg-primary/5" : "border-line bg-surface-2/30"
                  }`}
                >
                  {evidenceFile ? (
                    <div className="flex w-full items-center gap-3">
                      {evidencePreview ? (
                        <img src={evidencePreview} alt="Preview" className="size-14 rounded-lg object-cover" />
                      ) : (
                        <div className="grid size-14 place-items-center rounded-lg bg-primary/10 text-primary"><FileText size={20} /></div>
                      )}
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-bold">{evidenceFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(evidenceFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={removeFile} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-danger/40 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-muted-foreground" />
                      <p className="mt-2 text-sm font-bold">Drag & drop or click to upload</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, WebP, or PDF (max 5MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Uploaded files serve as supporting evidence for a simulated deposit request only.
                </p>
              </div>
            </div>
          </section>

          <section className="ui-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-extrabold">Submission Summary</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Plan</td>
                    <td className="px-4 py-2.5 font-bold">{selectedPlan?.name ?? "—"}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Amount</td>
                    <td className="px-4 py-2.5 font-bold">${numericAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Payment Method</td>
                    <td className="px-4 py-2.5">{selectedNetworkData?.currency_symbol} — {selectedNetworkData?.display_name}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Network</td>
                    <td className="px-4 py-2.5">{selectedNetworkData?.display_name ?? "—"}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Credit Amount</td>
                    <td className="px-4 py-2.5 font-bold text-primary">${creditAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Deposit Fee</td>
                    <td className="px-4 py-2.5">{depositFee > 0 ? `$${depositFee.toFixed(2)}` : "$0.00 (No fee)"}</td>
                  </tr>
                  <tr>
                    <td className="bg-surface-2/40 px-4 py-2.5 font-bold text-muted-foreground">Total Request</td>
                    <td className="px-4 py-2.5 font-bold">${totalRequestAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-bold text-warning">Important Notice</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submitting this form creates a deposit request for administrative review. No real cryptocurrency transaction is processed. Your account balance will be credited only after an administrator approves this request.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold transition hover:border-primary/40"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 text-sm font-bold text-danger transition hover:border-danger/50"
              >
                <X size={16} /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Check size={16} /> Save Deposit
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ─── Deposit History ──────────────────────────────────────────────── */}
      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Deposit History</h2>
          <button
            onClick={refreshDeposits}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Network</th>
                <th className="pb-3">Tx Reference</th>
                <th className="pb-3">Evidence</th>
                <th className="pb-3">Status</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">No deposit requests yet.</td>
                </tr>
              ) : (
                deposits.map((d) => {
                  const cfg = statusConfig[d.status];
                  const Icon = cfg.icon;
                  const isExpanded = expandedDeposit === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr
                        className="cursor-pointer border-b border-line/50 transition hover:bg-surface-2/30"
                        onClick={() => setExpandedDeposit(isExpanded ? null : d.id)}
                      >
                        <td className="py-3 font-mono text-xs font-bold">{d.request_reference ?? `DEP-${d.id}`}</td>
                        <td className="py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="py-3">{d.plan_name ?? "—"}</td>
                        <td className="py-3 font-bold">${d.amount.toFixed(2)}</td>
                        <td className="py-3 capitalize">{d.network ?? d.method}</td>
                        <td className="py-3 text-muted-foreground">{d.reference ?? "—"}</td>
                        <td className="py-3">{d.proof_file ? "Attached" : "—"}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.className}`}>
                            <Icon size={12} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <ChevronRight size={14} className={`transition ${isExpanded ? "rotate-90" : ""}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${d.id}-detail`} className="border-b border-line/50 bg-surface-2/20">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                              <div>
                                <p className="font-bold text-muted-foreground">Payer Account</p>
                                <p className="mt-0.5">{d.payer_account ?? "—"}</p>
                              </div>
                              <div>
                                <p className="font-bold text-muted-foreground">Deposit Fee</p>
                                <p className="mt-0.5">${d.deposit_fee.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-bold text-muted-foreground">Credit Amount</p>
                                <p className="mt-0.5">${d.credit_amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="font-bold text-muted-foreground">Reviewed By</p>
                                <p className="mt-0.5">{d.reviewed_at ? new Date(d.reviewed_at).toLocaleString() : "—"}</p>
                              </div>
                              {d.admin_note && (
                                <div className="col-span-2 sm:col-span-4">
                                  <p className="font-bold text-muted-foreground">Admin Note</p>
                                  <p className="mt-0.5">{d.admin_note}</p>
                                </div>
                              )}
                              {d.proof_file && (
                                <div className="col-span-2 sm:col-span-4">
                                  <p className="font-bold text-muted-foreground">Evidence</p>
                                  <a
                                    href={phpApi.depositEvidenceUrl(d.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-0.5 inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <FileText size={12} /> View Evidence File
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
