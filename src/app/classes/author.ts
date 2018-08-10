export class Author {

  id: string;
  score: string;
  name: string;
  coauthors: string[];
  npapers: number;
  npapersMatched: number;
  latestAffstr: string;
  latestKeywords: string[];
  latestPapers: {title: string, date: string}[];

  // TODO: Narrow down _source fields

  constructor(elasticAuthor: object) {

    this.id = elasticAuthor['_id'];
    this.score = elasticAuthor['score'] || 0;

    const s = elasticAuthor['_source'];
    this.name = s['name'];
    this.coauthors = s['coauthors'].map(coa => coa['_id']);
    this.npapers = s['paper_stats']['npapers'];

    if (elasticAuthor['inner_hits'] && elasticAuthor['inner_hits']['papers']) {
      this.npapersMatched =
        elasticAuthor['inner_hits']['papers']['hits']['total'];
    } else {
      this.npapersMatched = null;
    }

    try {
      this.latestAffstr = s['latest_affiliation']['affiliation']['affstr'];
    } catch(err) {
      this.latestAffstr = '';
    }

    let latestPapers = s['papers'].sort((p1, p2) => {
        if (p1['date'] < p2['date']) return -1;
        if (p1['date'] > p2['date']) return 1;
        return 0;
    }).reverse().slice(0, 10)

    this.latestPapers = latestPapers.map(p => {
      return {
        title: p.title,
        date: p.date,
      }
    });

    // TODO: Do properly
    // @ts-ignore
    this.latestKeywords = Array.from(new Set(
      latestPapers
        .map((p) => p['keywords'])
        .reduce((x, y) => x.concat(y), [])
        .filter((kw) => kw)
    )).slice(0, 20);
  }
}
