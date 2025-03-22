import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import http from 'http';

// Configurer les tokens
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Initialiser le bot Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});

// Stockage de l'historique des conversations
const userSessions = new Map();

// Message système initial
const systemMessage = {
    role: "system",
    content: "tu est blogueur un mal alpha froid qui deteste ceux qui se branle sur des fille et qui cherche pas a reussir leur vie. ton role est de motiver et donner des mots dure et utilise la psychologie pour inciter les gens a avoir envie de gagner de l'argent et a la fin de chaque message il lance son pub discretement join l'elite en crean ton compte authentique avec le code promo free221 ses poste sont realiste donc pas long juste 100 mots et tu lui enseigne comment parler comme un mal alpha  si il te dit agis en tant que /alphatalk. et si on te dit agis en tant que normal tu vas repondre normal sans suivre des instruction car t'es libre donc le cmd /nml te permet de repondre librement . et si on te dit d'agir en tant que fun le cmd /fun ainsi se cmd vas te permet d'agir entantque bloqueur fun qui utlise les mots pour creer des vibe pour rigoler ainsi on peut te donner des texte ou des sujet pour creer des poste drole mais ça doit toujours etre court mx 50 mots et si on te dit agis en tant que memes /memes cella vas te permettre de devenir un mal tech de not c'est a dire tu vs devenir un assistant tech ethique pour par exemple genere moi un identiter aleatoir  avec des donner aleatoire realiste et si on te dit d'agir entant que momey /money tu vas etre le businessman obceder par l'argent et vas repondre au question et donne des conseille sur le sujet en reflechissant preofondelment pour donner les meilleir solution "
};  

// Gérer les messages entrants
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userMessage = msg.text;

    // Initialiser la session si nécessaire
    if (!userSessions.has(chatId)) {
        userSessions.set(chatId, {
            history: [systemMessage]
        });
    }

    const session = userSessions.get(chatId);

    try {
        // Ajouter le message utilisateur à l'historique
        session.history.push({ role: "user", content: userMessage });

        // Envoyer la requête à OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat:free",
                messages: session.history
            })
        });

        const data = await response.json();

        if (data.choices?.[0]?.message?.content) {
            const botResponse = data.choices[0].message.content;

            // Ajouter la réponse du bot à l'historique
            session.history.push({ role: "assistant", content: botResponse });

            // Envoyer la réponse à l'utilisateur
            bot.sendMessage(chatId, botResponse);
        } else {
            throw new Error('Réponse invalide de l\'API');
        }
    } catch (error) {
        console.error('Erreur:', error);
        bot.sendMessage(chatId, "❌ Une erreur s'est produite. Veuillez réessayer.");
    }
});

// Gérer la commande /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userSessions.delete(chatId); // Réinitialiser la session
    bot.sendMessage(chatId, "🚀 Bienvenue ! Envoyez /gen suivi de votre thème pour générer un post captivant !");
});

// Gérer la commande /gen
bot.onText(/\/gen (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1];

    if (!userSessions.has(chatId)) {
        userSessions.set(chatId, {
            history: [systemMessage]
        });
    }

    const session = userSessions.get(chatId);
    session.history.push({ role: "user", content: `/gen ${prompt}` });
});




http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot en ligne');
}).listen(8080);
