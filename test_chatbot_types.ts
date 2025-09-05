// Тест типов для ChatBot
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  user_id: string;
  context?: {
    current_view: string;
    current_category: any;
    current_badge: any;
  };
}

interface ChatResponse {
  response: string;
  suggestions?: string[];
  context_updates?: any;
}

// Тест функции отправки сообщения
async function testSendMessage(message: string, user_id: string, context: any) {
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id,
        context
      })
    });

    if (response.ok) {
      const data: ChatResponse = await response.json();
      return {
        success: true,
        response: data.response,
        suggestions: data.suggestions,
        context_updates: data.context_updates
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Неизвестная ошибка',
        status: response.status
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

// Тест
testSendMessage('Привет!', 'test_user', {
  current_view: 'intro',
  current_category: null,
  current_badge: null
}).then(result => {
  console.log('Результат теста:', result);
});

export { testSendMessage, Message, ChatRequest, ChatResponse };
