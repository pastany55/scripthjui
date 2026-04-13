(function() {
    const CONFIG = {
        inputSelectors: ['#chat_input', '.chat-input', '[contenteditable="true"]'], 
        sendButtonSelectors: ['#chat_input_send', '.send-button', 'button[type="submit"]'],
        myReplyText: "確認しました",
        ignoreKeywords: ["Apple", "管理者"], 
        checkInterval: 1000,
        waitTime: 5000, 
        cooldown: 3000 
    };

    const SPAM_CONFIG = {
        text: " ",
        interval: 100 
    };

    let isProcessing = false;
    let lastLogLength = document.body.innerText.length;
    let replyTimer = null;
    let isSpamming = false;
    let spamIntervalId = null;

    const findElement = (selectors) => {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) return el;
        }
        return null;
    };

    const createGUI = () => {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 9999;
            background: rgba(0,0,0,0.8); color: white; padding: 10px;
            border-radius: 8px; font-family: sans-serif; font-size: 12px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        
        const title = document.createElement('div');
        title.innerText = "CONTROLLER";
        title.style.marginBottom = "8px";
        title.style.fontWeight = "bold";
        title.style.textAlign = "center";
        
        const btn = document.createElement('button');
        btn.innerText = "空白連投: OFF";
        btn.style.cssText = "cursor: pointer; padding: 5px 10px; width: 100%; border: none; border-radius: 4px; background: #ff4444; color: white; font-weight: bold;";
        
        btn.onclick = () => {
            isSpamming = !isSpamming;
            if (isSpamming) {
                btn.innerText = "空白連投: ON";
                btn.style.background = "#44ff44";
                btn.style.color = "#000";
                startSpamming();
            } else {
                btn.innerText = "空白連投: OFF";
                btn.style.background = "#ff4444";
                btn.style.color = "white";
                stopSpamming();
            }
        };

        container.appendChild(title);
        container.appendChild(btn);
        document.body.appendChild(container);
    };

    const startSpamming = () => {
        if (spamIntervalId) return;
        spamIntervalId = setInterval(async () => {
            if (isProcessing) return;

            const inputField = findElement(CONFIG.inputSelectors);
            const sendBtn = findElement(CONFIG.sendButtonSelectors);
            
            if (inputField) {
                if (inputField.isContentEditable) {
                    inputField.innerText = SPAM_CONFIG.text;
                } else {
                    inputField.value = SPAM_CONFIG.text;
                }
                
                inputField.dispatchEvent(new InputEvent('input', { bubbles: true, data: SPAM_CONFIG.text }));
                
                if (sendBtn) {
                    sendBtn.click();
                } else {
                    inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                }
            }
        }, SPAM_CONFIG.interval);
    };

    const stopSpamming = () => {
        clearInterval(spamIntervalId);
        spamIntervalId = null;
    };

    const blob = new Blob([`setInterval(() => postMessage('tick'), ${CONFIG.checkInterval});`], {type: 'text/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => {
        if (isProcessing) return;

        const currentLogText = document.body.innerText;
        const currentLength = currentLogText.length;

        if (currentLength > lastLogLength) {
            const newContent = currentLogText.substring(lastLogLength).trim();
            
            if (!newContent || 
                newContent.includes(CONFIG.myReplyText) || 
                CONFIG.ignoreKeywords.some(kw => newContent.includes(kw))) {
                lastLogLength = currentLength;
                return;
            }

            if (replyTimer) clearTimeout(replyTimer);

            lastLogLength = currentLength;

            replyTimer = setTimeout(() => {
                isProcessing = true; 
                executeStableReply();
                replyTimer = null;
            }, CONFIG.waitTime);

        } else {
            lastLogLength = currentLength;
        }
    };

    async function executeStableReply() {
        try {
            let inputField = findElement(CONFIG.inputSelectors);
            if (!inputField) {
                isProcessing = false;
                return;
            }

            inputField.focus();
            if (inputField.isContentEditable) {
                inputField.innerText = CONFIG.myReplyText;
            } else {
                inputField.value = CONFIG.myReplyText;
            }

            inputField.dispatchEvent(new InputEvent('input', { bubbles: true, data: CONFIG.myReplyText }));
            ['change', 'blur'].forEach(type => inputField.dispatchEvent(new Event(type, { bubbles: true })));

            await new Promise(r => setTimeout(r, 500)); 

            const sendBtn = findElement(CONFIG.sendButtonSelectors);
            if (sendBtn) {
                sendBtn.click();
            } else {
                inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            }

        } catch (e) {
            isProcessing = false; 
        } finally {
            setTimeout(() => {
                lastLogLength = document.body.innerText.length;
                isProcessing = false;
            }, CONFIG.cooldown);
        }
    }

    createGUI();
})();
