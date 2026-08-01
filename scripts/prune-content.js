'use strict';

const fs = require('fs');
const path = require('path');
const { pruneNewsData, pruneAgendaData } = require('./news-dates');

const root = path.join(__dirname, '..');
const newsPath = path.join(root, 'data', 'news.json');
const agendaPath = path.join(root, 'data', 'agenda.json');
const now = new Date();

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
const agenda = JSON.parse(fs.readFileSync(agendaPath, 'utf8'));
const prunedNews = pruneNewsData(news, now);
const prunedAgenda = pruneAgendaData(agenda, now);

const newsChanged = JSON.stringify(news) !== JSON.stringify(prunedNews);
const agendaChanged = JSON.stringify(agenda) !== JSON.stringify(prunedAgenda);

if (newsChanged) {
  writeJson(newsPath, prunedNews);
  console.log(`News bereinigt: ${news.items.length} -> ${prunedNews.items.length} Einträge (max. 3)`);
}

if (agendaChanged) {
  writeJson(agendaPath, prunedAgenda);
  console.log(`Agenda bereinigt: ${agenda.months.length} -> ${prunedAgenda.months.length} Monate`);
}

if (!newsChanged && !agendaChanged) {
  console.log('Keine veralteten News- oder Agenda-Einträge gefunden.');
}
