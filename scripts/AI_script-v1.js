        let ai = {
            model: '@cf/meta/llama-3.1-70b-instruct',
            temperature: 1,
            maxTokens: null,
            topP: 1,
            topK: 40,
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

        async function askAi(systemPrompt, message, maxTokenOutput=10, debug=false) {
            if (!message || !systemPrompt || !maxTokenOutput) {
                console.error('AI Error: required argument(s) missing');
                return;
            }
            if(debug) {
                alert(`System prompt: ${systemPrompt}\nMessage: ${message}\nMax output tokens: ${maxTokenOutput}`);
            }
            /*if (maxTokenOutput < 50) {
                maxTokenOutput = 50;
            }*/
            ai.maxTokens = maxTokenOutput;
            ai.systemPrompt = systemPrompt;
            ai.message = message;
            try {
                if(debug) alert(`Calling cloudflare`);
                const response = await callCloudflareAPI(false, debug);
                return response;
            } catch (error) {
                console.error('AI Error:', error);
                if (debug) alert(error);
                return null;
            }
        }

        async function callCloudflareAPI(useFallback=false, debug=false) {
            const apiUrl = ai.baseApiUrl + ai.model;
            const messages = [
                {
                    role: "system",
                    content: ai.systemPrompt
                },
                {
                    role: "user",
                    content: ai.message
                }
            ];
            if(debug) alert(`Message: ${JSON.stringify(messages,null,2)}`);
            let requestBody;
            if (useFallback) {
                requestBody = {
                    messages: messages
                };
                console.log('Using fallback mode...');
            } else {
                requestBody = {
                    messages: messages,
                    max_tokens: ai.maxTokens,
                    temperature: ai.temperature,
                    stream: ai.streamResponse,
                    raw: false
                };
                
                if (ai.topP !== 1) {
                    requestBody.top_p = ai.topP;
                }
                if (ai.topK !== 40) {
                    requestBody.top_k = ai.topK;
                }
                if (ai.repetitionPenalty !== 1.1) {
                    requestBody.repetition_penalty = ai.repetitionPenalty;
                }
                if (ai.frequencyPenalty !== 0.0) {
                    requestBody.frequency_penalty = ai.frequencyPenalty;
                }
                if (ai.presencePenalty !== 0.0) {
                    requestBody.presence_penalty = ai.presencePenalty;
                }
                if (ai.seed) {
                    requestBody.seed = ai.seed;
                }
                if (ai.responseFormat !== 'text') {
                    requestBody.response_format = {
                        type: ai.responseFormat
                    };
                }
            }
            if(debug) alert(`Requestbody: ${JSON.stringify(requestBody,null,2)}`);
            try {
                if(debug) alert(`sending`);
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
                    if (response.status === 400 && !useFallback) {
                        console.warn('400 error detected, attempting fallback with barebones request');
                        console.log('Request too complex, trying simplified version...');
                        return await callCloudflareAPI(true, debug);
                    }
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                console.log(JSON.stringify(data, null, 2));
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