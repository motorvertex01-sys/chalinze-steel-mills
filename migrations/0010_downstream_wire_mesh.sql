UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.downstream',
      json((
        SELECT json_group_array(json(products.value))
        FROM (
          SELECT CASE
              WHEN json_extract(item.value, '$.id') = 'reinforcement-bars'
                THEN json_set(
                  item.value,
                  '$.name', 'Rebar / reinforcement bars',
                  '$.description', 'Reinforcing steel bars (rebar) are downstream products made by rolling steel billet feedstock into specified bar sections. They are distinct from the primary steel billets planned as Chalinze''s upstream output.',
                  '$.applications', 'Illustrative applications include reinforced concrete in buildings, roads, bridges and other infrastructure.'
                )
              ELSE item.value
            END AS value
          FROM json_each(published_json, '$.downstream') AS item
          UNION ALL
          SELECT json_object(
            'id', 'wire-mesh',
            'name', 'Welded wire mesh',
            'description', 'Welded steel wire mesh is a downstream reinforcement product made by forming steel wire into a grid and joining intersections. Wire feedstock and fabrication take place after primary billet production.',
            'applications', 'Illustrative applications include reinforcement in concrete slabs, pavements, walls and precast elements.',
            'industries', 'Construction · precast concrete · infrastructure',
            'model', 'mesh'
          )
          WHERE NOT EXISTS (
            SELECT 1 FROM json_each(published_json, '$.downstream')
            WHERE json_extract(value, '$.id') = 'wire-mesh'
          )
        ) AS products
      ))
    ),
    draft_json = json_set(
      draft_json,
      '$.downstream',
      json((
        SELECT json_group_array(json(products.value))
        FROM (
          SELECT CASE
              WHEN json_extract(item.value, '$.id') = 'reinforcement-bars'
                THEN json_set(
                  item.value,
                  '$.name', 'Rebar / reinforcement bars',
                  '$.description', 'Reinforcing steel bars (rebar) are downstream products made by rolling steel billet feedstock into specified bar sections. They are distinct from the primary steel billets planned as Chalinze''s upstream output.',
                  '$.applications', 'Illustrative applications include reinforced concrete in buildings, roads, bridges and other infrastructure.'
                )
              ELSE item.value
            END AS value
          FROM json_each(draft_json, '$.downstream') AS item
          UNION ALL
          SELECT json_object(
            'id', 'wire-mesh',
            'name', 'Welded wire mesh',
            'description', 'Welded steel wire mesh is a downstream reinforcement product made by forming steel wire into a grid and joining intersections. Wire feedstock and fabrication take place after primary billet production.',
            'applications', 'Illustrative applications include reinforcement in concrete slabs, pavements, walls and precast elements.',
            'industries', 'Construction · precast concrete · infrastructure',
            'model', 'mesh'
          )
          WHERE NOT EXISTS (
            SELECT 1 FROM json_each(draft_json, '$.downstream')
            WHERE json_extract(value, '$.id') = 'wire-mesh'
          )
        ) AS products
      ))
    )
WHERE content_key = 'manufacturing'
  AND json_type(published_json, '$.downstream') = 'array'
  AND json_type(draft_json, '$.downstream') = 'array';
