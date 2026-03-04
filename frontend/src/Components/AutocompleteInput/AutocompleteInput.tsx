import React, { useState, useEffect, useRef } from "react";

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
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Filter suggestions based on input value
        if (value) {
            const filtered = suggestions.filter((item) =>
                item.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredSuggestions(filtered);
        } else {
            setFilteredSuggestions([]);
        }
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
                    if (e.key === 'Tab' && showSuggestions && filteredSuggestions.length > 0) {
                        e.preventDefault();
                        handleSelect(filteredSuggestions[0]);
                    }
                }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-background-card border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
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
