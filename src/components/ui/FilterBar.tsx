import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Filter } from "lucide-react";

/** A single active filter */
export interface FilterChip {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface FilterBarProps {
    /** Available fields to filter on */
    fields: { key: string; label: string; values: string[] }[];
    /** Current active filters */
    filters: FilterChip[];
    /** Called when filters change */
    onChange: (filters: FilterChip[]) => void;
}

type DropdownStep = "field" | "operator" | "value";

const OPERATORS = [
    { key: "equals", label: "Eşittir" },
    { key: "not_equals", label: "Eşit Değil" },
    { key: "contains", label: "İçerir" },
];

/**
 * Linear-style filter bar with chip-based filters.
 * Clicking "Add Filter" opens a 3-step dropdown: Field → Operator → Value.
 * Active filters are displayed as removable chips.
 */
export function FilterBar({ fields, filters, onChange }: FilterBarProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [step, setStep] = useState<DropdownStep>("field");
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [selectedOp, setSelectedOp] = useState<string | null>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const resetDropdown = useCallback(() => {
        setDropdownOpen(false);
        setStep("field");
        setSelectedField(null);
        setSelectedOp(null);
    }, []);

    const handleFieldSelect = (fieldKey: string) => {
        setSelectedField(fieldKey);
        setStep("operator");
    };

    const handleOpSelect = (opKey: string) => {
        setSelectedOp(opKey);
        setStep("value");
    };

    const handleValueSelect = (value: string) => {
        if (!selectedField || !selectedOp) return;
        const newFilter: FilterChip = {
            id: `${selectedField}-${selectedOp}-${value}-${Date.now()}`,
            field: selectedField,
            operator: selectedOp,
            value,
        };
        onChange([...filters, newFilter]);
        resetDropdown();
    };

    const removeFilter = (id: string) => {
        onChange(filters.filter((f) => f.id !== id));
    };

    const fieldMeta = (key: string) => fields.find((f) => f.key === key);
    const opLabel = (key: string) => OPERATORS.find((o) => o.key === key)?.label ?? key;

    const currentField = selectedField ? fieldMeta(selectedField) : null;

    const getDropdownItems = (): { key: string; label: string }[] => {
        switch (step) {
            case "field":
                return fields.map((f) => ({ key: f.key, label: f.label }));
            case "operator":
                return OPERATORS;
            case "value":
                return currentField?.values.map((v) => ({ key: v, label: v })) ?? [];
            default:
                return [];
        }
    };

    const handleItemClick = (key: string) => {
        switch (step) {
            case "field": handleFieldSelect(key); break;
            case "operator": handleOpSelect(key); break;
            case "value": handleValueSelect(key); break;
        }
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Active filter chips */}
            <AnimatePresence mode="popLayout">
                {filters.map((filter) => (
                    <motion.div
                        key={filter.id}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border"
                        style={{
                            background: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                        }}
                    >
                        <span style={{ color: "var(--text-muted)" }}>
                            {fieldMeta(filter.field)?.label ?? filter.field}
                        </span>
                        <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                            {opLabel(filter.operator)}
                        </span>
                        <span>{filter.value}</span>
                        <button
                            onClick={() => removeFilter(filter.id)}
                            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Add Filter button + dropdown */}
            <div className="relative" ref={dropRef}>
                <button
                    onClick={() => {
                        if (dropdownOpen) resetDropdown();
                        else setDropdownOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors hover:bg-[var(--surface-hover)]"
                    style={{
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                        borderStyle: "dashed",
                    }}
                >
                    <Filter className="h-3 w-3" />
                    Filtre Ekle
                    <ChevronDown
                        className="h-3 w-3 transition-transform"
                        style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }}
                    />
                </button>

                <AnimatePresence>
                    {dropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                            className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border p-1 shadow-lg"
                            style={{
                                background: "var(--bg-secondary)",
                                borderColor: "var(--border)",
                                boxShadow: "var(--float-shadow)",
                            }}
                        >
                            {/* Step indicator */}
                            <div
                                className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest border-b mb-1"
                                style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
                            >
                                {step === "field" && "Alan Seç"}
                                {step === "operator" && `${currentField?.label ?? ""} → Koşul`}
                                {step === "value" && `${currentField?.label ?? ""} → Değer`}
                            </div>

                            {getDropdownItems().map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => handleItemClick(item.key)}
                                    className="w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-[var(--surface-hover)]"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    {item.label}
                                </button>
                            ))}

                            {getDropdownItems().length === 0 && (
                                <div
                                    className="px-3 py-2 text-xs"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Seçenek yok
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Clear All */}
            {filters.length > 0 && (
                <button
                    onClick={() => onChange([])}
                    className="text-[11px] transition-colors hover:underline"
                    style={{ color: "var(--text-muted)" }}
                >
                    Temizle
                </button>
            )}
        </div>
    );
}
