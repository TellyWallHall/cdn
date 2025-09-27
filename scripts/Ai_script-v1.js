// Complete Working AI Script - v2.0
// Fixed all bugs from v1.js

// AI Configuration Object
let ai = {
    model: '@cf/meta/llama-3.1-70b-instruct',
    temperature: 1,
    maxTokens: null,
    topP: 1,
    topK: 40,
    repetitionPenalty: 1.1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    seed: null,
    responseFormat: 'text',
    streamResponse: false,
    systemPrompt: null,
    baseApiUrl: 'https://cloudflare-cors-anywhere.imnotfamous01.workers.dev/?https://api.cloudflare.com/client/v4/accounts/fce4a063063d8a931f3d09deaa67eb25/ai/run/',
    apiKey: 'oD3r69SMxj4_DVxS-q0pfA4fT_stTSkPwu6WM0Ce',
    message: null,
    response: null
};

// Main AI Function - Simple Interface
async function askAi(systemPrompt, message, maxTokenOutput = 10, debug = false) {
    if (debug) console.log('askAi called with:', {systemPrompt, message, maxTokenOutput, debug});
    
    if (!message || !systemPrompt) {
        console.error('AI Error: required argument(s) missing');
        return 'Here we go again';
    }
    
    // Set parameters
    ai.systemPrompt = systemPrompt;
    ai.message = message;
    ai.maxTokens = maxTokenOutput;
    
    try {
        const result = await callCloudflareAPI(false, debug);
        return result;
    } catch (error) {
        console.error('askAi error:', error);
        return 'Here we go again';
    }
}

// Core API Function
async function callCloudflareAPI(stream = false, debug = false) {
    if (debug) console.log('callCloudflareAPI called with stream:', stream);
    
    if (!ai.systemPrompt || !ai.message || !ai.maxTokens) {
        console.error('Missing required AI parameters');
        return 'Here we go again';
    }
    
    const apiUrl = ai.baseApiUrl + ai.model;
    
    const messages = [
        { role: "system", content: ai.systemPrompt },
        { role: "user", content: ai.message }
    ];
    
    const requestBody = {
        messages: messages,
        max_tokens: ai.maxTokens,
        temperature: ai.temperature,
        stream: stream,
        raw: false
    };
    
    if (debug) {
        console.log('API URL:', apiUrl);
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
    }
    
    try {
        if (debug) console.log('Sending request...');
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ai.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (debug) {
            console.log('Full API response:');
            console.log(JSON.stringify(data, null, 2));
        }
        
        // Store response in ai object
        if (data.result && data.result.response) {
            ai.response = data.result.response;
            return data.result.response;
        } else if (typeof data.result === 'string') {
            ai.response = data.result;
            return data.result;
        } else {
            throw new Error('Unexpected response format from API');
        }
        
    } catch (error) {
        console.error('API Error:', error.message);
        ai.response = null;
        return 'Here we go again';
    }
}

// Advanced AI Function with full control
async function askAiAdvanced(options = {}) {
    const {
        systemPrompt,
        message,
        maxTokens = 10,
        temperature = 1,
        model = '@cf/meta/llama-3.1-70b-instruct',
        stream = false,
        debug = false
    } = options;
    
    if (!systemPrompt || !message) {
        console.error('askAiAdvanced: systemPrompt and message are required');
        return 'Here we go again';
    }
    
    // Temporarily store current settings
    const originalSettings = {
        systemPrompt: ai.systemPrompt,
        message: ai.message,
        maxTokens: ai.maxTokens,
        temperature: ai.temperature,
        model: ai.model
    };
    
    // Apply new settings
    ai.systemPrompt = systemPrompt;
    ai.message = message;
    ai.maxTokens = maxTokens;
    ai.temperature = temperature;
    ai.model = model;
    
    try {
        const result = await callCloudflareAPI(stream, debug);
        return result;
    } catch (error) {
        console.error('askAiAdvanced error:', error);
        return 'Here we go again';
    } finally {
        // Restore original settings
        Object.assign(ai, originalSettings);
    }
}

// Utility function to get current AI status
function getAiStatus() {
    return {
        hasApiKey: !!ai.apiKey,
        model: ai.model,
        lastResponse: ai.response,
        ready: !!(ai.apiKey && ai.baseApiUrl)
    };
}

// Export functions for module environments (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { askAi, askAiAdvanced, callCloudflareAPI, getAiStatus, ai };
}

console.log('✅ AI Script v2.0 loaded successfully!');