/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import fs from 'fs-promise';
import path from 'path';
import moment from 'moment';
import macros from '../macros';

class SitemapGenerator {
  async go(termDump, mergedEmployees) {
    // Items to link to.
    // The part after the https://searchneu.com/
    const items = [];

    // Figure out what semester it currently happening and make the site map from that one.
    // If we are in between semesters, use the next one to occur.
    // If all the semesters occurred in the past, pick the one closest to the current date.

    const today = moment().diff(0, 'day');
    macros.log('It has been ', today, 'days since epoch.');

    let currentTerm;

    for (const term of termDump.terms) {
      if (term.startDate < today && term.endDate > today) {
        currentTerm = term.termId;
        break;
      }
    }

    // Find the next term to occur.
    if (!currentTerm) {
      let minDaysSinceNextTerm;
      for (const term of termDump.terms) {
        if (term.startDate < today) {
          continue;
        }

        const daysUntilThisTermStarts = term.startDate - today;
        if (!minDaysSinceNextTerm || daysUntilThisTermStarts < minDaysSinceNextTerm) {
          minDaysSinceNextTerm = daysUntilThisTermStarts;
          currentTerm = term.termId;
        }
      }
    }

    // If all the terms have already ended, find the one that most recently ended.
    if (!currentTerm) {
      let maxEndDate;

      for (const term of termDump.terms) {
        if (!maxEndDate || term.endDate > maxEndDate) {
          maxEndDate = term.endDate;
          currentTerm = term.termId;
        }
      }
    }

    macros.log('The current term is:', currentTerm);

    // Lets not spam the console if there are non-neu classes here.
    let foundNonNEUClass = false;

    // Add the subjects
    for (const subject of termDump.subjects) {
      if (subject.termId !== currentTerm) {
        continue;
      }

      if (subject.host !== 'neu.edu') {
        if (!foundNonNEUClass) {
          macros.warn('Not adding non-NEU class to the index! Update this when we get another domain and redo the routing for the new domain.');
        }
        foundNonNEUClass = true;
        continue;
      }

      items.push(subject.subject);
      items.push(subject.text);
    }

    // Add the classes
    for (const aClass of termDump.classes) {
      if (aClass.termId !== currentTerm) {
        continue;
      }

      if (aClass.host !== 'neu.edu') {
        continue;
      }

      items.push(`${aClass.subject} ${aClass.classId}`);
      items.push(aClass.name);
    }

    // Add the employees
    for (const employee of mergedEmployees) {
      items.push(employee.name);
    }

    // Convert the items to urls and put them inside xml
    const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
    for (const item of items) {
      xml.push('  <url>');
      xml.push(`    <loc>https://searchneu.com/${encodeURIComponent(item)}</loc>`);
      xml.push('  </url>');
    }
    xml.push('</urlset>');

    const output = xml.join('\n');

    await fs.writeFile(path.join('public', 'sitemap.xml'), output);
  }
}


export default new SitemapGenerator();
