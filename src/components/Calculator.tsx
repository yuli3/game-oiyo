import { useState } from 'react';

export default function Calculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (n: string) => {
        setDisplay(prev => (prev === '0' ? n : prev + n));
    };

    const handleOperator = (op: string) => {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    };

    const calculate = () => {
        try {
            const fullEquation = equation + display;
            const parts = fullEquation.trim().split(' ');
            if (parts.length < 3) return;

            let result = parseFloat(parts[0]);
            for (let i = 1; i < parts.length; i += 2) {
                const operator = parts[i];
                const nextValue = parseFloat(parts[i + 1]);

                if (operator === '+') result += nextValue;
                else if (operator === '-') result -= nextValue;
                else if (operator === '*') result *= nextValue;
                else if (operator === '/') result /= nextValue;
            }

            setDisplay(String(Number(result.toFixed(8))));
            setEquation('');
        } catch {
            setDisplay('Error');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    return (
        <div className="max-w-xs mx-auto my-8 p-6 bg-card border border-border rounded-3xl shadow-2xl backdrop-blur-sm animate-fade-up">
            <div className="mb-4 p-4 bg-muted/30 rounded-2xl text-right">
                <div className="text-xs text-muted-foreground h-4 mb-1">{equation}</div>
                <div className="text-3xl font-bold font-heading overflow-hidden whitespace-nowrap">{display}</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9', '/'].map(btn => (
                    <button
                        key={btn}
                        onClick={() => btn === '/' ? handleOperator('/') : handleNumber(btn)}
                        className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-semibold transition-all hover:scale-105"
                    >
                        {btn}
                    </button>
                ))}
                {['4', '5', '6', '*'].map(btn => (
                    <button
                        key={btn}
                        onClick={() => btn === '*' ? handleOperator('*') : handleNumber(btn)}
                        className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-semibold transition-all hover:scale-105"
                    >
                        {btn === '*' ? '×' : btn}
                    </button>
                ))}
                {['1', '2', '3', '-'].map(btn => (
                    <button
                        key={btn}
                        onClick={() => btn === '-' ? handleOperator('-') : handleNumber(btn)}
                        className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-semibold transition-all hover:scale-105"
                    >
                        {btn}
                    </button>
                ))}
                <button onClick={clear} className="h-12 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold transition-all hover:scale-105">C</button>
                <button onClick={() => handleNumber('0')} className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold transition-all hover:scale-105">0</button>
                <button onClick={calculate} className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold transition-all hover:scale-105 shadow-lg shadow-primary/20">=</button>
                <button onClick={() => handleOperator('+')} className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold transition-all hover:scale-105">+</button>
            </div>
        </div>
    );
}
