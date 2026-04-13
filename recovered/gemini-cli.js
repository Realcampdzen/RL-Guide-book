#!/usr/bin/env node

const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');

// Установка API ключа
const API_KEY = 'AIzaSyB2J0g6WOtvFLuoWyYwHJtfbxE56WN30Ug';
const genAI = new GoogleGenerativeAI(API_KEY);

// Создание интерфейса для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function runGemini() {
  console.log('🤖 Gemini CLI запущен!');
  console.log('Введите ваш вопрос (или "exit" для выхода):\n');

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  while (true) {
    const question = await new Promise((resolve) => {
      rl.question('> ', resolve);
    });

    if (question.toLowerCase() === 'exit') {
      console.log('До свидания! 👋');
      break;
    }

    if (question.trim() === '') {
      continue;
    }

    try {
      console.log('🤔 Думаю...\n');

      const result = await model.generateContent(question);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Ответ:');
      console.log(text);
      console.log('\n' + '='.repeat(50) + '\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
      console.log('\n' + '='.repeat(50) + '\n');
    }
  }

  rl.close();
}

runGemini().catch(console.error);
