import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import http from 'http';

// Configuration
const { TELEGRAM_TOKEN, OPENROUTER_API_KEY, HISTORY_API_KEY } = process.env;
if (!TELEGRAM_TOKEN || !OPENROUTER_API_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// URLs
const HISTORY_API_URL = 'https://takl.solkah.org/api/save-history';

// Messages système
const SYSTEM_PROMPT = `Tu es un assistant intelligent avec plusieurs modes:
/alphatalk - Mode motivation alpha male
/nml - Mode normal
/fun - Mode humour
/memes - Mode tech éthique
/money - Mode business`;

// Initialisation
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const userSessions = new Map();

// Sauvegarde de l'historique
async function saveHistory(chatId, role, content) {
  try {
    const response = await fetch(HISTORY_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HISTORY_API_KEY || ''}`
      },
      body: JSON.stringify({
        chatId,
        entry: { 
          role, 
          content,
          timestamp: new Date().toISOString() 
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (err) {
    console.error('Save history error:', err.message);
  }
}

// Gestion des messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Ignorer les commandes spéciales
  if (text.startsWith('/')) return;

  // Initialiser session si nécessaire
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      history: [{ role: 'system', content: SYSTEM_PROMPT }]
    });
  }

  const session = userSessions.get(chatId);

  // Sauvegarder message utilisateur
  await saveHistory(chatId, 'user', text);
  session.history.push({ role: 'user', content: text });

  // Appel à l'API OpenRouter
  try {
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://takl.solkah.org',
        'X-Title': 'Takl Bot'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: session.history
      })
    });

    const data = await apiResponse.json();
    const botReply = data.choices?.[0]?.message?.content;

    if (botReply) {
      // Sauvegarder et envoyer réponse
      await saveHistory(chatId, 'assistant', botReply);
      session.history.push({ role: 'assistant', content: botReply });
      await bot.sendMessage(chatId, botReply);
    }
  } catch (err) {
    console.error('API Error:', err);
    await bot.sendMessage(chatId, '⚠️ Erreur, veuillez réessayer');
  }
});

// Commandes
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  userSessions.delete(chatId);
  await bot.sendMessage(chatId, '🚀 Bot démarré. Envoyez un message pour commencer.');
});

bot.onText(/\/gen (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      history: [{ role: 'system', content: SYSTEM_PROMPT }]
    });
  }
  
  const session = userSessions.get(chatId);
  session.history.push({ role: 'user', content: `/gen ${prompt}` });
  await bot.sendMessage(chatId, `Mode génération activé pour: "${prompt}"`);
});

// Serveur de santé
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot en ligne');
}).listen(8080, () => {
  console.log('🤖 Bot Telegram en écoute');
  console.log('🔄 Sauvegarde vers:', HISTORY_API_URL);
});
