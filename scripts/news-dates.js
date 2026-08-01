'use strict';

const NEWS_LIMIT = 3;

const MONTH_MAP = {
  jan: 0,
  januar: 0,
  feb: 1,
  februar: 1,
  märz: 2,
  marz: 2,
  mrz: 2,
  april: 3,
  apr: 3,
  mai: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  aug: 7,
  august: 7,
  sept: 8,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dez: 11,
  dezember: 11,
};

function normalizeMonth(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .trim();
}

function monthIndex(value) {
  const key = normalizeMonth(value);
  if (Object.prototype.hasOwnProperty.call(MONTH_MAP, key)) return MONTH_MAP[key];
  return MONTH_MAP[key.slice(0, 3)];
}

function parseAgendaMonthEnd(monthLabel) {
  const label = String(monthLabel);
  const years = label.match(/\d{4}/g);
  const year = years ? parseInt(years[years.length - 1], 10) : new Date().getFullYear();
  const monthTokens = label.match(/[A-Za-zäöüÄÖÜ.]{3,}/g) || [];
  const monthIndexes = monthTokens
    .map((token) => monthIndex(token))
    .filter((value) => value !== undefined);

  if (!monthIndexes.length) return null;

  const endMonth = monthIndexes[monthIndexes.length - 1];
  return new Date(year, endMonth + 1, 0);
}

function shouldKeepAgendaMonth(monthLabel, now = new Date()) {
  const end = parseAgendaMonthEnd(monthLabel);
  if (!end) return true;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
  return end >= cutoff;
}

function pruneNewsData(data) {
  const items = (data.items || []).slice(0, NEWS_LIMIT);
  return { ...data, items };
}

function pruneAgendaData(data, now = new Date()) {
  const months = (data.months || []).filter(({ month }) => shouldKeepAgendaMonth(month, now));
  return { ...data, months };
}

module.exports = {
  NEWS_LIMIT,
  shouldKeepAgendaMonth,
  pruneNewsData,
  pruneAgendaData,
};
