// JavaScript для чат-бота
let userId = 'user_' + Math.random().toString(36).substr(2, 9);

// Event listeners для замены inline обработчиков
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик для кнопки отправки
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    
    // Обработчик для Enter в поле ввода
    document.getElementById('messageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Обработчики для предложений
    document.querySelectorAll('.suggestion').forEach(function(suggestion) {
        suggestion.addEventListener('click', function() {
            const message = this.getAttribute('data-message');
            sendMessage(message);
        });
    });
});

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage(message = null) {
    const input = document.getElementById('messageInput');
    const messageText = message || input.value.trim();
    
    if (!messageText) return;
    
    // Добавляем сообщение пользователя
    addMessage(messageText, 'user');
    input.value = '';
    
    // Показываем индикатор загрузки
    const loadingId = addMessage('Думаю... 🤔', 'bot');
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText,
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        // Удаляем индикатор загрузки
        removeMessage(loadingId);
        
        // Добавляем ответ бота
        addMessage(data.response, 'bot');
        
        // Обновляем предложения
        updateSuggestions(data.suggestions || []);
        
    } catch (error) {
        removeMessage(loadingId);
        addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'bot');
    }
}

function addMessage(text, sender) {
    const container = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    messageDiv.id = 'msg_' + Date.now();
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    return messageDiv.id;
}

function removeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.remove();
    }
}

function updateSuggestions(suggestions) {
    const container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion';
        div.textContent = suggestion;
        div.addEventListener('click', () => sendMessage(suggestion));
        container.appendChild(div);
    });
}
