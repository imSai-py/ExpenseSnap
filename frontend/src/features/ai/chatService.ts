/**
 * Chat service for SnapBot AI assistant.
 * Handles API calls to the AI backend endpoints.
 */

const getAiBaseUrl = (): string => {
    if (import.meta.env.VITE_API_URL) {
        return `${import.meta.env.VITE_API_URL}/api/ai`;
    }
    return '/api/ai';
};

const AI_BASE_URL = getAiBaseUrl();

export interface ChatResponse {
    success: boolean;
    reply: string;
    expense_added: {
        id: number;
        item_name: string;
        amount: number;
        currency: string;
        category: string;
        type: string;
        date_added: string;
    } | null;
    error?: string;
}

export interface InsightsResponse {
    success: boolean;
    insights: string;
    error?: string;
}

async function fetchAI(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        },
    });
}

export const chatApi = {
    async sendMessage(message: string): Promise<ChatResponse> {
        const response = await fetchAI(`${AI_BASE_URL}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    },

    async getInsights(): Promise<InsightsResponse> {
        const response = await fetchAI(`${AI_BASE_URL}/insights`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    },
};
