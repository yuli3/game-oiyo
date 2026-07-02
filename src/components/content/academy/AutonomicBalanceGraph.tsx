export const AutonomicBalanceGraph = (_props?: { locale?: string }) => {
    return (
        <div className="p-6 border rounded-xl my-6 bg-muted/20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">⚖️</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Autonomic Balance Graph</h3>
            <p className="text-sm text-muted-foreground">
                Interactive visualization of the sympathetic and parasympathetic nervous systems.
            </p>
        </div>
    );
};
