export interface TraceSpan {
    setAttribute: (label: string, value: boolean | string | number) => void;
}

/**
 * Record a performance trace for the given function.
 */
export async function trace<T>(name: string, fn: (span: TraceSpan) => Promise<T>): Promise<T> {
    const attributes: Record<string, boolean | string | number> = {};
    const span: TraceSpan = {
        setAttribute(label, value) {
            attributes[label] = value;
        },
    };

    let start = now();
    try {
        return await fn(span);
    } catch (error) {
        span.setAttribute('error', true);
        throw error;
    } finally {
        let end = now();
        console.log(`trace ${name} ${end - start}ms`, attributes);
    }
}

/**
 * Return the current time in milliseconds.
 */
export function now(): number {
    // Local Next.js development doesn't have performance.now()
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
