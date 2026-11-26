UPDATE site_content
SET published_json = json_set(
  published_json,
  '$.home.heroDescription', 'Chalinze Steel Mills Ltd is developing a proposed integrated ROM iron ore-to-steel project at Vigwaza Area, Chalinze District, Pwani Region, Tanzania. Planned facilities extend from mining and ore preparation through steel billet casting; commercial production has not commenced.',
  '$.home.introPrimary', 'Chalinze Steel Mills Ltd is developing a proposed integrated ROM iron ore-to-steel manufacturing project at Vigwaza Area, Chalinze District, Pwani Region, Tanzania. The project begins with iron ore mining and preparation, and is planned to integrate beneficiation, ironmaking, steelmaking and continuous casting to produce steel billets. Commercial billet production and downstream manufacturing have not commenced. Planned steel billets are intended to provide feedstock for potential future downstream manufacturing and value addition across various industrial sectors.'
)
WHERE content_key = 'site-config'
  AND json_extract(published_json, '$.home.heroDescription') = 'Chalinze Steel Mills Ltd is developing a proposed integrated project at Vigwaza, Tanzania, founded on iron ore mining and preparation. Later ironmaking, steelmaking and billet production are planned stages, not operating facilities.'
  AND json_extract(published_json, '$.home.introPrimary') = 'Chalinze Steel Mills Ltd is a Tanzanian registered company developing an integrated upstream operation that prepares run-of-mine iron ore into quality-controlled iron-bearing feedstock. Downstream ironmaking, steelmaking and billet production are planned stages of the wider project, not current operations.';

UPDATE site_content
SET draft_json = json_set(
  draft_json,
  '$.home.heroDescription', 'Chalinze Steel Mills Ltd is developing a proposed integrated ROM iron ore-to-steel project at Vigwaza Area, Chalinze District, Pwani Region, Tanzania. Planned facilities extend from mining and ore preparation through steel billet casting; commercial production has not commenced.',
  '$.home.introPrimary', 'Chalinze Steel Mills Ltd is developing a proposed integrated ROM iron ore-to-steel manufacturing project at Vigwaza Area, Chalinze District, Pwani Region, Tanzania. The project begins with iron ore mining and preparation, and is planned to integrate beneficiation, ironmaking, steelmaking and continuous casting to produce steel billets. Commercial billet production and downstream manufacturing have not commenced. Planned steel billets are intended to provide feedstock for potential future downstream manufacturing and value addition across various industrial sectors.'
)
WHERE content_key = 'site-config'
  AND json_extract(draft_json, '$.home.heroDescription') = 'Chalinze Steel Mills Ltd is developing a proposed integrated project at Vigwaza, Tanzania, founded on iron ore mining and preparation. Later ironmaking, steelmaking and billet production are planned stages, not operating facilities.'
  AND json_extract(draft_json, '$.home.introPrimary') = 'Chalinze Steel Mills Ltd is a Tanzanian registered company developing an integrated upstream operation that prepares run-of-mine iron ore into quality-controlled iron-bearing feedstock. Downstream ironmaking, steelmaking and billet production are planned stages of the wider project, not current operations.';
