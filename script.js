import * as webllm from "https://esm.run/@mlc-ai/web-llm"

// Define DOM elements
const text = document.querySelector("#rpg-text");
const progressBar = document.querySelector("#progress-bar");
const personInput = document.querySelector('#person-input');
const contextInput = document.querySelector('#context-input');
const sendInput = document.querySelector('#send-input');
const sendButton = document.querySelector("#send-btn");
const stopButton = document.querySelector("#stop-btn");
const contextBtn = document.querySelector("#context-btn");
const contextMsg = document.querySelector("#context-text");
const container = document.querySelector(".imessage");
const conv = document.querySelector(".container");
const endingMessage = document.querySelector("#ending-msg");

let personContent = personInput.value;
let contextContent = contextInput.value;
let messages;
let isUninterrupted = true;
let isEnding = false;
let isLoading = true;
let timer;
let timerEnd;

// Change here if you want shorter or longer stories
let max_turn_nbr = 15;


text.innerText = "Loading now";
console.log("WebLLM loaded successfully!");

 // Initialize with a progress callback
 const initProgressCallback = (progress) => {
    console.log("Model loading progress:", progress);
    var progressInt = extractProgress(progress.text);
    updateProgress(progressInt*100);
    if (progress.progress == 1) {
        progressBar.classList.add("hidden");
        contextBtn.disabled = false;
    }
 }

// Instantiate model
const engine = await webllm.CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", { 
    // appConfig: {
    //     useIndexedDB: true,
    //     models: [
    //         { model_id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", model_path: "/models/llama3" },
    //     ],
    // },

    // Couldn't make it work
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



function updateMessage() {
    // Update the value after being sent
    personContent = personInput.value;
    contextContent = contextInput.value;
    messages = [
        { role: "system", content : `You are ` +  personContent + `. Just chilling and texting me about the event I will ask you to tell me about, that I didn't attend. You speak accordingly to your age, position and the description i give you, like we’re just chatting for fun, except if your mood is different. Every step of the story gets crazier and weirder. Add emoji if it is relevant to the p and write text messages. Don’t hold back on the details—tell me all about how you got there, what the place and the people were like, and what went down. 
    
        A few major rules:
        Messages must be max 150 characters.
        Each response you give is one step in the story, keeping it funny and unpredictable. 
        Don’t hold back on the chaos. Always keep your role when speaking, never talk like an assistant." `},
        { role: "user", content: contextContent}
    ];
}


function setContinueTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        if(isUninterrupted) sendAnswer("Go on");
    }, 3000);
}

// When sending the context (person + question)
contextBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    updateMessage();
    contextMsg.innerText = contextContent;
    contextMsg.classList.remove("hidden");
    contextBtn.style.display = "none";
    await sendPrompt();
})

// When sending the number of the choice
sendButton.addEventListener('click', function(e) {
    e.preventDefault();
    const answer = sendInput.value;
    sendAnswer(answer);
    sendInput.value = "";
})


// Generate choice
stopButton.addEventListener('click', function(e) {
    e.preventDefault();
    isUninterrupted = false;
    // createChoices(messages);

    // Try to give examples, ended up being much worse -------------

    // const answer = `Give me three short choices to continue this story. My choice will impact how the rest of the story goes. 
    // Give the choices with no introduction and format them like this : '<choice>1/......</choice> <choice>2/.......</choice> <choice>3/.......</choice>
    // First example: 
    //     <choice>1/We exited the museum on a car</choice>
    //     <choice>2/We fell into the fountain in the corridor</choice>
    //     <choice>3/She started a fire</choice>
    
    // Second example:
    //     <choice>1/A dog suddenly started chasing us</choice>
    //     <choice>2/We found a hidden door in the floor</choice>
    //     <choice>3/She revealed she was a secret agent</choice>

    // Third example:
    //     <choice>1/An old man handed us a mysterious map</choice>
    //     <choice>2/A swarm of bees interrupted our conversation</choice>
    //     <choice>3/The waiter slipped and spilled soup on her</choice>
    // A few rules you MUST follow : 
    // 1/ Generate exactly three distinct original choices for me to choose from
    // 2/ They must be adapted to the story being told
    // 3/ They can't be part of the examples of before
    // `

    const answer = `Give me three short choices to continue this story. My choice will impact how the rest of the story goes. 
    A few rules you MUST follow : 
    1/ Generate exactly three distinct original choices for me to choose from
    2/ They must be adapted to the story being told
    `
    
    sendAnswer(answer)
    const newMeText = document.createElement("p");
    newMeText.classList.add("from-me");
    newMeText.innerText = "No way, tell me the real story";
    container.appendChild(newMeText);
    container.lastChild.scrollIntoView();
})


