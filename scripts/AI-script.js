        let ai_embedded = {
            model: '@cf/meta/llama-3.1-70b-instruct',
            temperature: 2,
            maxTokens: null,
            topP: 1,
            topK: 50,
            repetitionPenalty: 1.1,
            frequencyPenalty: 0.0,
            presencePenalty: 0.0,
            seed: null,
            responseFormat: 'text',
            streamResponse: false,
            systemPrompt: null,
            baseApiUrl: 'https://cloudflare-cors-anywhere.imnotfamous01.workers.dev/?https://api.cloudflare.com/client/v4/accounts/fce4a063063d8a931f3d09deaa67eb25/ai/run/',
            apiKey: 'oD3r69SMxj4_DVxS-q0pfA4fT_stTSkPwu6WM0Ce',
            message: null,
            response: null
        };

        async function askAi_embedded(systemPrompt, message, maxTokenOutput = 50) {
            if (!message || !systemPrompt || !maxTokenOutput) {
                console.error('AI Error: required argument(s) missing');
                return;
            }
            /*if (maxTokenOutput < 50) {
                maxTokenOutput = 50;
            }*/
            ai_embedded.maxTokens = maxTokenOutput;
            ai_embedded.systemPrompt = systemPrompt;
            ai_embedded.message = message;
            try {
                const response = await callCloudflareAPI_embedded();
                return response;
            } catch (error) {
                console.error('AI Error:', error);
                return null;
            }
        }

        async function callCloudflareAPI_embedded(useFallback = false) {
            const apiUrl = ai_embedded.baseApiUrl + ai_embedded.model;
            const messages = [
                {
                    role: "system",
                    content: ai_embedded.systemPrompt
                },
                {
                    role: "user",
                    content: ai_embedded.message
                }
            ];

            let requestBody;
            if (useFallback) {
                requestBody = {
                    messages: messages
                };
                console.log('Using fallback mode...');
            } else {
                requestBody = {
                    messages: messages,
                    max_tokens: ai_embedded.maxTokens,
                    temperature: ai_embedded.temperature,
                    stream: ai_embedded.streamResponse,
                    raw: false
                };
                
                if (ai_embedded.topP !== 1) {
                    requestBody.top_p = ai_embedded.topP;
                }
                if (ai_embedded.topK !== 40) {
                    requestBody.top_k = ai_embedded.topK;
                }
                if (ai_embedded.repetitionPenalty !== 1.1) {
                    requestBody.repetition_penalty = ai_embedded.repetitionPenalty;
                }
                if (ai_embedded.frequencyPenalty !== 0.0) {
                    requestBody.frequency_penalty = ai_embedded.frequencyPenalty;
                }
                if (ai_embedded.presencePenalty !== 0.0) {
                    requestBody.presence_penalty = ai_embedded.presencePenalty;
                }
                if (ai_embedded.seed) {
                    requestBody.seed = ai_embedded.seed;
                }
                if (ai_embedded.responseFormat !== 'text') {
                    requestBody.response_format = {
                        type: ai_embedded.responseFormat
                    };
                }
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ai_embedded.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.status === 400 && !useFallback) {
                        console.warn('400 error detected, attempting fallback with barebones request');
                        console.log('Request too complex, trying simplified version...');
                        return await callCloudflareAPI_embedded(true);
                    }
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                if (data.result && data.result.response) {
                    return data.result.response;
                } else if (typeof data.result === 'string') {
                    return data.result;
                } else {
                    throw new Error('Unexpected response format from API');
                }
            } catch (error) {
                if (useFallback) {
                    console.error('Fallback request also failed:', error);
                    throw new Error(`Fallback request failed: ${error.message}`);
                } else {
                    throw error;
                }
            }
        }