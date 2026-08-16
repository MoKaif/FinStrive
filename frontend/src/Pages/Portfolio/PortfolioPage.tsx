import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  CostBasisOverride,
  ImportError,
  SnapshotDetail,
  SnapshotSummary,
  TimelinePoint,
} from "../../Models/Holdings";
import {
  deleteCostBasisOverride,
  deleteSnapshot,
  getCostBasisOverrides,
  getLatestSnapshot,
  getSnapshot,
  getSnapshots,
  getTimeline,
  importStatement,
  saveCostBasisOverride,
} from "../../Services/HoldingsService";
import { PortfolioTimeline } from "../../Models/TransactionHistory";
import {
  getPortfolioTimeline,
  importTransactionHistory,
} from "../../Services/TransactionHistoryService";
import PortfolioGrowth from "../../Components/Portfolio/PortfolioGrowth";
import StatementBar from "../../Components/Portfolio/StatementBar";
import ReconciliationBlock from "../../Components/Portfolio/ReconciliationBlock";
import AllocationStrip from "../../Components/Portfolio/AllocationStrip";
import PortfolioHistory from "../../Components/Portfolio/PortfolioHistory";
import HoldingsTable from "../../Components/Portfolio/HoldingsTable";
import AdjustmentsPanel from "../../Components/Portfolio/AdjustmentsPanel";
import CostBasisDialog from "../../Components/Portfolio/CostBasisDialog";

const asDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN");

const PortfolioPage: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [current, setCurrent] = useState<SnapshotDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [overrides, setOverrides] = useState<CostBasisOverride[]>([]);
  const [growth, setGrowth] = useState<PortfolioTimeline | null>(null);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingHistory, setImportingHistory] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  // undefined = dialog closed, null = adding, object = editing.
  const [editingRule, setEditingRule] = useState<CostBasisOverride | null | undefined>(undefined);

  const loadAll = useCallback(async (snapshotId?: number) => {
    const [list, points, rules, curve] = await Promise.all([
      getSnapshots(),
      getTimeline(),
      getCostBasisOverrides(),
      // The history is optional; the rest of the page must load without it.
      getPortfolioTimeline().catch(() => null),
    ]);
    setSnapshots(list);
    setTimeline(points);
    setOverrides(rules);
    setGrowth(curve);
    setCurrent(snapshotId ? await getSnapshot(snapshotId) : await getLatestSnapshot());
  }, []);

  useEffect(() => {
    loadAll()
      .catch(() => toast.error("Could not load your holdings."))
      .finally(() => setLoading(false));
  }, [loadAll]);

  const runImport = async (file: File, replace: boolean) => {
    setImporting(true);
    try {
      const result = await importStatement(file, replace);
      await loadAll(result.snapshot.id);

      const verb = result.outcome === "Replaced" ? "Replaced" : "Imported";
      toast.success(`${verb} the ${asDate(result.snapshot.statementDate)} statement.`);
      if (result.warnings.length > 0) {
        toast.warn(`${result.warnings.length} figure(s) did not reconcile. See corrections below.`);
      }
    } catch (error) {
      // A statement already exists for this date; overwriting is the user's call.
      if (error instanceof ImportError && error.isReplaceable) {
        setImporting(false);
        if (window.confirm(`${error.message}\n\nReplace the existing statement?`)) {
          await runImport(file, true);
        }
        return;
      }
      toast.error(error instanceof ImportError ? error.message : "The statement could not be imported.");
    } finally {
      setImporting(false);
    }
  };

  const runHistoryImport = async (file: File) => {
    setImportingHistory(true);
    try {
      const result = await importTransactionHistory(file);
      await loadAll(current?.id);

      const verb = result.outcome === "Replaced" ? "Replaced" : "Imported";
      toast.success(`${verb} ${result.import.transactionCount} investment transactions.`);
      result.warnings.forEach((warning) => toast.warn(warning));
    } catch (error) {
      toast.error(error instanceof ImportError ? error.message : "The history could not be imported.");
    } finally {
      setImportingHistory(false);
    }
  };

  const selectSnapshot = async (id: number) => {
    try {
      setCurrent(await getSnapshot(id));
    } catch {
      toast.error("Could not open that statement.");
    }
  };

  const removeSnapshot = async () => {
    if (!current) return;
    if (!window.confirm(`Delete the ${asDate(current.statementDate)} statement?`)) return;

    try {
      await deleteSnapshot(current.id);
      await loadAll();
      toast.success("Statement deleted.");
    } catch {
      toast.error("Could not delete that statement.");
    }
  };

  const saveRule = async (values: Parameters<typeof saveCostBasisOverride>[0]) => {
    setSavingRule(true);
    try {
      await saveCostBasisOverride(values);
      await loadAll(current?.id);
      setEditingRule(undefined);
      toast.success("Correction saved and applied to every statement.");
    } catch {
      toast.error("Could not save the correction.");
    } finally {
      setSavingRule(false);
    }
  };

  const removeRule = async (id: number) => {
    setSavingRule(true);
    try {
      await deleteCostBasisOverride(id);
      await loadAll(current?.id);
      setEditingRule(undefined);
      toast.success("Correction removed.");
    } catch {
      toast.error("Could not remove the correction.");
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
      <div className="mx-auto max-w-[88rem] space-y-5">
        <StatementBar
          snapshots={snapshots}
          current={current}
          importing={importing}
          onSelect={selectSnapshot}
          onFile={(file) => runImport(file, false)}
          onDelete={removeSnapshot}
        />

        {loading ? (
          <p className="term-label py-20 text-center">Loading…</p>
        ) : !current ? (
          <>
            <section className="term-panel px-8 py-16 text-center">
              <h2 className="font-display text-[20px] font-semibold text-term-text">No statements yet</h2>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-term-muted">
                Import your monthly Value Research holdings statement. Instruments held across several
                folios are combined without double-counting, and your standing cost corrections are
                applied on every import.
              </p>
            </section>

            {/* The history stands on its own — it needs no statement to be useful. */}
            <PortfolioGrowth
              timeline={growth}
              importing={importingHistory}
              onFile={runHistoryImport}
            />
          </>
        ) : (
          <>
            <ReconciliationBlock
              snapshot={current}
              onShowAdjustments={() =>
                document.getElementById("adjustments")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />

            <PortfolioGrowth
              timeline={growth}
              importing={importingHistory}
              onFile={runHistoryImport}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <AllocationStrip sections={current.sections} totalMarketValue={current.totalMarketValue} />
              <PortfolioHistory points={timeline} />
            </div>

            <HoldingsTable sections={current.sections} showChange={current.previousSnapshot !== null} />

            <AdjustmentsPanel
              adjustments={current.adjustments}
              warnings={current.warnings}
              overrides={overrides}
              onAddOverride={() => setEditingRule(null)}
              onEditOverride={(rule) => setEditingRule(rule)}
            />
          </>
        )}
      </div>

      {editingRule !== undefined && (
        <CostBasisDialog
          rule={editingRule}
          saving={savingRule}
          onSave={saveRule}
          onDelete={removeRule}
          onClose={() => setEditingRule(undefined)}
        />
      )}
    </div>
  );
};

export default PortfolioPage;
