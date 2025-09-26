    let ai = {
        model: '@cf/meta/llama-3.1-70b-instruct',
        temperature: 1.7,
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
// Define the function to ask the AI a question
async function askAi(systemPrompt, message, maxTokenOutput = 50) {
  // Check if the required arguments are provided
  if (!message || !systemPrompt || !maxTokenOutput) {
    throw new Error('AI Error: required argument(s) missing');
  }

  // Validate the input types
  if (typeof message !== 'string' || typeof systemPrompt !== 'string' || typeof maxTokenOutput !== 'number') {
    throw new Error('AI Error: invalid argument type(s)');
  }

  // Set the maximum token output to at least 50
  if (maxTokenOutput < 50) {
    maxTokenOutput = 50;
  }

  // Update the AI configuration
  aiConfig.maxTokens = maxTokenOutput;
  aiConfig.systemPrompt = systemPrompt;
  aiConfig.message = message;

  try {
    // Call the Cloudflare API
    const response = await callCloudflareAPI();
    return response;
  } catch (error) {
    // Handle the error
    console.error('AI Error:', error);
    return null;
  }
}

// Define the function to call the Cloudflare API
async function callCloudflareAPI(useFallback = false) {
  // Build the API URL
  const apiUrl = ${aiConfig.baseApiUrl}${aiConfig.model};

  // Build the request body
  const requestBody = buildRequestBody(useFallback);

  try {
    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': Bearer ${aiConfig.apiKey},
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if the response is OK
    if (!response.ok) {
      // Handle the error
      const errorText = await response.text();
      throw new Error(API request failed: ${response.status} - ${errorText});
    }

    // Parse the response
    const data = await response.json();

    // Handle the response according to the schema
    if (data.result && data.result.response) {
      return data.result.response;
    } else if (typeof data.result === 'string') {
      // Handle binary format response
      return data.result;
    } else {
      throw new Error('Unexpected response format from API');
    }
  } catch (error) {
    // Handle the error
    if (useFallback) {
      console.error('Fallback request also failed:', error);
      throw new Error(Fallback request failed: ${error.message});
    } else {
      // Re-throw the original error if not a 400 or if fallback wasn't attempted
      throw error;
    }
  }
}

// Define the function to build the request body
function buildRequestBody(useFallback) {
  // Initialize the request body
  const requestBody = {
    messages: [
      {
        role: 'system',
        content: aiConfig.systemPrompt,
      },
      {
        role: 'user',
        content: aiConfig.message,
      },
    ],
  };

  // Add optional parameters only if they differ from defaults
  if (!useFallback) {
    requestBody.max_tokens = aiConfig.maxTokens;
    requestBody.temperature = aiConfig.temperature;
    requestBody.stream = aiConfig.streamResponse;
    requestBody.raw = false;

    if (aiConfig.topP !== 1) {
      requestBody.top_p = aiConfig.topP;
    }
    if (aiConfig.topK !== 40) {
      requestBody.top_k = aiConfig.topK;
    }
    if (aiConfig.repetitionPenalty !== 1.1) {
      requestBody.repetition_penalty = aiConfig.repetitionPenalty;
    }
    if (aiConfig.frequencyPenalty !== 0.0) {
      requestBody.frequency_penalty = aiConfig.frequencyPenalty;
    }
    if (aiConfig.presencePenalty !== 0.0) {
      requestBody.presence_penalty = aiConfig.presencePenalty;
    }
    if (aiConfig.seed) {
      requestBody.seed = aiConfig.seed;
    }
    if (aiConfig.responseFormat !== 'text') {
      requestBody.response_format = {
        type: aiConfig.responseFormat,
      };
    }
  }

  return requestBody;
}