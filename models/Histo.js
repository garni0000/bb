// File: models/Histo.js

import mongoose from 'mongoose';

const HistoSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  user: { type: Number, required: true },     // chatId Telegram
  contenu: { type: String, required: true }    // contenu du message
});

export default mongoose.model('Histo', HistoSchema, 'histo');
