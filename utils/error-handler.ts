type ErrorHandler = (err: unknown, context?: string, opts?: { retry?: () => void }) => void;

let handler: ErrorHandler | null = null;

export const setErrorHandler = (fn: ErrorHandler | null) => {
    handler = fn;
};

export const reportError = (err: unknown, context?: string, opts?: { retry?: () => void }) => {
    if (handler) handler(err, context, opts);
    else {
        // Fallback: log to console
        console.error('Unhandled error:', context, err);
    }
};

export const clearErrorHandler = () => setErrorHandler(null);
