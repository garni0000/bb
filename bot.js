// .env
//--------
// TELEGRAM_TOKEN=<ton_telegram_token>
// OPENROUTER_API_KEY=<ton_openrouter_api_key>
// MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/seek?retryWrites=true&w=majority


// models/Histo.js
//----------------
import mongoose from 'mongoose';

const HistoSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  user: { type: Number, required: true },     // chatId Telegram
  contenu: { type: String, required: true }
});

export default mongoose.model('Histo', HistoSchema, 'histo');


// bot.js
//--------
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import http from 'http';
import Histo from './models/Histo.js';

// Configurer les tokens et URI
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Connexion à MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'seek'
}).then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// Définition du message système
const systemMessage = {
  role: 'system',
  content: `
**Description du Blogueur Alpha (Mode /alphatalk) :**
Tu es un **mâle alpha froid**. ... (ton contenu système) ...`
};

// Initialiser le bot Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Contexte des sessions en mémoire
const userSessions = new Map();

// Gérer les messages entrants
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text || '';

  // Sauvegarder le message utilisateur
  try { await Histo.create({ user: chatId, contenu: userMessage }); }
  catch (dbErr) { console.error('Erreur DB user:', dbErr); }

  // Initialiser ou récupérer la session
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, { history: [systemMessage] });
  }
  const session = userSessions.get(chatId);
  session.history.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'deepseek/deepseek-chat:free', messages: session.history })
    });

    const data = await response.json();
    const botResponse = data.choices?.[0]?.message?.content;
    if (!botResponse) throw new Error('Réponse invalide');

    // Sauvegarder la réponse du bot
    try { await Histo.create({ user: chatId, contenu: botResponse }); }
    catch (dbErr) { console.error('Erreur DB bot:', dbErr); }

    session.history.push({ role: 'assistant', content: botResponse });
    bot.sendMessage(chatId, botResponse);
  } catch (err) {
    console.error('Erreur API:', err);
    bot.sendMessage(chatId, "❌ Une erreur s'est produite. Réessayez.");
  }
});

// Commande /start
bot.onText(/\/start/, (msg) => {
  userSessions.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '🚀 Bienvenue ! Envoyez /gen votre thème pour commencer.');
});

// Commande /gen <prompt>
bot.onText(/\/gen (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];
  if (!userSessions.has(chatId)) userSessions.set(chatId, { history: [systemMessage] });
  userSessions.get(chatId).history.push({ role: 'user', content: `/gen ${prompt}` });
});

// Serveur HTTP pour vérifier le statut
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot en ligne');
}).listen(8080, () => console.log('Serveur HTTP sur port 8080'));
