import React, { useState, useEffect, useId, useRef } from "react";

interface Props {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
}

const AutocompleteInput = ({ value, onChange, suggestions, placeholder, className }: Props) => {
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
        // Filter suggestions based on input value
        if (value.trim()) {
            const query = value.trim().toLowerCase();
            const filtered = suggestions.filter((item) =>
                item.toLowerCase().includes(query)
            ).slice(0, 8);
            setFilteredSuggestions(filtered);
        } else {
            // Opening an empty field should still be useful on a fresh mapping.
            setFilteredSuggestions(suggestions.slice(0, 8));
        }
        setActiveIndex(0);
    }, [value, suggestions]);

    useEffect(() => {
        // Close suggestions when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setShowSuggestions(true);
    };

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                className={className}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
                        e.preventDefault();
                        setShowSuggestions(true);
                        setActiveIndex(index => (index + 1) % filteredSuggestions.length);
                    }
                    if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
                        e.preventDefault();
                        setShowSuggestions(true);
                        setActiveIndex(index => (index - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                    }
                    if ((e.key === 'Enter' || e.key === 'Tab') && showSuggestions && filteredSuggestions.length > 0) {
                        e.preventDefault();
                        handleSelect(filteredSuggestions[activeIndex]);
                    }
                    if (e.key === 'Escape') setShowSuggestions(false);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && filteredSuggestions.length > 0}
                aria-controls={listId}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul id={listId} className="term-panel absolute z-50 mt-1 max-h-60 w-full overflow-y-auto shadow-lg">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={suggestion}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelect(suggestion)}
                            className={`cursor-pointer px-3 py-2 text-[12px] transition-colors ${index === activeIndex ? "bg-term-raised text-term-text" : "text-term-muted hover:bg-term-raised hover:text-term-text"}`}
                            role="option"
                            aria-selected={index === activeIndex}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput;