async function sendPrompt() {
    stopButton.disabled = true;
    console.log(messages)
    const chunks = await engine.chat.completions.create({
        messages,
        temperature: 1,
        top_p: 0.8,
        stream: true,
        stream_options: { include_usage: true },
    });
    
    let reply = "";
    let newText = document.createElement("p")
    container.appendChild(newText)
    newText.classList.add("from-them")

    // Show the text writing itself
    for await (const chunk of chunks) {
        reply += chunk.choices[0]?.delta.content || "";

        newText.innerText = reply;
        if (chunk.usage) {
            let replyMsg = {
                role: "assistant",
                content: reply
            }
            console.log(chunk.usage); // only last chunk has usage
            messages.push(replyMsg);
            stopButton.disabled = false;

            if (isEnding){
                endGame();
                break;
            }
            if(messages.length >= max_turn_nbr) {
                createEnding();
            }

            if(isUninterrupted) setContinueTimer();
            else manageChoices(reply);   
        }
    }
}

// Add user's answer
function sendAnswer(text) {
    let message = {
        role: "user",
        content: text
    }
    messages.push(message);
    sendPrompt();
}


const fullReply = await engine.getMessage();

function formatHistory(array) {
    return array.map(msg => `{ role: "${msg.role}", content: "${msg.content}" }`).join("\n");
}


async function createChoices(history) {
    const content = formatHistory(history);
    const choicesMessages = [
        { role: "system", content : `Give me three choices to continue this story. My choice will impact how the rest of the story goes. Give the choices with no introduction and format them like this : '<choice>1/......</choice> <choice>2/.......</choice> <choice>3/.......</choice>
        First example: 
            <choice>1/We exited the museum on a car</choice>
            <choice>2/We fell into the fountain in the corridor</choice>
            <choice>3/She started a fire</choice>
        
        Second example:
            <choice>1/A dog suddenly started chasing us</choice>
            <choice>2/We found a hidden door in the floor</choice>
            <choice>3/She revealed she was a secret agent</choice>
    
        Third example:
            <choice>1/An old man handed us a mysterious map</choice>
            <choice>2/A swarm of bees interrupted our conversation</choice>
            <choice>3/The waiter slipped and spilled soup on her</choice>
            
        `},
        { role: "user", content: "yoo"}
    ]

    const bits = await engine.chat.completions.create({
        choicesMessages,
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


// Trying to get clickable choices....

function getChoices(text) {
    console.log(text)
    // Extract from the tags <choice></choice>
    const choiceRegex = /<choice>(\d+)\/([^<]+)<\/choice>/g;
    const choices = [];
    let match;
    match = choiceRegex.exec(text);
    console.log(match)
    while (match != null) {
        choices.push({ number: match[1], text: match[2].trim() });
    }
    console.log(choices);
    return choices;
}

function manageChoices(responseText) {
    console.info("Checking choices")
    sendButton.disabled = false;
    isUninterrupted = true;
    // const choices = getChoices(responseText);
    // showChoices(choices);
}

function showChoices(choices) {

    // Create clickable divs
    choices.forEach((choice) => {
        const choiceDiv = document.createElement("div");
        choiceDiv.classList.add("choice");
        choiceDiv.textContent = choice.text;
        choiceDiv.addEventListener("click", () => {
            sendAnswer(choice.number);
        });

        container.appendChild(choiceDiv);
    });
}

// End of trying to have clickables choices...

// Initiate the ending message
function createEnding() {
    isEnding = true;
    isUninterrupted = false;
    sendAnswer("Add one last message to explain the end of the event and stop the conversation");
    endGame();
}

function endGame() {
    clearTimeout(timerEnd)
    setTimeout(() => {
        console.log("ooo")
        conv.classList.add("fadeout-msg");
    }, 10000);
    setTimeout(() => {
        endingMessage.classList.remove("fadeout-msg");
        endingMessage.classList.add("fadein-msg");
        endingMessage.style.opacity = '1'; 
    }, 13000);


}