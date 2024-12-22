import * as webllm from "https://esm.run/@mlc-ai/web-llm"

// Define DOM elements
const text = document.querySelector("#rpg-text");
const progressBar = document.querySelector("#progress-bar");
const personInput = document.querySelector('#person-input');
const contextInput = document.querySelector('#context-input');
const sendButton = document.querySelector("#send-btn");
const goButton = document.querySelector("#go-btn");
const stopButton = document.querySelector("#stop-btn");
const contextBtn = document.querySelector("#context-btn");

let isLoading = true;


text.innerText = "Loading now";
console.log("WebLLM loaded successfully!");

 // Initialize with a progress callback
 const initProgressCallback = (progress) => {
    console.log("Model loading progress:", progress);
    var progressInt = extractProgress(progress.text);
    updateProgress(progressInt*100);
 }

// Instantiate model
const engine = await webllm.CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", { 
    // appConfig: {
    //     useIndexedDB: true,
    //     models: [
    //         { model_id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", model_path: "/models/llama3" },
    //     ],
    // },

    // Didn't make it work
    initProgressCallback: initProgressCallback 
});


// Get the progress percentage based on the text
function extractProgress(text) {
    const match = text.match(/\[(\d+)\/(\d+)\]/); // Find the pattern like [14/22]
    if (match) {
        const current = parseInt(match[1], 10); 
        const total = parseInt(match[2], 10);
        return current / total;                
    }
    return 0;
}


// Update the progress bar
function updateProgress(p) {

    // Keep the bar full after the end of the loading
    progressBar.value = isLoading ? p : 100;
    if(p==100) isLoading = false;
}

let personContent = personInput.value.trim();
let contextContent = contextInput.value.trim();
let messages;

function updateMessage() {
    messages = [
        { role: "system", content : `You are ` +  personContent + `. Just chilling and texting me about the event I will ask you to tell me about. You’re super casual, like we’re just chatting for fun, and every step of the story gets crazier and weirder. Add emoji and write text messages. Don’t hold back on the details—tell me all about how you got there, what the place and the people were like, and what went down. Messages must be max 150 characters.
    
        Here’s how it works:
    
        Each response you give is one step in the story, keeping it funny and unpredictable. 
        Don’t hold back on the chaos. Always keep your role when speaking, never talk like an assistant. End the story after a few steps" `},
        { role: "user", content: contextContent}
    ];
}


contextBtn.addEventListener('click', async function(e) {
    console.log(contextContent)
    e.preventDefault();
    updateMessage();
    await sendPrompt();
})


sendButton.addEventListener('click', function(e) {
    e.preventDefault();
    const answer = document.querySelector('input').value;
    sendAnswer(answer);
})


goButton.addEventListener('click', function(e) {
    e.preventDefault();
    const answer = "Go on"
    sendAnswer(answer);
})

stopButton.addEventListener('click', function(e) {
    e.preventDefault();
    // const answer = document.querySelector('input').value;
    // createChoices(messages);

    const answer = "Give me three choices to continue this story. My choice will impact how the rest of the story goes. Give the choices with no introduction and format them like this : '<choice>1/......</choice> <choice>2/.......</choice> <choice>3/.......</choice>'"
    sendAnswer(answer)
})



async function sendPrompt() {
    console.log(messages)
    const chunks = await engine.chat.completions.create({
        messages,
        temperature: 1,
        stream: true,
        stream_options: { include_usage: true },
    });
    
    let reply = "";
    for await (const chunk of chunks) {
        reply += chunk.choices[0]?.delta.content || "";
        text.innerText = reply;
        if (chunk.usage) {
            let replyMsg = {
                role: "assistant",
                content: reply
            }
            console.log(chunk.usage); // only last chunk has usage
            messages.push(replyMsg);
        }
    }
}


function sendAnswer(text) {
    console.log(text);
    let message = {
        role: "user",
        content: text
    }
    messages.push(message);

    console.log(messages)
    sendPrompt();


}


const fullReply = await engine.getMessage();
text.innerText = fullReply;

function formatHistory(array) {
    return array.map(msg => `{ role: "${msg.role}", content: "${msg.content}" }`).join("\n");
}
async function createChoices(history) {
    const content = formatHistory(history);
    const choicesMessages = [
        { role: "system", content : `You're an assistant that generates three choices related to the story being told. Use very simple choices for the user to choose for the rest of the story. I send you the history of the chat before.`},
        { role: "user", content: "yoo"}
    ]

    const messadqdqges = [
        // { role: "system", content: "You are a game master and narrator that creates RPG adventure depending on the user's input. At each step, you give them three choices, the decision they make change the story" },
        // { role: "system", content: "You are my friend, in his 20s. You speak like you're chill and just having fun telling me about your life in text messages. Tell me the story of the event I ask you about, but every step it gets crazier and weirder. Don't spare any details about how you got there, how was the place etc. Each of your answer is one step of the date. If I tell you 'no way' change the last step by giving me three choices for the story. Make it unpredictable and funny." },
        { role: "system", content : `You’re my friend, in his 20s, just chilling and texting me about the event I will ask you to tell me about. You’re super casual, like we’re just chatting for fun, and every step of the story gets crazier and weirder. Add emoji and write text messages. Don’t hold back on the details—tell me all about how you got there, what the place and the people were like, and what went down. Messages must be max 150 characters.
    
        Here’s how it works:
    
        Each response you give is one step in the story, keeping it funny and unpredictable. 
        Don’t hold back on the chaos. Always keep your role when speaking, never talk like an assistant. End the story after a few steps" `},
        { role: "user", content: "So, how was your date ?"}
    ];

    console.log(choicesMessages); 
    const bits = await engine.chat.completions.create({
        messadqdqges,
        temperature: 1,

    });
    
    let reply = "";
    for await (const chunk of bits) {
        reply += chunk.choices[0]?.delta.content || "";
        text.innerText = reply;
        if (chunk.usage) {
            let replyMsg = {
                role: "assistant",
                content: reply
            }
            console.log(chunk.usage); // only last chunk has usage
        }
    }
}
