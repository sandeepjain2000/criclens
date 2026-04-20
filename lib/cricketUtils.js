/**
 * Shared cricket data utilities used by both the rankings API and the players API.
 */

// ── Known wicket-keepers ──────────────────────────────────────────────────────
export const KNOWN_WK = new Set([
  // Sri Lanka
  'KC Sangakkara',
  // Australia
  'AC Gilchrist', 'IA Healy', 'RW Marsh', 'ATW Grout', 'WAS Oldfield', 'GRJ Matthews',
  // India
  'MS Dhoni', 'RR Pant', 'WP Saha', 'DK Karthik', 'NR Mongia', 'SMH Kirmani', 'KS More', 'MSK Prasad',
  // England
  'APE Knott', 'RC Russell', 'AJ Stewart', 'CMW Read', 'MJ Prior', 'JM Bairstow',
  'JS Foster', 'TG Evans', 'JM Parks', 'GO Jones',
  // South Africa
  'MV Boucher', 'Q de Kock', 'JHB Waite', 'DT Lindsay', 'PW Sherwell',
  // New Zealand
  'BJ Watling', 'AC Parore', 'IDS Smith', 'BB McCullum', 'TE Blain', 'KJ Wadsworth',
  // West Indies
  'PJL Dujon', 'RD Jacobs', 'CO Browne', 'FCM Alexander', 'DL Murray', 'DW Allan',
  // Pakistan
  'Moin Khan', 'Rashid Latif', 'Kamran Akmal', 'Sarfaraz Ahmed', 'Wasim Bari', 'Zulqarnain Haider',
  // Zimbabwe
  'A Flower', 'T Taibu',
  // Bangladesh
  'Mushfiqur Rahim', 'Khaled Mashud', 'Litton Das',
  // Afghanistan
  'Mohammad Shahzad', 'Ikram Alikhil',
  // Ireland
  "NJ O'Brien", 'L Tucker',
]);

// ── Wicket kinds that don't credit the bowler ─────────────────────────────────
export const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

/**
 * Classify a player's role.
 *
 * @param {string}  name        Player name
 * @param {Map}     batMap      Map<name, { career_runs, bat_innings }>
 * @param {Map}     bowlMap     Map<name, { career_wickets, bowl_innings }>
 * @returns {'WK'|'AR'|'P-BOW'|'BWL'|'BAT'}
 *
 * Rules:
 *   WK     – in the known wicket-keepers list
 *   AR     – career wickets ≥ 50 AND career runs ≥ 1500  (significant in both)
 *   P-BOW  – primarily a batter (bat innings > bowl innings) but wickets ≥ 50
 *   BWL    – bowl innings ≥ bat innings OR wickets ≥ 30  (primarily a bowler)
 *   BAT    – everyone else
 */
export function classifyRole(name, batMap, bowlMap) {
  if (KNOWN_WK.has(name)) return 'WK';

  const bat  = batMap.get(name)  ?? { career_runs: 0, bat_innings: 0 };
  const bowl = bowlMap.get(name) ?? { career_wickets: 0, bowl_innings: 0 };

  const runs       = bat.career_runs    ?? 0;
  const wickets    = bowl.career_wickets ?? 0;
  const batInnings = bat.bat_innings    ?? 0;
  const bowlInnings= bowl.bowl_innings  ?? 0;

  // True all-rounder: noteworthy in both disciplines
  if (wickets >= 50 && runs >= 1500) return 'AR';

  // Primarily bowler: bowls at least as often as they bat, or 30+ wickets
  if (bowlInnings >= batInnings || wickets >= 30) return 'BWL';

  // Primarily batter who also took significant wickets
  if (wickets >= 50) return 'P-BOW';

  return 'BAT';
}

/**
 * Which role categories does this player belong to for filter purposes?
 * Players can appear in MULTIPLE filter buckets (e.g. AR shows under both Batter + Bowler).
 */
export function roleMatchesFilter(role, filterKey) {
  if (!filterKey || filterKey === 'all') return true;
  if (filterKey === 'batter') return ['BAT', 'WK', 'P-BOW', 'AR'].includes(role);
  if (filterKey === 'bowler') return ['BWL', 'AR', 'P-BOW'].includes(role);
  if (filterKey === 'wk')     return role === 'WK';
  return true;
}
