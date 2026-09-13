// Six present-tense forms: yo, tú, él/ella/usted, nosotros, vosotros, ellos/ustedes.
const conjugationVerbs = [
  { verb: 'Despertarse', meaning: 'to wake up', forms: ['despierto', 'despiertas', 'despierta', 'despertamos', 'despertáis', 'despiertan'], english: 'wake up', third: 'wakes up' },
  { verb: 'Levantarse', meaning: 'to get up', forms: ['levanto', 'levantas', 'levanta', 'levantamos', 'levantáis', 'levantan'], english: 'get up', third: 'gets up' },
  { verb: 'Ducharse', meaning: 'to take a shower', forms: ['ducho', 'duchas', 'ducha', 'duchamos', 'ducháis', 'duchan'], english: 'take a shower', third: 'takes a shower' },
  { verb: 'Bañarse', meaning: 'to take a bath', forms: ['baño', 'bañas', 'baña', 'bañamos', 'bañáis', 'bañan'], english: 'take a bath', third: 'takes a bath' },
  { verb: 'Lavarse', meaning: 'to wash oneself', forms: ['lavo', 'lavas', 'lava', 'lavamos', 'laváis', 'lavan'], english: 'wash {self}', third: 'washes {self}' },
  { verb: 'Cepillarse', meaning: 'to brush oneself (teeth or hair)', forms: ['cepillo', 'cepillas', 'cepilla', 'cepillamos', 'cepilláis', 'cepillan'], object: ' los dientes', english: 'brush {poss} teeth', third: 'brushes {poss} teeth' },
  { verb: 'Vestirse', meaning: 'to get dressed', forms: ['visto', 'vistes', 'viste', 'vestimos', 'vestís', 'visten'], english: 'get dressed', third: 'gets dressed' },
  { verb: 'Peinarse', meaning: 'to comb one’s hair', forms: ['peino', 'peinas', 'peina', 'peinamos', 'peináis', 'peinan'], english: 'comb {poss} hair', third: 'combs {poss} hair' },
  { verb: 'Acostarse', meaning: 'to go to bed', forms: ['acuesto', 'acuestas', 'acuesta', 'acostamos', 'acostáis', 'acuestan'], english: 'go to bed', third: 'goes to bed' },
  { verb: 'Dormirse', meaning: 'to fall asleep', forms: ['duermo', 'duermes', 'duerme', 'dormimos', 'dormís', 'duermen'], english: 'fall asleep', third: 'falls asleep' },
];
const conjugationPeople = [
  { spanish: 'Yo', pronoun: 'me', form: 0, english: 'I', self: 'myself', poss: 'my' },
  { spanish: 'Tú', pronoun: 'te', form: 1, english: 'You', self: 'yourself', poss: 'your' },
  { spanish: 'Él', pronoun: 'se', form: 2, english: 'He', self: 'himself', poss: 'his', third: true },
  { spanish: 'Ella', pronoun: 'se', form: 2, english: 'She', self: 'herself', poss: 'her', third: true },
  { spanish: 'Usted', pronoun: 'se', form: 2, english: 'You', self: 'yourself', poss: 'your' },
  { spanish: 'Nosotros', pronoun: 'nos', form: 3, english: 'We', self: 'ourselves', poss: 'our' },
  { spanish: 'Nosotras', pronoun: 'nos', form: 3, english: 'We', self: 'ourselves', poss: 'our' },
  { spanish: 'Ellos', pronoun: 'se', form: 5, english: 'They', self: 'themselves', poss: 'their' },
  { spanish: 'Ellas', pronoun: 'se', form: 5, english: 'They', self: 'themselves', poss: 'their' },
  { spanish: 'Ustedes', pronoun: 'se', form: 5, english: 'You all', self: 'yourselves', poss: 'your' },
];

function conjugationSentence(verb, person) {
  const englishVerb = (person.third ? verb.third : verb.english)
    .replace('{self}', person.self).replace('{poss}', person.poss);
  return {
    spanish: `${person.spanish} ${person.pronoun} ${verb.forms[person.form]}${verb.object || ''}.`,
    english: `${person.english} ${englishVerb}.`,
  };
}

const conjugationContainer = document.getElementById('conjugation-examples');
for (const verb of conjugationVerbs) {
  const article = document.createElement('article');
  article.className = 'conjugation-verb';
  const heading = document.createElement('h3');
  const spanishHeading = document.createElement('span');
  spanishHeading.lang = 'es';
  spanishHeading.textContent = verb.verb;
  heading.append(spanishHeading, ` — ${verb.meaning}`);
  article.append(heading);
  const list = document.createElement('dl');
  for (const person of conjugationPeople) {
    const sentence = conjugationSentence(verb, person);
    const pair = document.createElement('div');
    pair.className = 'conjugation-pair';
    const spanish = document.createElement('dt');
    spanish.lang = 'es';
    const reflexiveSentence = sentence.spanish.slice(person.spanish.length + 1);
    spanish.textContent = reflexiveSentence.charAt(0).toLocaleUpperCase('es') + reflexiveSentence.slice(1);
    const english = document.createElement('dd');
    english.textContent = sentence.english;
    pair.append(spanish, english);
    list.append(pair);
  }
  article.append(list);
  conjugationContainer.append(article);
}
